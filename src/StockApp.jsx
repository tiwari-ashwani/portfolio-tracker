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
  bg:      "#05050a",
  surface: "#0c0c14",
  border:  "#16162a",
  border2: "#1e1e30",
  accent:  "#7c6af7",
  accent2: "#a78bfa",
  green:   "#34d399",
  red:     "#f87171",
  yellow:  "#fbbf24",
  text:    "#e0e0f0",
  muted:   "#4a4a6a",
  dim:     "#1e1e30",
};

const PIE_COLORS = ["#7c6af7","#34d399","#fbbf24","#f87171","#38bdf8","#fb923c","#a78bfa","#60d394","#f472b6","#22d3ee","#818cf8","#ec4899","#10b981","#6366f1","#e8c547","#c084fc"];

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
        transition:"border 0.2s",
      }}
      onFocus={e => e.target.style.borderColor = error ? T.red : T.accent}
      onBlur={e  => e.target.style.borderColor = error ? T.red : T.border2}
    />
    {error && <div style={{ color:T.red, fontSize:11, marginTop:6 }}>{error}</div>}
  </div>
);

const Card = ({ children, style={} }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:20, ...style }}>
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
    <div style={{ background:"#0a0a14", border:`1px solid ${T.border2}`, borderRadius:8, padding:"8px 14px", fontSize:11, fontFamily:"'Syne',sans-serif" }}>
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

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", position:"relative", overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* bg grid */}
      <div style={{ position:"fixed", inset:0, backgroundImage:`linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`, backgroundSize:"40px 40px", opacity:0.4 }} />
      {/* glow */}
      <div style={{ position:"fixed", top:"20%", left:"50%", transform:"translateX(-50%)", width:600, height:400, background:`radial-gradient(ellipse, ${T.accent}18 0%, transparent 70%)`, pointerEvents:"none" }} />

      <div style={{ position:"relative", width:420, zIndex:1 }}>
        {/* logo */}
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <div style={{ width:36, height:36, background:`linear-gradient(135deg, ${T.accent}, ${T.accent2})`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📈</div>
            <div style={{ fontSize:20, fontWeight:800, color:T.text, letterSpacing:1 }}>FINSTACK</div>
          </div>
          <div style={{ fontSize:12, color:T.muted, letterSpacing:2, textTransform:"uppercase" }}>Portfolio Intelligence</div>
        </div>

        <Card style={{ padding:36 }}>
          <div style={{ fontSize:22, fontWeight:700, color:T.text, marginBottom:6 }}>Welcome back</div>
          <div style={{ fontSize:13, color:T.muted, marginBottom:32 }}>Sign in to your dashboard</div>

          <Input label="Email" type="email" value={email} onChange={v=>{setEmail(v);setErrors(p=>({...p,email:""}))}} error={errors.email} placeholder="you@example.com" autoFocus />
          <Input label="Password" type="password" value={password} onChange={v=>{setPassword(v);setErrors(p=>({...p,password:""}))}} error={errors.password} placeholder="••••••••" />

          <Btn onClick={submit} disabled={loading} style={{ width:"100%", padding:"13px", fontSize:14, marginTop:8 }}>
            {loading ? `Authenticating${".".repeat(dots)}` : "Sign In →"}
          </Btn>

          <div style={{ textAlign:"center", marginTop:20, fontSize:11, color:T.dim }}>
            No account needed · Just sign in with any password
          </div>
        </Card>

        <div style={{ textAlign:"center", marginTop:24, fontSize:11, color:T.dim, letterSpacing:1 }}>
          FINSTACK v2.0 · Portfolio Analytics
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
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ position:"fixed", inset:0, backgroundImage:`linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`, backgroundSize:"40px 40px", opacity:0.3 }} />

      {/* nav */}
      <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 32px", borderBottom:`1px solid ${T.border}`, background:`${T.bg}cc`, backdropFilter:"blur(12px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:28, height:28, background:`linear-gradient(135deg,${T.accent},${T.accent2})`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>📈</div>
          <span style={{ fontSize:16, fontWeight:800, color:T.text, letterSpacing:1 }}>FINSTACK</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:12, color:T.muted }}>{userEmail}</div>
          <Btn onClick={onLogout} variant="ghost" style={{ padding:"6px 14px", fontSize:11 }}>Sign out</Btn>
        </div>
      </div>

      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 64px)", padding:32 }}>
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ fontSize:10, letterSpacing:4, color:T.accent, textTransform:"uppercase", marginBottom:12 }}>Step 1 of 1</div>
          <div style={{ fontSize:28, fontWeight:800, color:T.text }}>Upload your holdings</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:8 }}>Import your portfolio from Excel or CSV</div>
        </div>

        <div
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={onDrop}
          onClick={()=>inputRef.current.click()}
          style={{
            width:460, padding:"56px 40px", borderRadius:16, cursor:"pointer", textAlign:"center",
            border:`2px dashed ${dragging ? T.accent : T.border2}`,
            background: dragging ? `${T.accent}08` : T.surface,
            transition:"all 0.2s",
            boxShadow: dragging ? `0 0 40px ${T.accent}18` : "none",
          }}>
          <div style={{ fontSize:40, marginBottom:16 }}>{loading ? "⏳" : "📂"}</div>
          <div style={{ color:T.text, fontSize:14, fontWeight:600, marginBottom:6 }}>
            {loading ? "Parsing your file…" : "Drop your file here"}
          </div>
          <div style={{ color:T.muted, fontSize:12, marginBottom:20 }}>or click to browse</div>
          <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
            {["XLSX","XLS","CSV"].map(f => <Tag key={f}>{f}</Tag>)}
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>handle(e.target.files[0])} />
        </div>

        {error && (
          <div style={{ marginTop:20, background:"rgba(248,113,113,0.07)", border:`1px solid rgba(248,113,113,0.25)`, borderRadius:8, padding:"10px 20px", color:T.red, fontSize:12, maxWidth:460, textAlign:"center" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ marginTop:40, maxWidth:460, textAlign:"center" }}>
          <SectionTitle>Required column names in your file</SectionTitle>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
            {Object.values(MANDATORY).map(m => <Tag key={m.label} color={T.accent}>{m.label}</Tag>)}
          </div>
          <div style={{ fontSize:11, color:T.dim, marginTop:12, lineHeight:1.9 }}>
            Missing columns? Don't worry — we'll let you map them manually.<br/>
            Extra columns will appear as-is in your dashboard.
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
                    width:"100%", padding:"10px 14px", background:"#0a0a14",
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

  const TABS = ["overview","holdings","analytics","risk"];

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text, fontFamily:"'Syne',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* NAV */}
      <div style={{ background:`${T.bg}ee`, borderBottom:`1px solid ${T.border}`, padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:20, backdropFilter:"blur(12px)" }}>
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
                    <Tooltip formatter={v=>inr(v)} contentStyle={{background:"#0a0a14",border:`1px solid ${T.border2}`,borderRadius:8,fontSize:11,fontFamily:"'Syne',sans-serif"}} />
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
                  <Bar dataKey="invested" name="Invested" fill={T.dim} radius={[3,3,0,0]} />
                  <Bar dataKey="current"  name="Current"  fill={T.accent} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
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
                      return <div style={{background:"#0a0a14",border:`1px solid ${T.border2}`,borderRadius:8,padding:"8px 14px",fontSize:11,fontFamily:"'Syne',sans-serif"}}>
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
