import "../styles/components.css";
import { T } from "../constants/theme";

export const Btn = ({ children, onClick, variant = "primary", style = {}, disabled = false }) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`btn btn--${variant}`}
    style={style}
  >
    {children}
  </button>
);

export const Input = ({ label, type = "text", value, onChange, error, placeholder, autoFocus }) => (
  <div className="input-wrapper">
    {label && <div className="input-label">{label}</div>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={`input-field${error ? " input-field--error" : ""}`}
    />
    {error && <div className="input-error">{error}</div>}
  </div>
);

export const Card = ({ children, style = {}, className = "", onMouseEnter, onMouseLeave }) => (
  <div
    className={`card ${className}`}
    style={style}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    {children}
  </div>
);

export const SectionTitle = ({ children }) => (
  <div className="section-title">{children}</div>
);

export const Tag = ({ children, color = T.accent }) => (
  <span
    className="tag"
    style={{
      background: `${color}15`,
      borderColor: `${color}40`,
      color,
    }}
  >
    {children}
  </span>
);

export const Logo = ({ size = 28 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg,${T.accent},${T.accent2})`,
        borderRadius: Math.round(size * 0.25),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
      }}
    >
      📈
    </div>
    <span style={{ fontSize: size * 0.57, fontWeight: 800, color: T.text, letterSpacing: 1 }}>
      FINSTACK
    </span>
  </div>
);

export const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.text }}>
          {p.name}: {Math.abs(Number(p.value)) > 100
            ? `₹${Number(p.value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
            : `${p.value}%`}
        </div>
      ))}
    </div>
  );
};
