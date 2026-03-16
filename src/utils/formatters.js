export const clr   = (n) => (n > 0 ? "#059669" : n < 0 ? "#dc2626" : "#6b7280");
export const sign  = (n) => (n > 0 ? "+" : "");
export const inr   = (n) => isNaN(n) ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const pct   = (n) => isNaN(n) ? "—" : `${sign(n)}${Number(n).toFixed(2)}%`;
export const num   = (n) => isNaN(n) ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
