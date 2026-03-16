import { useState, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine, LineChart, Line,
  ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, Treemap
} from "recharts";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg:      "#f4f5f7",
  surface: "#ffffff",
  border:  "#e4e6ed",
  border2: "#d0d4df",
  accent:  "#4f46e5",
  accent2: "#818cf8",
  green:   "#059669",
  red:     "#dc2626",
  yellow:  "#d97706",
  text:    "#111827",
  muted:   "#6b7280",
  dim:     "#e5e7eb",
};

const PIE_COLORS = ["#4f46e5","#059669","#d97706","#dc2626","#0284c7","#ea580c","#7c3aed","#0d9488","#db2777","#0369a1","#65a30d","#9333ea","#16a34a","#c2410c","#b45309","#0891b2"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const clr    = (n) => n > 0 ? T.green : n < 0 ? T.red : T.muted;
const sign   = (n) => n > 0 ? "+" : "";
const inr    = (n) => isNaN(n) ? "—" : `₹${Number(n).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const pct    = (n) => isNaN(n) ? "—" : `${sign(n)}${Number(n).toFixed(2)}%`;
const num    = (n) => isNaN(n) ? "—" : Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ─── MANDATORY COLUMN ALIASES ─────────────────────────────────────────────────
const MANDATORY = {
  name:     { label:"Stock Name",        aliases:["stock name","stock","name","symbol","ticker"] },
  price:    { label:"Current Price",     aliases:["current price","price","ltp","latest price","cmp","market price"] },
  qty:      { label:"Quantity",          aliases:["quantity","qty","shares","units","holding"] },
  invPrice: { label:"Investment Price",  aliases:["investment price","inv. price","inv price","buy price","avg price","average price","cost price","purchase price"] },
};

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
function parseCSVText(text) {
  const trimmed = text.trim();
  let lines = [];
  if (trimmed.startsWith('"') && !trimmed.startsWith('"' + trimmed.split(',')[0].slice(1) + '"')) {
    let inner = trimmed.slice(1).replace(/["\r\n]+$/, "");
    lines = inner.split(/\r?\n/);
  } else {
    lines = trimmed.split(/\r?\n/);
  }
  return lines
    .filter(l => l.trim() !== "")
    .map(line => {
      let l = line.startsWith('"') ? line.slice(1) : line;
      l = l.replace(/,["]+$/, "").replace(/["]+$/, "").replace(/""/g, '"');
      return l.split(",").map(c => c.replace(/^"|"$/g, "").trim());
    });
}

function matchColumns(headers) {
  const lower = headers.map(h => String(h).toLowerCase().trim());
  const mapping = {};
  for (const [key, { aliases }] of Object.entries(MANDATORY)) {
    const idx = lower.findIndex(h => aliases.includes(h));
    if (idx !== -1) mapping[key] = idx;
  }
  const usedIdx = new Set(Object.values(mapping));
  const extra = headers.map((h,i) => ({label:h,idx:i})).filter(({idx,label}) => !usedIdx.has(idx) && String(label).trim() !== "");
  return { mapping, extra };
}

function rowsToResult(rows) {
  const headers = rows[0].map(String);
  const { mapping, extra } = matchColumns(headers);
  const missing = Object.keys(MANDATORY).filter(k => !(k in mapping));
  return { headers, mapping, extra, missing, rows };
}

function buildStocks(rows, mapping, extra) {
  return rows.slice(1)
    .filter(r => r.some(c => String(c).trim() !== ""))
    .map(r => {
      const name     = String(r[mapping.name] ?? "").trim();
      const price    = parseFloat(String(r[mapping.price]).replace(/[^0-9.-]/g,""));
      const qty      = parseFloat(String(r[mapping.qty]).replace(/[^0-9.-]/g,""));
      const invPrice = parseFloat(String(r[mapping.invPrice]).replace(/[^0-9.-]/g,""));
      const invAmt   = qty * invPrice;
      const curVal   = qty * price;
      const gain     = curVal - invAmt;
      const gainPct  = invAmt ? (gain / invAmt) * 100 : 0;
      const extraData = {};
      for (const {label, idx} of extra) extraData[label] = r[idx] ?? "";
      return { name, price, qty, invPrice, invAmt, curVal, gain, gainPct, ...extraData };
    })
    .filter(s => s.name && !isNaN(s.price) && !isNaN(s.qty) && !isNaN(s.invPrice));
}

// ─── REUSABLE UI ──────────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant="primary", style={}, disabled=false }) => {
  const base = {
    padding:"10px 24px", borderRadius:8, cursor:disabled?"not-allowed":"pointer",
    fontSize:13, fontWeight:600, border:"none", transition:"all 0.2s",
    opacity: disabled ? 0.4 : 1, letterSpacing:0.5,
    fontFamily:"'Syne', sans-serif",
  };
  const variants = {
    primary:  { background: T.accent, color:"#fff", boxShadow:`0 0 20px ${T.accent}44` },
    ghost:    { background:"transparent", color:T.muted, border:`1px solid ${T.border2}` },
    danger:   { background:"rgba(248,113,113,0.1)", color:T.red, border:`1px solid rgba(248,113,113,0.3)` },
  };
  return <button onClick={disabled ? undefined : onClick} style={{...base,...variants[variant],...style}}>{children}</button>;
};

const Input = ({ label, type="text", value, onChange, error, placeholder, autoFocus }) => (
  <div style={{ marginBottom:20 }}>
    {label && <div style={{ fontSize:11, letterSpacing:2, color:T.muted, textTransform:"uppercase", marginBottom:8, fontFamily:"'Syne',sans-serif" }}>{label}</div>}
    <input
      type={type} value={value} onChange={e=>onChange(e.target.value)}
      placeholder={placeholder} autoFocus={autoFocus}
      style={{
        width:"100%", padding:"12px 16px", background:T.surface,
        border:`1px solid ${error ? T.red : T.border2}`,
        borderRadius:8, color:T.text, fontSize:14, outline:"none",
        fontFamily:"'Syne',sans-serif", boxSizing:"border-box",
        transition:"border 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
      }}
      onFocus={e => e.target.style.borderColor = error ? T.red : T.accent}
      onBlur={e  => e.target.style.borderColor = error ? T.red : T.border2}
    />
    {error && <div style={{ color:T.red, fontSize:11, marginTop:6 }}>{error}</div>}
  </div>
);

const Card = ({ children, style={} }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:20, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize:9, letterSpacing:4, color:T.muted, textTransform:"uppercase", marginBottom:16, fontFamily:"'Syne',sans-serif" }}>{children}</div>
);

const Tag = ({ children, color=T.accent }) => (
  <span style={{ background:`${color}15`, border:`1px solid ${color}40`, color, fontSize:10, padding:"3px 10px", borderRadius:20, letterSpacing:1, fontFamily:"'Syne',sans-serif" }}>{children}</span>
);

// ─── TOOLTIP ──────────────────────────────────────────────────────────────────
const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border2}`, borderRadius:8, padding:"8px 14px", fontSize:11, fontFamily:"'Syne',sans-serif", boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>
      <div style={{ color:T.muted, marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color||T.text }}>{p.name}: {Math.abs(Number(p.value)) > 100 ? inr(p.value) : `${p.value}%`}</div>)}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [dots, setDots]       = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d+1)%4), 500);
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

  const mono = { fontFamily:"'JetBrains Mono',monospace" };
  const STACK = ["Java 21","Spring Boot 3","React","Node.js","Microservices","Docker","Kubernetes","AWS","PostgreSQL","REST APIs","CI/CD","Git"];

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", fontFamily:"'Syne',sans-serif", position:"relative", overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ position:"fixed", inset:0, backgroundImage:`linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`, backgroundSize:"40px 40px", opacity:0.6 }} />
      <div style={{ position:"fixed", top:"30%", left:"30%", width:500, height:400, background:`radial-gradient(ellipse, ${T.accent}0d 0%, transparent 70%)`, pointerEvents:"none" }} />

      {/* LEFT — developer identity */}
      <div style={{ flex:"0 0 44%", display:"flex", flexDirection:"column", justifyContent:"center", padding:"56px 52px", position:"relative", zIndex:1, borderRight:`1px solid ${T.border}` }}>
        <div style={{ marginBottom:32 }}>
          <div style={{ ...mono, fontSize:9, letterSpacing:4, color:T.accent, textTransform:"uppercase", marginBottom:16 }}>// built by</div>
          <div style={{ fontSize:26, fontWeight:800, color:T.text, lineHeight:1.2, marginBottom:6 }}>Ashwani Tiwari</div>
          <div style={{ fontSize:12, color:T.accent, fontWeight:700, letterSpacing:0.8, marginBottom:14 }}>Senior Full Stack Developer · 15 yrs exp</div>
          <div style={{ fontSize:12, color:T.muted, lineHeight:1.9, maxWidth:300 }}>
            Based in Amsterdam · Currently at CGI.<br/>
            Java · Spring Boot · React · Cloud · Microservices.<br/>
            Building enterprise systems since 2009.
          </div>
        </div>

        {/* mini terminal */}
        <div style={{ background:"#1a1b26", border:`1px solid #2d2f40`, borderRadius:10, padding:"14px 18px", marginBottom:24, ...mono }}>
          <div style={{ display:"flex", gap:5, marginBottom:10 }}>
            {["#ff5f57","#febc2e","#28c840"].map(c=><div key={c} style={{ width:9, height:9, borderRadius:"50%", background:c }} />)}
          </div>
          <div style={{ fontSize:11, lineHeight:2 }}>
            <div><span style={{ color:"#6272a4" }}>$ </span><span style={{ color:"#f8f8f2" }}>whoami</span></div>
            <div style={{ color:"#50fa7b" }}>ashwani.tiwari · CGI Amsterdam</div>
            <div style={{ marginTop:4 }}><span style={{ color:"#6272a4" }}>$ </span><span style={{ color:"#f8f8f2" }}>experience --years</span></div>
            <div style={{ color:"#bd93f9" }}>15 yrs · enterprise full-stack</div>
            <div style={{ marginTop:4 }}><span style={{ color:"#6272a4" }}>$ </span><span style={{ color:"#f8f8f2" }}>git log --oneline -1</span></div>
            <div style={{ color:"#f1fa8c" }}>a4f2c1e build: FINSTACK portfolio tracker{".".repeat(dots)}</div>
          </div>
        </div>

        {/* tech stack pills */}
        <div style={{ ...mono, fontSize:9, letterSpacing:3, color:T.muted, textTransform:"uppercase", marginBottom:10 }}>// stack</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:32 }}>
          {STACK.map(s=>(
            <span key={s} style={{ fontSize:10, fontWeight:600, padding:"3px 8px", border:`1px solid ${T.border2}`, borderRadius:4, color:T.muted, background:T.surface }}>{s}</span>
          ))}
        </div>

        <a href="https://about-ashwani.vercel.app/" target="_blank" rel="noopener noreferrer"
          style={{ ...mono, fontSize:11, color:T.accent, textDecoration:"none", fontWeight:500, letterSpacing:0.3 }}>
          about-ashwani.vercel.app ↗
        </a>
      </div>

      {/* RIGHT — login form */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:48, position:"relative", zIndex:1 }}>
        <div style={{ width:"100%", maxWidth:360 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:36 }}>
            <div style={{ width:32, height:32, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>📈</div>
            <div style={{ fontSize:17, fontWeight:800, color:T.text, letterSpacing:1 }}>FINSTACK</div>
          </div>

          <div style={{ fontSize:20, fontWeight:700, color:T.text, marginBottom:4 }}>Sign in</div>
          <div style={{ fontSize:12, color:T.muted, marginBottom:28 }}>Access your portfolio intelligence dashboard</div>

          <Card style={{ padding:28 }}>
            <Input label="Email" type="email" value={email} onChange={v=>{setEmail(v);setErrors(p=>({...p,email:""}))}} error={errors.email} placeholder="you@example.com" autoFocus />
            <Input label="Password" type="password" value={password} onChange={v=>{setPassword(v);setErrors(p=>({...p,password:""}))}} error={errors.password} placeholder="min. 4 characters" />

            <Btn onClick={submit} disabled={loading} style={{ width:"100%", padding:"12px", fontSize:13, marginTop:8 }}>
              {loading ? `Authenticating${".".repeat(dots)}` : "Access Dashboard →"}
            </Btn>

            <div style={{ marginTop:18, padding:"12px 14px", background:`${T.accent}06`, border:`1px solid ${T.accent}15`, borderRadius:8, ...mono, fontSize:10, color:T.muted, lineHeight:1.9 }}>
              <span style={{ color:T.green }}>✓</span> No backend · no account needed<br/>
              <span style={{ color:T.green }}>✓</span> Data stays in your browser only<br/>
              <span style={{ color:T.green }}>✓</span> Any password works (min 4 chars)
            </div>
          </Card>

          <div style={{ textAlign:"center", marginTop:18, ...mono, fontSize:10, color:T.muted, letterSpacing:0.5 }}>
            FINSTACK v2.0 · React · SheetJS · Recharts
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — UPLOAD
// ═══════════════════════════════════════════════════════════════════════════════
function UploadScreen({ userEmail, onParsed, onLogout }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const inputRef = useRef();

  const handle = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) { setError("Only .xlsx, .xls, or .csv files are supported."); return; }
    setLoading(true); setError("");

    const process = (rows) => {
      if (rows.length < 2) { setLoading(false); setError("File appears empty."); return; }
      const result = rowsToResult(rows);
      setLoading(false);
      onParsed(result, file.name);
    };

    if (ext === "csv") {
      const r = new FileReader();
      r.onload = e => { try { process(parseCSVText(e.target.result)); } catch(err) { setLoading(false); setError("CSV parse error: "+err.message); } };
      r.readAsText(file);
    } else {
      const r = new FileReader();
      r.onload = e => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), {type:"array"});
          process(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, defval:""}));
        } catch(err) { setLoading(false); setError("File parse error: "+err.message); }
      };
      r.readAsArrayBuffer(file);
    }
  };

  const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }, []);

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Syne',sans-serif", position:"relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={{ position:"fixed", inset:0, backgroundImage:`linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`, backgroundSize:"40px 40px", opacity:0.6 }} />

      {/* nav */}
      <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 32px", borderBottom:`1px solid ${T.border}`, background:`${T.bg}cc`, backdropFilter:"blur(12px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📈</div>
          <span style={{ fontSize:15, fontWeight:800, color:T.text, letterSpacing:1 }}>FINSTACK</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:11, color:T.muted, fontFamily:"'JetBrains Mono',monospace" }}>{userEmail}</div>
          <Btn onClick={onLogout} variant="ghost" style={{ padding:"6px 14px", fontSize:11 }}>Sign out</Btn>
        </div>
      </div>

      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 64px)", padding:32 }}>

        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:4, color:T.accent, textTransform:"uppercase", marginBottom:12 }}>// step_01 · data_ingestion</div>
          <div style={{ fontSize:24, fontWeight:800, color:T.text }}>Import Portfolio Holdings</div>
          <div style={{ fontSize:12, color:T.muted, marginTop:8 }}>Supports Zerodha, Groww, and any broker export — CSV or Excel</div>
        </div>

        <div
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}
          onClick={()=>inputRef.current.click()}
          style={{
            width:460, padding:"48px 40px", borderRadius:14, cursor:"pointer", textAlign:"center",
            border:`2px dashed ${dragging ? T.accent : T.border2}`,
            background: dragging ? `${T.accent}07` : T.surface,
            transition:"all 0.2s",
            boxShadow: dragging ? `0 0 32px ${T.accent}14` : "0 1px 4px rgba(0,0,0,0.06)",
          }}>
          <div style={{ fontSize:32, marginBottom:12 }}>{loading ? "⚙️" : "📂"}</div>
          <div style={{ color:T.text, fontSize:14, fontWeight:700, marginBottom:4 }}>
            {loading ? "Parsing file…" : "Drop your holdings file here"}
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", color:T.muted, fontSize:11, marginBottom:18 }}>
            {loading ? "running column detection…" : "or click to browse · zero uploads · client-side only"}
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            {["XLSX","XLS","CSV"].map(f=><Tag key={f}>{f}</Tag>)}
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>handle(e.target.files[0])} />
        </div>

        {error && (
          <div style={{ marginTop:16, background:"rgba(220,38,38,0.05)", border:`1px solid rgba(220,38,38,0.2)`, borderRadius:8, padding:"10px 20px", color:T.red, fontSize:11, maxWidth:460, textAlign:"center", fontFamily:"'JetBrains Mono',monospace" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop:28, width:460, background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"18px 22px", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:3, color:T.muted, textTransform:"uppercase", marginBottom:12 }}>// required_columns</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:14 }}>
            {Object.values(MANDATORY).map(m=><Tag key={m.label} color={T.accent}>{m.label}</Tag>)}
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:T.muted, lineHeight:2 }}>
            <span style={{ color:T.green }}>✓</span> Missing columns? Manual mapper runs automatically<br/>
            <span style={{ color:T.green }}>✓</span> Extra columns pass through to dashboard as-is<br/>
            <span style={{ color:T.green }}>✓</span> Zerodha wrapped-CSV format supported
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — COLUMN MAPPER (shown only if missing cols)
// ═══════════════════════════════════════════════════════════════════════════════
function ColumnMapper({ parsed, fileName, onMapped, onBack }) {
  const { headers, mapping: initialMapping, extra: initialExtra, missing, rows } = parsed;
  const [userMap, setUserMap] = useState({});

  const currentMapping = { ...initialMapping, ...userMap };
  const stillMissing   = missing.filter(k => !(k in currentMapping));
  const allMapped      = stillMissing.length === 0;

  const usedIdxs = new Set(Object.values(currentMapping));
  const availableCols = headers
    .map((h,i) => ({label: h || `(Column ${i+1})`, idx:i}))
    .filter(({idx}) => !usedIdxs.has(idx) || Object.values(userMap).includes(idx));

  const confirm = () => {
    const finalMapping = currentMapping;
    const usedIdx = new Set(Object.values(finalMapping));
    const extra = headers.map((h,i) => ({label:h,idx:i})).filter(({idx,label}) => !usedIdx.has(idx) && String(label).trim() !== "");
    const stocks = buildStocks(rows, finalMapping, extra);
    if (stocks.length === 0) return;
    onMapped({ stocks, extra: extra.map(e => e.label) });
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"'Syne',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 32px", borderBottom:`1px solid ${T.border}`, background:`${T.bg}cc` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📈</div>
          <span style={{ fontSize:16, fontWeight:800, color:T.text, letterSpacing:1 }}>FINSTACK</span>
        </div>
        <Btn onClick={onBack} variant="ghost" style={{ padding:"6px 14px", fontSize:11 }}>← Back</Btn>
      </div>

      <div style={{ maxWidth:600, margin:"0 auto", padding:"48px 24px" }}>
        <div style={{ marginBottom:40 }}>
          <div style={{ fontSize:10, letterSpacing:4, color:T.red, textTransform:"uppercase", marginBottom:12 }}>⚠ Missing Columns Detected</div>
          <div style={{ fontSize:24, fontWeight:800, color:T.text, marginBottom:8 }}>Map your columns</div>
          <div style={{ fontSize:13, color:T.muted }}>
            <span style={{ color:T.accent }}>{fileName}</span> is missing {missing.length} required column{missing.length>1?"s":""}. Tell us which columns match.
          </div>
        </div>

        {/* Already auto-mapped */}
        {Object.entries(initialMapping).length > 0 && (
          <Card style={{ marginBottom:20 }}>
            <SectionTitle>Auto-detected ✓</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {Object.entries(initialMapping).map(([key,idx]) => (
                <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ color:T.muted, fontSize:13 }}>{MANDATORY[key].label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <Tag color={T.green}>{headers[idx] || `Col ${idx+1}`}</Tag>
                    <span style={{ color:T.green, fontSize:11 }}>✓</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Need manual mapping */}
        <Card>
          <SectionTitle>Needs your input</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {missing.map(key => (
              <div key={key}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div>
                    <div style={{ color:T.text, fontSize:14, fontWeight:600 }}>{MANDATORY[key].label}</div>
                    <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>e.g. {MANDATORY[key].aliases.slice(0,3).join(", ")}</div>
                  </div>
                  {key in userMap && <Tag color={T.green}>Mapped ✓</Tag>}
                </div>
                <select
                  value={userMap[key] ?? ""}
                  onChange={e => setUserMap(p => ({...p, [key]: parseInt(e.target.value)}))}
                  style={{
                    width:"100%", padding:"10px 14px", background:T.surface,
                    border:`1px solid ${key in userMap ? T.green : T.border2}`,
                    borderRadius:8, color: key in userMap ? T.text : T.muted,
                    fontSize:13, outline:"none", fontFamily:"'Syne',sans-serif", cursor:"pointer",
                  }}>
                  <option value="">— Select a column from your file —</option>
                  {headers.map((h,i) => (
                    <option key={i} value={i}>{h || `(Column ${i+1})`} — e.g. {rows[1]?.[i] ?? ""}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ marginTop:24, display:"flex", gap:12 }}>
          <Btn onClick={onBack} variant="ghost" style={{ flex:1 }}>← Re-upload</Btn>
          <Btn onClick={confirm} disabled={!allMapped} style={{ flex:2 }}>
            {allMapped ? "Build Dashboard →" : `Map ${stillMissing.length} more column${stillMissing.length>1?"s":""}`}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── TREEMAP NODE (must be a named component, not inline) ────────────────────
function TreeNode({ x, y, width, height, name, gain, fill }) {
  if (!width || !height) return null;
  return (
    <g>
      <rect x={x+1} y={y+1} width={Math.max(width-2,0)} height={Math.max(height-2,0)} fill={fill||"#333"} rx={4} />
      {width > 60 && height > 24 && (
        <text x={x+width/2} y={y+height/2-6} textAnchor="middle" fill="#fff" fontSize={Math.min(11,width/7)} fontFamily="'Syne',sans-serif" fontWeight={600}>{name}</text>
      )}
      {width > 60 && height > 36 && (
        <text x={x+width/2} y={y+height/2+10} textAnchor="middle" fill={(gain??0)>=0?"#6ee7b7":"#fca5a5"} fontSize={Math.min(9,width/9)} fontFamily="'Syne',sans-serif">
          {(gain??0)>=0?"+":""}{inr(Math.abs(gain??0))}
        </text>
      )}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREEN 4 — DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ stocks: rawStocks, extraCols: rawExtra, userEmail, fileName, onReset, onLogout }) {
  const stocks    = rawStocks ?? [];
  const extraCols = rawExtra  ?? [];

  const [tab, setTab]       = useState("overview");
  const [sort, setSort]     = useState({ key:"gain", dir:-1 });
  const [filter, setFilter] = useState("all");

  const totalInv  = stocks.reduce((s,r) => s + r.invAmt, 0);
  const totalVal  = stocks.reduce((s,r) => s + r.curVal, 0);
  const totalGain = totalVal - totalInv;
  const totalPct  = totalInv ? (totalGain/totalInv)*100 : 0;
  const winners   = stocks.filter(s => s.gain > 0).length;
  const losers    = stocks.filter(s => s.gain < 0).length;
  const best      = [...stocks].sort((a,b) => b.gainPct - a.gainPct)[0];
  const worst     = [...stocks].sort((a,b) => a.gainPct - b.gainPct)[0];

  // chart data — all derived safely
  const safeStocks  = stocks ?? [];
  const returnBar   = [...safeStocks].sort((a,b)=>b.gainPct-a.gainPct).map(s=>({name:s.name, pct:parseFloat((s.gainPct??0).toFixed(2))}));
  const pieData     = safeStocks.map(s=>({name:s.name, value:Math.abs(s.curVal??0)}));
  const cmpData     = safeStocks.slice(0,15).map(s=>({name:s.name, invested:parseFloat((s.invAmt??0).toFixed(0)), current:parseFloat((s.curVal??0).toFixed(0))}));
  const scatterData = safeStocks.map(s=>({name:s.name, x:s.invAmt??0, y:parseFloat((s.gainPct??0).toFixed(2)), z:Math.abs(s.curVal??0)}));
  const riskData    = [...safeStocks].sort((a,b)=>Math.abs(b.curVal??0)-Math.abs(a.curVal??0)).map(s=>({name:s.name, value:Math.abs(s.curVal??0), gain:s.gain??0}));
  const topHeavy    = safeStocks.map(s=>({ name:s.name, allocation: parseFloat(((s.curVal??0)/Math.max(totalVal,1)*100).toFixed(2)), gainPct: parseFloat((s.gainPct??0).toFixed(2)) })).sort((a,b)=>b.allocation-a.allocation);
  const plDist      = [...safeStocks].sort((a,b)=>(b.gain??0)-(a.gain??0)).map(s=>({name:s.name, gain:parseFloat((s.gain??0).toFixed(0))}));

  const filtered = stocks.filter(s => {
    if (filter==="profit") return s.gain > 0;
    if (filter==="loss")   return s.gain < 0;
    return true;
  });
  const sorted = [...filtered].sort((a,b) => {
    const av=a[sort.key]??"", bv=b[sort.key]??"";
    return typeof av==="string" ? String(av).localeCompare(String(bv))*sort.dir : (av-bv)*sort.dir;
  });
  const hs = (key) => setSort(s => ({key, dir: s.key===key ? -s.dir : -1}));

  const TABS = ["overview","holdings","analytics","risk","resources","about"];

  // ── smart insights from portfolio data ──────────────────────────────────────
  const insights = (() => {
    if (!stocks.length) return [];
    const out = [];
    const avgReturn = stocks.reduce((s,r)=>s+r.gainPct,0)/stocks.length;
    const topStock  = [...stocks].sort((a,b)=>b.gainPct-a.gainPct)[0];
    const botStock  = [...stocks].sort((a,b)=>a.gainPct-b.gainPct)[0];
    const bigWeight = topHeavy[0];
    const profitCount = stocks.filter(s=>s.gain>0).length;
    if (bigWeight?.allocation > 25) out.push({ icon:"⚠️", color:T.red,    text:`${bigWeight.name} makes up ${bigWeight.allocation}% of your portfolio — consider rebalancing to reduce concentration risk.` });
    if (avgReturn < 0)               out.push({ icon:"📉", color:T.red,    text:`Your average return is ${pct(avgReturn)}. More than half your holdings are underwater.` });
    if (avgReturn > 15)              out.push({ icon:"🚀", color:T.green,  text:`Strong portfolio! Average return of ${pct(avgReturn)} across all holdings.` });
    if (topStock)                    out.push({ icon:"🏆", color:T.green,  text:`Best performer: ${topStock.name} at ${pct(topStock.gainPct)} return on ₹${topStock.invAmt.toLocaleString("en-IN")} invested.` });
    if (botStock?.gainPct < -30)     out.push({ icon:"🔴", color:T.red,    text:`${botStock.name} is down ${pct(botStock.gainPct)}. Review if it still fits your thesis.` });
    if (profitCount === stocks.length) out.push({ icon:"✨", color:T.accent, text:`All ${stocks.length} holdings are in profit. Impressive portfolio management!` });
    if (stocks.length < 5)           out.push({ icon:"💡", color:T.yellow, text:`You hold only ${stocks.length} stocks. Diversifying across more sectors can reduce risk.` });
    if (stocks.length > 20)          out.push({ icon:"📊", color:T.muted,  text:`With ${stocks.length} holdings, tracking individual positions gets harder. Consider consolidating your best ideas.` });
    return out.slice(0, 4);
  })();

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Syne',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── TICKER BAR ── */}
      <div style={{ background:T.accent, padding:"6px 28px", display:"flex", gap:32, alignItems:"center", overflowX:"auto" }}>
        {[
          { label:"NIFTY 50",   value:"22,502.00", chg:"+0.43%" },
          { label:"SENSEX",     value:"74,119.02", chg:"+0.38%" },
          { label:"NIFTY BANK", value:"48,201.35", chg:"-0.12%" },
          { label:"GOLD",       value:"₹72,450",   chg:"+0.21%" },
          { label:"USD/INR",    value:"83.42",      chg:"-0.05%" },
          { label:"CRUDE OIL",  value:"$82.10",     chg:"+0.67%" },
        ].map(m => (
          <div key={m.label} style={{ display:"flex", gap:8, alignItems:"center", whiteSpace:"nowrap", fontSize:11 }}>
            <span style={{ color:"rgba(255,255,255,0.65)", letterSpacing:1 }}>{m.label}</span>
            <span style={{ color:"#fff", fontWeight:700 }}>{m.value}</span>
            <span style={{ color: m.chg.startsWith("+") ? "#a7f3d0" : "#fca5a5", fontSize:10 }}>{m.chg}</span>
          </div>
        ))}
        <div style={{ marginLeft:"auto", fontSize:9, color:"rgba(255,255,255,0.4)", whiteSpace:"nowrap" }}>INDICATIVE · NOT LIVE</div>
      </div>

      {/* NAV */}
      <div style={{ background:`${T.surface}ee`, borderBottom:`1px solid ${T.border}`, padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:20, backdropFilter:"blur(12px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 0" }}>
            <div style={{ width:28, height:28, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📈</div>
            <span style={{ fontSize:15, fontWeight:800, color:T.text, letterSpacing:1 }}>FINSTACK</span>
          </div>
          <div style={{ width:1, height:20, background:T.border }} />
          <div style={{ display:"flex", gap:4 }}>
            {TABS.map(t => (
              <button key={t} onClick={()=>setTab(t)} style={{
                padding:"18px 16px", background:"transparent", border:"none",
                borderBottom:`2px solid ${tab===t ? T.accent : "transparent"}`,
                color: tab===t ? T.accent : T.muted,
                fontSize:12, letterSpacing:1.5, textTransform:"uppercase",
                cursor:"pointer", fontWeight: tab===t ? 700 : 400,
                fontFamily:"'Syne',sans-serif", transition:"all 0.15s",
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:11, color:T.muted }}>{userEmail}</div>
          <Btn onClick={onReset} variant="ghost" style={{ padding:"5px 12px", fontSize:10 }}>New File</Btn>
          <Btn onClick={onLogout} variant="ghost" style={{ padding:"5px 12px", fontSize:10 }}>Sign Out</Btn>
        </div>
      </div>

      <div style={{ padding:"28px 28px", maxWidth:1300, margin:"0 auto" }}>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div>
            {/* KPI cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:24 }}>
              {[
                { l:"Total Invested",   v:inr(totalInv),  sub:`${stocks.length} holdings`, c:T.muted  },
                { l:"Current Value",    v:inr(totalVal),  sub:fileName, c:T.text   },
                { l:"Total P & L",      v:`${sign(totalGain)}${inr(Math.abs(totalGain))}`, sub:pct(totalPct), c:clr(totalGain) },
                { l:"Winners / Losers", v:`${winners} / ${losers}`, sub:`${Math.round(winners/stocks.length*100)}% in profit`, c:T.yellow },
                { l:"Best Performer",   v:best?.name ?? "—", sub:pct(best?.gainPct), c:T.green },
                { l:"Worst Performer",  v:worst?.name ?? "—", sub:pct(worst?.gainPct), c:T.red   },
              ].map(({l,v,sub,c}) => (
                <Card key={l} style={{ position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${c}, transparent)` }} />
                  <SectionTitle>{l}</SectionTitle>
                  <div style={{ fontSize:18, fontWeight:700, color:c, lineHeight:1.1 }}>{v}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:6 }}>{sub}</div>
                </Card>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:18, marginBottom:18 }}>
              <Card>
                <SectionTitle>Return % by Stock</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={returnBar} barSize={14}>
                    <XAxis dataKey="name" tick={{fill:T.muted,fontSize:8}} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={55} />
                    <YAxis tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                    <Tooltip content={<CTip />} />
                    <ReferenceLine y={0} stroke={T.border2} />
                    <Bar dataKey="pct" name="Return %" radius={[3,3,0,0]}>
                      {returnBar.map((s,i) => <Cell key={i} fill={s.pct>=0 ? T.green : T.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle>Portfolio Allocation</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v=>inr(v)} contentStyle={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:8,fontSize:11,fontFamily:"'Syne',sans-serif",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card>
              <SectionTitle>Invested vs Current Value</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cmpData} barSize={12} barGap={2}>
                  <XAxis dataKey="name" tick={{fill:T.muted,fontSize:8}} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>inr(v)} />
                  <Tooltip content={<CTip />} />
                  <Bar dataKey="invested" name="Invested" fill="#c7d2fe" radius={[3,3,0,0]} />
                  <Bar dataKey="current"  name="Current"  fill={T.accent} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Smart Insights */}
            {insights.length > 0 && (
              <div style={{ marginTop:18 }}>
                <Card>
                  <SectionTitle>🧠 Portfolio Insights</SectionTitle>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:12 }}>
                    {insights.map((ins,i) => (
                      <div key={i} style={{ background:`${ins.color}08`, border:`1px solid ${ins.color}25`, borderRadius:10, padding:"14px 16px", display:"flex", gap:12, alignItems:"flex-start" }}>
                        <div style={{ fontSize:20, lineHeight:1 }}>{ins.icon}</div>
                        <div style={{ fontSize:12, color:T.text, lineHeight:1.6 }}>{ins.text}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── HOLDINGS TAB ── */}
        {tab === "holdings" && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
              {[["all",`All (${stocks.length})`],["profit",`Profit (${winners})`],["loss",`Loss (${losers})`]].map(([v,l]) => (
                <button key={v} onClick={()=>setFilter(v)} style={{
                  background: filter===v ? `${T.accent}15` : "transparent",
                  border:`1px solid ${filter===v ? `${T.accent}50` : T.border2}`,
                  color: filter===v ? T.accent : T.muted,
                  padding:"6px 16px", borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:1, fontFamily:"'Syne',sans-serif",
                }}>{l}</button>
              ))}
              <span style={{ marginLeft:"auto", color:T.dim, fontSize:9, letterSpacing:1 }}>↕ CLICK HEADERS TO SORT</span>
            </div>

            <Card style={{ padding:0, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                      {[
                        {k:"name",label:"Stock",a:"left"},
                        {k:"price",label:"Price",a:"right"},
                        {k:"qty",label:"Qty",a:"right"},
                        {k:"invPrice",label:"Avg Cost",a:"right"},
                        {k:"invAmt",label:"Invested",a:"right"},
                        {k:"curVal",label:"Cur Value",a:"right"},
                        {k:"gain",label:"P & L",a:"right"},
                        {k:"gainPct",label:"Return %",a:"right"},
                        ...extraCols.map(c=>({k:c,label:c,a:"right",extra:true})),
                      ].map(c => (
                        <th key={c.k} onClick={()=>hs(c.k)} style={{
                          padding:"12px 14px", textAlign:c.a, fontSize:8, letterSpacing:2,
                          color: sort.key===c.k ? T.accent : c.extra ? T.dim : T.muted,
                          textTransform:"uppercase", cursor:"pointer", whiteSpace:"nowrap", userSelect:"none",
                          borderBottom: sort.key===c.k ? `2px solid ${T.accent}` : "2px solid transparent",
                          fontFamily:"'Syne',sans-serif",
                        }}>{c.label}{sort.key===c.k?(sort.dir===1?" ↑":" ↓"):""}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((s,i) => (
                      <tr key={s.name+i}
                        style={{ borderBottom:`1px solid ${T.border}`, background:i%2===0?"transparent":"rgba(255,255,255,0.01)" }}
                        onMouseEnter={e=>e.currentTarget.style.background=`${T.accent}08`}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,0.01)"}>
                        <td style={{ padding:"10px 14px", color:T.text, fontWeight:600, whiteSpace:"nowrap" }}>{s.name}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", color:"#aaa" }}>{inr(s.price)}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", color:T.muted }}>{s.qty}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", color:T.muted }}>{inr(s.invPrice)}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", color:T.muted }}>{inr(s.invAmt)}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", color:T.text, fontWeight:500 }}>{inr(s.curVal)}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", color:clr(s.gain), fontWeight:600 }}>{sign(s.gain)}{inr(Math.abs(s.gain))}</td>
                        <td style={{ padding:"10px 14px", textAlign:"right", color:clr(s.gainPct), fontWeight:700 }}>{pct(s.gainPct)}</td>
                        {extraCols.map(col => <td key={col} style={{ padding:"10px 14px", textAlign:"right", color:T.dim, fontSize:11 }}>{s[col]??""}</td>)}
                      </tr>
                    ))}
                    <tr style={{ borderTop:`1px solid ${T.border2}`, background:`${T.accent}08` }}>
                      <td style={{ padding:"12px 14px", color:T.accent, fontWeight:700, fontSize:10, letterSpacing:2 }}>TOTAL</td>
                      <td /><td /><td />
                      <td style={{ padding:"12px 14px", textAlign:"right", color:T.muted, fontWeight:600 }}>{inr(totalInv)}</td>
                      <td style={{ padding:"12px 14px", textAlign:"right", color:T.text, fontWeight:700 }}>{inr(totalVal)}</td>
                      <td style={{ padding:"12px 14px", textAlign:"right", color:clr(totalGain), fontWeight:700 }}>{sign(totalGain)}{inr(Math.abs(totalGain))}</td>
                      <td style={{ padding:"12px 14px", textAlign:"right", color:clr(totalPct), fontWeight:700 }}>{pct(totalPct)}</td>
                      {extraCols.map(c=><td key={c}/>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === "analytics" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
              {/* Allocation % table */}
              <Card>
                <SectionTitle>Portfolio Weight & Return</SectionTitle>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                      {["Stock","Weight","P&L","Return"].map(h=>(
                        <th key={h} style={{ padding:"8px 10px", textAlign: h==="Stock"?"left":"right", fontSize:8, letterSpacing:2, color:T.muted, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topHeavy.map((s,i) => (
                      <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                        <td style={{ padding:"8px 10px", color:T.text, fontWeight:500 }}>{s.name}</td>
                        <td style={{ padding:"8px 10px", textAlign:"right" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                            <div style={{ width:40, height:4, borderRadius:2, background:T.border2, overflow:"hidden" }}>
                              <div style={{ width:`${s.allocation}%`, height:"100%", background:T.accent, borderRadius:2 }} />
                            </div>
                            <span style={{ color:T.muted, fontSize:11, minWidth:36, textAlign:"right" }}>{s.allocation}%</span>
                          </div>
                        </td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color:clr(stocks.find(x=>x.name===s.name)?.gain), fontSize:11 }}>
                          {sign(stocks.find(x=>x.name===s.name)?.gain)}{inr(Math.abs(stocks.find(x=>x.name===s.name)?.gain))}
                        </td>
                        <td style={{ padding:"8px 10px", textAlign:"right", color:clr(s.gainPct), fontWeight:600 }}>{pct(s.gainPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Investment vs Return scatter */}
              <Card>
                <SectionTitle>Investment Size vs Return % (Bubble)</SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{top:10,right:10,bottom:10,left:10}}>
                    <XAxis dataKey="x" name="Invested" tickFormatter={v=>inr(v)} tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false} />
                    <YAxis dataKey="y" name="Return %" tickFormatter={v=>`${v}%`} tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false} />
                    <ZAxis dataKey="z" range={[40,400]} />
                    <ReferenceLine y={0} stroke={T.border2} />
                    <Tooltip cursor={{strokeDasharray:"3 3"}} content={({active,payload})=>{
                      if(!active||!payload?.length) return null;
                      const d = payload[0]?.payload;
                      return <div style={{background:T.surface,border:`1px solid ${T.border2}`,borderRadius:8,padding:"8px 14px",fontSize:11,fontFamily:"'Syne',sans-serif",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>
                        <div style={{color:T.accent,fontWeight:600}}>{d?.name}</div>
                        <div style={{color:T.muted}}>Invested: {inr(d?.x)}</div>
                        <div style={{color:clr(d?.y)}}>Return: {pct(d?.y)}</div>
                      </div>;
                    }} />
                    <Scatter data={scatterData} fill={T.accent} opacity={0.8}>
                      {scatterData.map((s,i) => <Cell key={i} fill={s.y>=0 ? T.green : T.red} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Treemap */}
            <Card>
              <SectionTitle>Portfolio Treemap — size = current value, color = P&amp;L</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <Treemap
                  data={riskData.map((s,i)=>({...s, fill: s.gain>=0 ? `hsl(${150-i*3},60%,${35+i*2}%)` : `hsl(${0+i*3},60%,${35+i*2}%)`}))}
                  dataKey="value"
                  aspectRatio={4/3}
                  content={TreeNode}
                />
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ── RISK TAB ── */}
        {tab === "risk" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
              {[
                { l:"Concentration Risk", v: topHeavy[0] ? `${topHeavy[0].allocation}%` : "—", sub:`Top: ${topHeavy[0]?.name}`, c: topHeavy[0]?.allocation > 20 ? T.red : T.green },
                { l:"Profit Holdings",    v:`${winners} / ${stocks.length}`, sub:`${Math.round(winners/stocks.length*100)}% of portfolio`, c:T.green },
                { l:"Avg Return",         v:pct(stocks.reduce((s,r)=>s+r.gainPct,0)/stocks.length), sub:"Mean across all stocks", c:clr(stocks.reduce((s,r)=>s+r.gainPct,0)/stocks.length) },
                { l:"Largest Loss",       v:inr(Math.abs(worst?.gain??0)), sub:worst?.name, c:T.red },
              ].map(({l,v,sub,c}) => (
                <Card key={l} style={{ position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${c},transparent)` }} />
                  <SectionTitle>{l}</SectionTitle>
                  <div style={{ fontSize:20, fontWeight:700, color:c }}>{v}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:4 }}>{sub}</div>
                </Card>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              {/* Top 5 exposure */}
              <Card>
                <SectionTitle>Top Concentration (% of portfolio)</SectionTitle>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {topHeavy.slice(0,8).map((s,i) => (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:12, color:T.text }}>{s.name}</span>
                        <span style={{ fontSize:12, color: s.allocation>20?T.red:T.muted }}>{s.allocation}%</span>
                      </div>
                      <div style={{ height:5, background:T.border2, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ width:`${Math.min(s.allocation,100)}%`, height:"100%", background: s.allocation>20?T.red:T.accent, borderRadius:3, transition:"width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* P&L distribution */}
              <Card>
                <SectionTitle>P&L Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={plDist} barSize={12}>
                    <XAxis dataKey="name" tick={{fill:T.muted,fontSize:7}} axisLine={false} tickLine={false} interval={0} angle={-40} textAnchor="end" height={60} />
                    <YAxis tick={{fill:T.muted,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>inr(v)} />
                    <Tooltip content={<CTip />} />
                    <ReferenceLine y={0} stroke={T.border2} />
                    <Bar dataKey="gain" name="P&L" radius={[3,3,0,0]}>
                      {plDist.map((s,i) => <Cell key={i} fill={s.gain>=0 ? T.green : T.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {/* ── RESOURCES TAB ── */}
        {tab === "resources" && (() => {
          const RESOURCES = [
            {
              category: "📚 Learn & Research",
              color: T.accent,
              links: [
                { name:"Zerodha Varsity",        desc:"Free stock market courses from basics to advanced", url:"https://zerodha.com/varsity/",                         tag:"FREE COURSE" },
                { name:"Screener.in",            desc:"Screen, analyse and compare Indian stocks",         url:"https://www.screener.in/",                             tag:"SCREENER"    },
                { name:"TradingView",            desc:"Advanced charts and technical analysis tools",      url:"https://www.tradingview.com/",                         tag:"CHARTS"      },
                { name:"Moneycontrol",           desc:"News, portfolio tools and Indian market data",      url:"https://www.moneycontrol.com/",                        tag:"NEWS"        },
              ]
            },
            {
              category: "📰 News & Macro",
              color: T.yellow,
              links: [
                { name:"Economic Times Markets", desc:"Indian market news, earnings and macro coverage",   url:"https://economictimes.indiatimes.com/markets",         tag:"INDIA"       },
                { name:"Wall Street Journal",    desc:"Global financial news and in-depth analysis",       url:"https://www.wsj.com/",                                 tag:"GLOBAL"      },
                { name:"Goldman Sachs Insights", desc:"Research reports and macro economic outlooks",      url:"https://www.goldmansachs.com/insights/",               tag:"RESEARCH"    },
                { name:"Bloomberg Markets",      desc:"Real-time financial data and breaking news",        url:"https://www.bloomberg.com/markets",                    tag:"LIVE"        },
              ]
            },
            {
              category: "🛠 Tools & Calculators",
              color: T.green,
              links: [
                { name:"Groww Calculators",      desc:"SIP, lumpsum, FD and goal-based calculators",      url:"https://groww.in/calculators",                         tag:"CALC"        },
                { name:"Value Research",         desc:"Mutual fund ratings, NAV and portfolio analysis",   url:"https://www.valueresearchonline.com/",                 tag:"MF"          },
                { name:"NSE India",              desc:"Official NSE data, indices and announcements",      url:"https://www.nseindia.com/",                            tag:"OFFICIAL"    },
                { name:"BSE India",              desc:"Official BSE data, filings and corporate actions",  url:"https://www.bseindia.com/",                            tag:"OFFICIAL"    },
              ]
            },
          ];

          return (
            <div>
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:22, fontWeight:800, color:T.text, marginBottom:6 }}>Resources</div>
                <div style={{ fontSize:13, color:T.muted }}>Handpicked tools, courses and news to level up your investing game.</div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
                {RESOURCES.map(section => (
                  <div key={section.category}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ width:3, height:18, background:section.color, borderRadius:2 }} />
                      <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{section.category}</div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12 }}>
                      {section.links.map(link => (
                        <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"16px 18px", cursor:"pointer", transition:"all 0.18s", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor=section.color;e.currentTarget.style.boxShadow=`0 4px 16px ${section.color}25`;e.currentTarget.style.transform="translateY(-2px)";}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";e.currentTarget.style.transform="translateY(0)";}}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                              <div style={{ fontSize:14, fontWeight:700, color:T.text }}>{link.name}</div>
                              <span style={{ background:`${section.color}15`, color:section.color, fontSize:9, padding:"3px 8px", borderRadius:20, letterSpacing:1, whiteSpace:"nowrap", marginLeft:8 }}>{link.tag}</span>
                            </div>
                            <div style={{ fontSize:12, color:T.muted, lineHeight:1.6 }}>{link.desc}</div>
                            <div style={{ marginTop:10, fontSize:11, color:section.color, fontWeight:600 }}>Visit →</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ marginTop:48, padding:"24px 0", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:24, height:24, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>📈</div>
                  <span style={{ fontSize:13, fontWeight:800, color:T.text, letterSpacing:1 }}>FINSTACK</span>
                  <span style={{ fontSize:11, color:T.muted }}>— Your personal portfolio intelligence platform</span>
                </div>
                <div style={{ fontSize:11, color:T.muted }}>Built with ♥ · Your data never leaves this device · No tracking</div>
              </div>
            </div>
          );
        })()}

        {/* ── ABOUT TAB ── */}
        {tab === "about" && (() => {
          const mono = { fontFamily:"'JetBrains Mono',monospace" };
          const career = [
            { co:"CGI",       loc:"Amsterdam, NL", role:"Senior Full Stack Developer", period:"2019 – Present", active:true  },
            { co:"LTI",       loc:"India",         role:"Full Stack Developer",         period:"2015 – 2019",   active:false },
            { co:"Cognizant", loc:"India",         role:"Software Engineer",            period:"2013 – 2015",   active:false },
            { co:"Capgemini", loc:"India",         role:"Software Engineer",            period:"2011 – 2013",   active:false },
            { co:"Infosys",   loc:"India",         role:"Software Engineer",            period:"2009 – 2011",   active:false },
          ];
          return (
          <div style={{ maxWidth:740, margin:"0 auto", padding:"16px 0 56px" }}>

            {/* ── Hero ── */}
            <Card style={{ marginBottom:16, padding:"26px 28px", background:`linear-gradient(135deg,${T.accent}07,${T.accent2}04)`, border:`1px solid ${T.accent}1a` }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:24, flexWrap:"wrap" }}>
                <div style={{ width:66, height:66, borderRadius:14, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, flexShrink:0 }}>👨‍💻</div>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:20, fontWeight:800, color:T.text, marginBottom:2 }}>Ashwani Tiwari</div>
                  <div style={{ fontSize:11, fontWeight:700, color:T.accent, letterSpacing:1.2, textTransform:"uppercase", marginBottom:10 }}>Senior Full Stack Developer · 15 Years</div>
                  <div style={{ fontSize:12, color:T.muted, lineHeight:1.85, maxWidth:460 }}>
                    Based in Amsterdam. Currently building enterprise systems at CGI. Java · Spring Boot · React · Microservices · Cloud.
                    FINSTACK is a personal side project — zero backend, client-side only, built in React.
                  </div>
                  <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
                    {["CGI · Amsterdam","Java 21","Spring Boot 3","React","Microservices","Docker","AWS","PostgreSQL"].map(t=>(
                      <span key={t} style={{ fontSize:10, fontWeight:600, padding:"3px 8px", border:`1px solid ${T.border2}`, borderRadius:4, color:T.muted, background:T.surface }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Career Timeline ── */}
            <Card style={{ marginBottom:16 }}>
              <SectionTitle>// career_timeline</SectionTitle>
              <div style={{ display:"flex", flexDirection:"column" }}>
                {career.map((e,i)=>(
                  <div key={e.co} style={{ display:"flex", gap:14, paddingBottom: i<career.length-1 ? 18 : 0 }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, width:14 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background: e.active ? T.accent : T.border2, border:`2px solid ${e.active ? T.accent : T.border2}`, marginTop:3, flexShrink:0 }} />
                      {i < career.length-1 && <div style={{ width:1, flex:1, background:T.border, marginTop:3 }} />}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", flexWrap:"wrap", gap:6 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{e.co} <span style={{ fontSize:11, fontWeight:400, color:T.muted }}>· {e.loc}</span></div>
                        <span style={{ ...mono, fontSize:10, fontWeight:600, color: e.active ? T.accent : T.muted, background: e.active ? `${T.accent}0e` : T.bg, padding:"2px 9px", borderRadius:20 }}>{e.period}</span>
                      </div>
                      <div style={{ fontSize:11, color:T.muted, marginTop:1 }}>{e.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Links row ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
              {[
                { label:"Portfolio",  sub:"Projects & profile",    url:"https://about-ashwani.vercel.app/",            icon:"🌐", bg:T.accent  },
                { label:"LinkedIn",   sub:"Connect professionally", url:"https://www.linkedin.com/in/ashwanitiwari/",  icon:"in", bg:"#0077b5" },
                { label:"GitHub",     sub:"Code & open source",    url:"https://github.com/tiwari-ashwani",            icon:"🐙", bg:"#24292e" },
              ].map(l=>(
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                  <Card style={{ padding:"16px 18px", cursor:"pointer", transition:"all 0.18s" }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 6px 20px rgba(0,0,0,0.09)`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";}}>
                    <div style={{ width:34, height:34, borderRadius:8, background:l.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"#fff", fontWeight:800, marginBottom:10 }}>{l.icon}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:2 }}>{l.label} ↗</div>
                    <div style={{ fontSize:11, color:T.muted }}>{l.sub}</div>
                  </Card>
                </a>
              ))}
            </div>

            {/* ── Available for ── */}
            <Card style={{ marginBottom:16 }}>
              <SectionTitle>// available_for</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:10 }}>
                {[
                  { icon:"☕", label:"Java / Spring Boot",  desc:"Enterprise APIs, JPA, microservices" },
                  { icon:"⚛️", label:"React / Node.js",     desc:"Full-stack web apps & dashboards"    },
                  { icon:"🐳", label:"DevOps / Cloud",      desc:"Docker, K8s, AWS, CI/CD"             },
                  { icon:"📊", label:"Finance Tools",       desc:"Data viz, portfolio analytics"       },
                ].map(s=>(
                  <div key={s.label} style={{ background:T.bg, borderRadius:9, padding:"14px 15px", border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:18, marginBottom:8 }}>{s.icon}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:3 }}>{s.label}</div>
                    <div style={{ fontSize:11, color:T.muted, lineHeight:1.6 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── FINSTACK tech manifest ── */}
            <Card style={{ marginBottom:16, padding:"18px 22px" }}>
              <SectionTitle>// finstack.config</SectionTitle>
              <div style={{ ...mono, fontSize:11, lineHeight:2.1 }}>
                {[
                  ["framework",    "React 18 + Vite"],
                  ["charts",       "Recharts"],
                  ["file_parser",  "SheetJS (xlsx)"],
                  ["deployment",   "Vercel (static)"],
                  ["data_storage", "none · client-side only"],
                  ["backend",      "none · zero server calls"],
                  ["tracking",     "none · your data stays local"],
                ].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", gap:8 }}>
                    <span style={{ color:T.accent2, minWidth:116 }}>{k}</span>
                    <span style={{ color:T.muted }}>:</span>
                    <span style={{ color:T.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── CTA ── */}
            <Card style={{ textAlign:"center", padding:"22px 28px", background:`linear-gradient(135deg,${T.accent}07,${T.accent2}04)`, border:`1px solid ${T.accent}18` }}>
              <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:4 }}>Open to interesting projects</div>
              <div style={{ fontSize:12, color:T.muted, marginBottom:18 }}>Senior roles · backend architecture · fintech · consulting</div>
              <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
                <a href="https://about-ashwani.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                  <Btn style={{ fontSize:12, padding:"9px 20px" }}>Visit Portfolio ↗</Btn>
                </a>
                <a href="https://www.linkedin.com/in/ashwanitiwari/" target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                  <Btn style={{ background:"#0077b5", fontSize:12, padding:"9px 20px", boxShadow:"none" }}>LinkedIn ↗</Btn>
                </a>
                <a href="https://github.com/tiwari-ashwani" target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                  <Btn style={{ background:"#24292e", fontSize:12, padding:"9px 20px", boxShadow:"none" }}>GitHub ↗</Btn>
                </a>
              </div>
            </Card>

          </div>
          );
        })()}

      </div>

      {/* ── GLOBAL FOOTER ── */}
      <div style={{ borderTop:`1px solid ${T.border}`, background:T.bg, padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:22, height:22, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>📈</div>
          <span style={{ fontSize:12, fontWeight:800, color:T.text, letterSpacing:0.8 }}>FINSTACK</span>
          <span style={{ fontSize:11, color:T.muted }}>· Portfolio Intelligence · &copy; {new Date().getFullYear()}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <span style={{ fontSize:11, color:T.muted }}>Built by</span>
          <a
            href="https://about-ashwani.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize:12, fontWeight:700, color:T.accent, textDecoration:"none", display:"flex", alignItems:"center", gap:5, padding:"4px 12px", border:`1px solid ${T.accent}30`, borderRadius:6, background:`${T.accent}08`, transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.background=T.accent;e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.background=`${T.accent}08`;e.currentTarget.style.color=T.accent;}}
          >
            Ashwani Tiwari ↗
          </a>
          <span style={{ fontSize:10, color:T.muted, letterSpacing:0.5 }}>Data stays on your device · No tracking</span>
        </div>
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen]   = useState("login");
  const [userEmail, setUser]  = useState("");
  const [parsed, setParsed]   = useState(null);
  const [fileName, setFile]   = useState("");
  const [dashboard, setDash]  = useState(null);

  const handleLogin  = (email) => { setUser(email); setScreen("upload"); };
  const handleLogout = () => { setUser(""); setParsed(null); setDash(null); setScreen("login"); };
  const handleReset  = () => { setParsed(null); setDash(null); setScreen("upload"); };

  const handleParsed = (result, fname) => {
    setFile(fname);
    if (result.missing.length > 0) {
      setParsed(result);
      setScreen("mapper");
    } else {
      const stocks = buildStocks(result.rows, result.mapping, result.extra);
      if (stocks.length === 0) return;
      setDash({ stocks, extra: result.extra.map(e=>e.label) });
      setScreen("dashboard");
    }
  };

  const handleMapped = ({ stocks, extra }) => {
    setDash({ stocks, extra });
    setScreen("dashboard");
  };

  if (screen === "login")     return <LoginScreen onLogin={handleLogin} />;
  if (screen === "upload")    return <UploadScreen userEmail={userEmail} onParsed={handleParsed} onLogout={handleLogout} />;
  if (screen === "mapper")    return <ColumnMapper parsed={parsed} fileName={fileName} onMapped={handleMapped} onBack={()=>setScreen("upload")} />;
  if (screen === "dashboard") return <Dashboard {...dashboard} userEmail={userEmail} fileName={fileName} onReset={handleReset} onLogout={handleLogout} />;
  return null;
}