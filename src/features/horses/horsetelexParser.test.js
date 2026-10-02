import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildHorsetelexUpdates, horsetelexSlug, parseHorsetelexSource } from "./horsetelexParser.js";

const page = readFileSync(new URL("./__fixtures__/horsetelex-emerald.html", import.meta.url), "utf-8");

describe("parseHorsetelexSource", () => {
  it("reads the horse and its pedigree from a full page source", () => {
    expect(parseHorsetelexSource(page)).toEqual({
      horseName: "EMERALD",
      breed: "KWPN",
      dob: "",
      birthYear: "1986",
      origin: "",
      horsetelexUrl: "https://www.horsetelex.com/horses/pedigree/16020/emerald",
      sire: "ZEOLIET",
      dam: "NATASJA",
      gsire: "RAMIRO Z",
      gdam: "SARGAB",
      mgsire: "SOLARIS XX",
      mgdam: "BERDONNA",
    });
  });

  it("accepts just the script element, or just its text (what a bookmarklet reads)", () => {
    const script = page.match(/<script[\s\S]*?<\/script>/)[0];
    const text = script.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    expect(parseHorsetelexSource(script).sire).toBe("ZEOLIET");
    expect(parseHorsetelexSource(text).dam).toBe("NATASJA");
  });

  it("returns null for anything that is not a Horsetelex page source, without throwing", () => {
    expect(parseHorsetelexSource("")).toBeNull();
    expect(parseHorsetelexSource(null)).toBeNull();
    expect(parseHorsetelexSource("EMERALD\nSire ZEOLIET\nDam NATASJA")).toBeNull();
    expect(parseHorsetelexSource("<html><body>Just a moment...</body></html>")).toBeNull();
    expect(parseHorsetelexSource('<script id="serverApp-state">{&q;broken')).toBeNull();
    expect(parseHorsetelexSource('<script id="serverApp-state">{&q;other&q;:1}</script>')).toBeNull();
  });

  it("leaves unknown ancestors empty and uses a full foal date when there is one", () => {
    const state = {
      "https://x/pedigree/pedigrees/family-tree": {
        value: { pedigree: { id: 7, name: "Luna", year: 2015, foaldate: "2015-04-09T00:00:00", mother: { name: "Dam" } } },
      },
    };
    const escaped = JSON.stringify(state).replace(/&/g, "&a;").replace(/"/g, "&q;");
    const parsed = parseHorsetelexSource(`<script id="serverApp-state" type="application/json">${escaped}</script>`);
    expect(parsed).toMatchObject({ horseName: "Luna", dob: "2015-04-09", sire: "", dam: "Dam", gsire: "", mgdam: "" });
  });
});

describe("buildHorsetelexUpdates", () => {
  const parsed = parseHorsetelexSource(page);

  it("fills an empty form completely", () => {
    expect(buildHorsetelexUpdates(parsed, {})).toEqual({
      sire: "ZEOLIET",
      dam: "NATASJA",
      gsire: "RAMIRO Z",
      gdam: "SARGAB",
      mgsire: "SOLARIS XX",
      mgdam: "BERDONNA",
      name: "EMERALD",
      breed: "KWPN",
      horsetelex: "https://www.horsetelex.com/horses/pedigree/16020/emerald",
    });
  });

  it("keeps name/breed/link the user already typed, but always takes the pedigree", () => {
    const updates = buildHorsetelexUpdates(parsed, { name: "Esme", breed: "PRE", horsetelex: "x", sire: "old" });
    expect(updates).not.toHaveProperty("name");
    expect(updates).not.toHaveProperty("breed");
    expect(updates).not.toHaveProperty("horsetelex");
    expect(updates.sire).toBe("ZEOLIET");
  });

  it("overwrites those too when asked", () => {
    expect(buildHorsetelexUpdates(parsed, { name: "Esme", breed: "PRE" }, { overwrite: true })).toMatchObject({
      name: "EMERALD",
      breed: "KWPN",
    });
  });

  it("does nothing for a failed parse", () => {
    expect(buildHorsetelexUpdates(null, {})).toEqual({});
  });
});

describe("horsetelexSlug", () => {
  it("builds the URL slug", () => {
    expect(horsetelexSlug("Zeoliet")).toBe("zeoliet");
    expect(horsetelexSlug("RAMIRO Z")).toBe("ramiro-z");
    expect(horsetelexSlug("Bé d'Or")).toBe("be-d-or");
  });
});
