// Ports the #loading-screen markup (index.html:147).
export function LoadingScreen() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 480,
        background: "var(--fo)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: ".75rem",
      }}
    >
      <div className="sp"></div>
      <div style={{ fontSize: ".82rem", color: "var(--gr)" }}>Cargando...</div>
    </div>
  );
}
