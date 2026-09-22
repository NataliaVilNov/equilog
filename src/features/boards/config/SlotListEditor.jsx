// Controlled editor for a {id?, start, end}[] list — shared by WalkersConfig (per-walker
// slots) and PaddocksConfig (the shared paddock-slot list). Existing rows keep whatever id
// they already have; new rows are left without one until the caller assigns one on save.
// This is what structurally fixes the walker slot-id-regeneration bug documented in
// docs/components/boards.md — legacy's promptSlots re-parses a retyped "HH:MM-HH:MM, ..."
// string and mints a fresh id for every row on every edit, silently orphaning any
// boardAssignments referencing the old ids. Same controlled-array pattern as
// OwnerSplitEditor (src/features/horses/OwnerSplitEditor.jsx).
export function SlotListEditor({ slots, onChange }) {
  function updateSlot(i, field, value) {
    onChange(slots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }
  function addSlot() {
    onChange([...slots, { start: "", end: "" }]);
  }
  function removeSlot(i) {
    onChange(slots.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      {slots.map((s, i) => (
        <div key={s.id || "new-" + i} style={{ display: "flex", gap: ".4rem", alignItems: "center", marginBottom: ".4rem" }}>
          <input type="time" value={s.start || ""} onChange={(e) => updateSlot(i, "start", e.target.value)} />
          <span>–</span>
          <input type="time" value={s.end || ""} onChange={(e) => updateSlot(i, "end", e.target.value)} />
          <button type="button" onClick={() => removeSlot(i)}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btg btsm" onClick={addSlot}>
        + Horario
      </button>
    </div>
  );
}
