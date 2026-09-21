// Ports the `.sg`/`.st` stat-tile pattern (e.g. public/legacy-app.js:1699:
// `<div class="sg sg3"><div class="st">...`). `stats` is [{value, label, tone}], where
// `tone` is an optional legacy modifier class like "red" or "mo".
export function StatGrid({ stats }) {
  return (
    <div className={"sg sg" + stats.length}>
      {stats.map((s, i) => (
        <div className={"st" + (s.tone ? " " + s.tone : "")} key={i}>
          <div className="v">{s.value}</div>
          <div className="l">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
