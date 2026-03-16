import { useState, useEffect } from "react";
import { Btn, Card, Input, Logo } from "../components/UI";
import { isValidEmail } from "../utils/formatters";
import { T } from "../constants/theme";
import "../styles/screens.css";

const STACK = [
  "Java 21","Spring Boot 3","React","Node.js","Microservices",
  "Docker","Kubernetes","AWS","PostgreSQL","REST APIs","CI/CD","Git",
];

export default function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [dots, setDots]         = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);

  const validate = () => {
    const e = {};
    if (!email) e.email = "Email is required";
    else if (!isValidEmail(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (password.length < 4) e.password = "Password must be at least 4 characters";
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(email); }, 1200);
  };

  return (
    <div className="login">
      <div className="grid-bg" />
      <div className="login__glow" />

      {/* ── LEFT: developer identity ── */}
      <div className="login__left">
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 4, color: T.accent, textTransform: "uppercase", marginBottom: 16 }}>
            // built by
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1.2, marginBottom: 6 }}>
            Ashwani Tiwari
          </div>
          <div style={{ fontSize: 12, color: T.accent, fontWeight: 700, letterSpacing: 0.8, marginBottom: 14 }}>
            Senior Full Stack Developer · 15 yrs exp
          </div>
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.9, maxWidth: 300 }}>
            Based in Amsterdam · Currently at CGI.<br />
            Java · Spring Boot · React · Cloud · Microservices.<br />
            Building enterprise systems since 2009.
          </div>
        </div>

        {/* mini terminal */}
        <div className="login__terminal">
          <div className="terminal__dots">
            {["#ff5f57","#febc2e","#28c840"].map((c) => (
              <div key={c} className="terminal__dot" style={{ background: c }} />
            ))}
          </div>
          <div className="terminal__line">
            <div><span style={{ color: "#6272a4" }}>$ </span><span style={{ color: "#f8f8f2" }}>whoami</span></div>
            <div style={{ color: "#50fa7b" }}>ashwani.tiwari · CGI Amsterdam</div>
            <div style={{ marginTop: 4 }}><span style={{ color: "#6272a4" }}>$ </span><span style={{ color: "#f8f8f2" }}>experience --years</span></div>
            <div style={{ color: "#bd93f9" }}>15 yrs · enterprise full-stack</div>
            <div style={{ marginTop: 4 }}><span style={{ color: "#6272a4" }}>$ </span><span style={{ color: "#f8f8f2" }}>git log --oneline -1</span></div>
            <div style={{ color: "#f1fa8c" }}>
              a4f2c1e build: FINSTACK portfolio tracker{".".repeat(dots)}
            </div>
          </div>
        </div>

        {/* tech stack pills */}
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 3, color: T.muted, textTransform: "uppercase", marginBottom: 10 }}>
          // stack
        </div>
        <div className="stack-pills">
          {STACK.map((s) => (
            <span key={s} className="stack-pill">{s}</span>
          ))}
        </div>

        <a
          href="https://about-ashwani.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.accent, textDecoration: "none", fontWeight: 500, letterSpacing: 0.3 }}
        >
          about-ashwani.vercel.app ↗
        </a>
      </div>

      {/* ── RIGHT: login form ── */}
      <div className="login__right">
        <div className="login__form">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36 }}>
            <Logo size={32} />
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 4 }}>Sign in</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 28 }}>
            Access your portfolio intelligence dashboard
          </div>

          <Card style={{ padding: 28 }}>
            <Input
              label="Email" type="email" value={email}
              onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: "" })); }}
              error={errors.email} placeholder="you@example.com" autoFocus
            />
            <Input
              label="Password" type="password" value={password}
              onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: "" })); }}
              error={errors.password} placeholder="min. 4 characters"
            />

            <Btn onClick={submit} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: 13, marginTop: 8 }}>
              {loading ? `Authenticating${".".repeat(dots)}` : "Access Dashboard →"}
            </Btn>

            <div className="login__hint">
              <span style={{ color: T.green }}>✓</span> No backend · no account needed<br />
              <span style={{ color: T.green }}>✓</span> Data stays in your browser only<br />
              <span style={{ color: T.green }}>✓</span> Any email/password combination works (min 4 chars)
            </div>
          </Card>

          <div style={{ textAlign: "center", marginTop: 18, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: T.muted, letterSpacing: 0.5 }}>
            FINSTACK v2.0 · React · SheetJS · Recharts
          </div>
        </div>
      </div>
    </div>
  );
}
