import { useState } from "react";
import { LoginForm } from "./LoginForm.jsx";
import { RegisterForm } from "./RegisterForm.jsx";

const activeTabStyle = {
  flex: 1,
  padding: ".52rem",
  border: "none",
  borderRadius: "999px",
  fontFamily: "inherit",
  fontSize: ".72rem",
  fontWeight: 700,
  letterSpacing: ".07em",
  textTransform: "uppercase",
  background: "#fff",
  color: "var(--vd)",
  boxShadow: "0 1px 4px rgba(0,0,0,.08)",
  cursor: "pointer",
};
const inactiveTabStyle = {
  ...activeTabStyle,
  background: "none",
  color: "var(--gr)",
  boxShadow: "none",
};

// Ports the #auth-screen markup and authTab() (index.html:16-42, public/legacy-app.js:17-22).
export function AuthScreen() {
  const [tab, setTab] = useState("login");

  return (
    <div style={{ maxWidth: "380px", margin: "0 auto", padding: "2.5rem 1.2rem 3rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: "2rem",
            fontWeight: 600,
            color: "var(--ti)",
          }}
        >
          EquiLog
        </div>
        <div
          style={{
            fontSize: ".72rem",
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: "var(--v)",
            fontWeight: 700,
            marginTop: ".2rem",
          }}
        >
          Gestión ecuestre
        </div>
      </div>
      <div
        style={{
          display: "flex",
          background: "var(--ar)",
          borderRadius: "999px",
          padding: ".2rem",
          marginBottom: "1.5rem",
        }}
      >
        <button style={tab === "login" ? activeTabStyle : inactiveTabStyle} onClick={() => setTab("login")}>
          Entrar
        </button>
        <button
          style={tab === "register" ? activeTabStyle : inactiveTabStyle}
          onClick={() => setTab("register")}
        >
          Registrarse
        </button>
      </div>
      {tab === "login" ? <LoginForm /> : <RegisterForm />}
      <p style={{ fontSize: ".72rem", color: "var(--gr)", textAlign: "center" }}>
        Tus datos se guardan en la nube y son accesibles desde cualquier dispositivo.
      </p>
    </div>
  );
}
