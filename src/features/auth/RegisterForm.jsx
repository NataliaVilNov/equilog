import { useState } from "react";
import { register } from "./authActions.js";
import { authErrorMessage } from "./authErrorMessage.js";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await register(name, email, password);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="f">
        <label>Nombre completo</label>
        <input
          autoComplete="name"
          type="text"
          placeholder="Laura García"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="f">
        <label>Email</label>
        <input
          autoComplete="email"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="f">
        <label>Contraseña</label>
        <input
          autoComplete="new-password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <div style={{ fontSize: ".78rem", color: "var(--ro)", marginBottom: ".75rem" }}>
          {error}
        </div>
      )}
      <button type="submit" className="btn bts btbl" style={{ marginBottom: ".65rem" }}>
        Crear cuenta →
      </button>
    </form>
  );
}
