import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine, ScatterChart, Scatter,
  ZAxis, Treemap,
} from "recharts";

import { Btn, Card, ChartTooltip, Logo, SectionTitle, Tag } from "../components/UI";
import TreeNode from "../components/TreeNode";
import { clr, sign, inr, pct } from "../utils/formatters";
import { T, PIE_COLORS, TICKER_DATA, DASHBOARD_TABS } from "../constants/theme";
import "../styles/screens.css";

// ─── RESOURCES DATA ────────────────────────────────────────────────────────────
const RESOURCES = [
  {
    category: "📚 Learn & Research",
    color: T.accent,
    links: [
      { name: "Zerodha Varsity",        desc: "Free stock market courses from basics to advanced", url: "https://zerodha.com/varsity/",                        tag: "FREE COURSE" },
      { name: "Screener.in",            desc: "Screen, analyse and compare Indian stocks",          url: "https://www.screener.in/",                            tag: "SCREENER"    },
      { name: "TradingView",            desc: "Advanced charts and technical analysis tools",       url: "https://www.tradingview.com/",                        tag: "CHARTS"      },
      { name: "Moneycontrol",           desc: "News, portfolio tools and Indian market data",       url: "https://www.moneycontrol.com/",                       tag: "NEWS"        },
    ],
  },
  {
    category: "📰 News & Macro",
    color: T.yellow,
    links: [
      { name: "Economic Times Markets", desc: "Indian market news, earnings and macro coverage",    url: "https://economictimes.indiatimes.com/markets",        tag: "INDIA"       },
      { name: "Wall Street Journal",    desc: "Global financial news and in-depth analysis",        url: "https://www.wsj.com/",                                tag: "GLOBAL"      },
      { name: "Goldman Sachs Insights", desc: "Research reports and macro economic outlooks",       url: "https://www.goldmansachs.com/insights/",              tag: "RESEARCH"    },
      { name: "Bloomberg Markets",      desc: "Real-time financial data and breaking news",         url: "https://www.bloomberg.com/markets",                   tag: "LIVE"        },
    ],
  },
  {
    category: "🛠 Tools & Calculators",
    color: T.green,
    links: [
      { name: "Groww Calculators",      desc: "SIP, lumpsum, FD and goal-based calculators",       url: "https://groww.in/calculators",                        tag: "CALC"        },
      { name: "Value Research",         desc: "Mutual fund ratings, NAV and portfolio analysis",    url: "https://www.valueresearchonline.com/",                tag: "MF"          },
      { name: "NSE India",              desc: "Official NSE data, indices and announcements",       url: "https://www.nseindia.com/",                           tag: "OFFICIAL"    },
      { name: "BSE India",              desc: "Official BSE data, filings and corporate actions",   url: "https://www.bseindia.com/",                           tag: "OFFICIAL"    },
    ],
  },
];

// ─── ABOUT DATA ────────────────────────────────────────────────────────────────
const CAREER = [
  { co: "CGI",       loc: "Amsterdam, NL", role: "Senior Full Stack Developer", period: "2019 – Present", active: true  },
  { co: "LTI",       loc: "India",         role: "Full Stack Developer",         period: "2015 – 2019",   active: false },
  { co: "Cognizant", loc: "India",         role: "Software Engineer",            period: "2013 – 2015",   active: false },
  { co: "Capgemini", loc: "India",         role: "Software Engineer",            period: "2011 – 2013",   active: false },
  { co: "Infosys",   loc: "India",         role: "Software Engineer",            period: "2009 – 2011",   active: false },
];

const PROFILE_LINKS = [
  { label: "Portfolio",  sub: "Projects & profile",    url: "https://about-ashwani.vercel.app/",           icon: "🌐", bg: T.accent  },
  { label: "LinkedIn",   sub: "Connect professionally", url: "https://www.linkedin.com/in/ashwanitiwari/",  icon: "in", bg: "#0077b5" },
  { label: "GitHub",     sub: "Code & open source",    url: "https://github.com/tiwari-ashwani",            icon: "🐙", bg: "#24292e" },
];

const SKILL_TILES = [
  { icon: "☕", label: "Java / Spring Boot",  desc: "Enterprise APIs, JPA, microservices" },
  { icon: "⚛️", label: "React / Node.js",     desc: "Full-stack web apps & dashboards"    },
  { icon: "🐳", label: "DevOps / Cloud",      desc: "Docker, K8s, AWS, CI/CD"             },
  { icon: "📊", label: "Finance Tools",       desc: "Data viz, portfolio analytics"       },
];

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <SectionTitle>{label}</SectionTitle>
      <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{sub}</div>
    </div>
  );
}

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function Dashboard({ stocks: rawStocks, extraCols: rawExtra, userEmail, fileName, onReset, onLogout }) {
  const stocks    = rawStocks ?? [];
  const extraCols = rawExtra  ?? [];

  const [tab, setTab]       = useState("overview");
  const [sort, setSort]     = useState({ key: "gain", dir: -1 });
  const [filter, setFilter] = useState("all");

  // ── Summary metrics ──────────────────────────────────────────────────────────
  const totalInv  = stocks.reduce((s, r) => s + r.invAmt, 0);
  const totalVal  = stocks.reduce((s, r) => s + r.curVal, 0);
  const totalGain = totalVal - totalInv;
  const totalPct  = totalInv ? (totalGain / totalInv) * 100 : 0;
  const winners   = stocks.filter((s) => s.gain > 0).length;
  const losers    = stocks.filter((s) => s.gain < 0).length;
  const best      = [...stocks].sort((a, b) => b.gainPct - a.gainPct)[0];
  const worst     = [...stocks].sort((a, b) => a.gainPct - b.gainPct)[0];

  // ── Chart data ───────────────────────────────────────────────────────────────
  const returnBar   = [...stocks].sort((a, b) => b.gainPct - a.gainPct).map((s) => ({ name: s.name, pct: parseFloat((s.gainPct ?? 0).toFixed(2)) }));
  const pieData     = stocks.map((s) => ({ name: s.name, value: Math.abs(s.curVal ?? 0) }));
  const cmpData     = stocks.slice(0, 15).map((s) => ({ name: s.name, invested: parseFloat((s.invAmt ?? 0).toFixed(0)), current: parseFloat((s.curVal ?? 0).toFixed(0)) }));
  const scatterData = stocks.map((s) => ({ name: s.name, x: s.invAmt ?? 0, y: parseFloat((s.gainPct ?? 0).toFixed(2)), z: Math.abs(s.curVal ?? 0) }));
  const riskData    = [...stocks].sort((a, b) => Math.abs(b.curVal ?? 0) - Math.abs(a.curVal ?? 0)).map((s) => ({ name: s.name, value: Math.abs(s.curVal ?? 0), gain: s.gain ?? 0 }));
  const topHeavy    = stocks.map((s) => ({ name: s.name, allocation: parseFloat(((s.curVal ?? 0) / Math.max(totalVal, 1) * 100).toFixed(2)), gainPct: parseFloat((s.gainPct ?? 0).toFixed(2)) })).sort((a, b) => b.allocation - a.allocation);
  const plDist      = [...stocks].sort((a, b) => (b.gain ?? 0) - (a.gain ?? 0)).map((s) => ({ name: s.name, gain: parseFloat((s.gain ?? 0).toFixed(0)) }));

  // ── Holdings table ───────────────────────────────────────────────────────────
  const filtered = stocks.filter((s) => {
    if (filter === "profit") return s.gain > 0;
    if (filter === "loss")   return s.gain < 0;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sort.key] ?? "", bv = b[sort.key] ?? "";
    return typeof av === "string" ? String(av).localeCompare(String(bv)) * sort.dir : (av - bv) * sort.dir;
  });
  const hs = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));

  // ── Smart insights ───────────────────────────────────────────────────────────
  const insights = (() => {
    if (!stocks.length) return [];
    const out = [];
    const avgReturn   = stocks.reduce((s, r) => s + r.gainPct, 0) / stocks.length;
    const topStock    = [...stocks].sort((a, b) => b.gainPct - a.gainPct)[0];
    const botStock    = [...stocks].sort((a, b) => a.gainPct - b.gainPct)[0];
    const bigWeight   = topHeavy[0];
    const profitCount = stocks.filter((s) => s.gain > 0).length;
    if (bigWeight?.allocation > 25)      out.push({ icon: "⚠️", color: T.red,    text: `${bigWeight.name} makes up ${bigWeight.allocation}% of your portfolio — consider rebalancing to reduce concentration risk.` });
    if (avgReturn < 0)                   out.push({ icon: "📉", color: T.red,    text: `Your average return is ${pct(avgReturn)}. More than half your holdings are underwater.` });
    if (avgReturn > 15)                  out.push({ icon: "🚀", color: T.green,  text: `Strong portfolio! Average return of ${pct(avgReturn)} across all holdings.` });
    if (topStock)                        out.push({ icon: "🏆", color: T.green,  text: `Best performer: ${topStock.name} at ${pct(topStock.gainPct)} return on ₹${topStock.invAmt.toLocaleString("en-IN")} invested.` });
    if (botStock?.gainPct < -30)         out.push({ icon: "🔴", color: T.red,    text: `${botStock.name} is down ${pct(botStock.gainPct)}. Review if it still fits your thesis.` });
    if (profitCount === stocks.length)   out.push({ icon: "✨", color: T.accent, text: `All ${stocks.length} holdings are in profit. Impressive portfolio management!` });
    if (stocks.length < 5)              out.push({ icon: "💡", color: T.yellow, text: `You hold only ${stocks.length} stocks. Diversifying across more sectors can reduce risk.` });
    if (stocks.length > 20)             out.push({ icon: "📊", color: T.muted,  text: `With ${stocks.length} holdings, tracking individual positions gets harder. Consider consolidating your best ideas.` });
    return out.slice(0, 4);
  })();

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      {/* Ticker bar */}
      <div className="ticker-bar">
        {TICKER_DATA.map((m) => (
          <div key={m.label} className="ticker-item">
            <span style={{ color: "rgba(255,255,255,0.65)", letterSpacing: 1 }}>{m.label}</span>
            <span style={{ color: "#fff", fontWeight: 700 }}>{m.value}</span>
            <span style={{ color: m.chg.startsWith("+") ? "#a7f3d0" : "#fca5a5", fontSize: 10 }}>{m.chg}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>INDICATIVE · NOT LIVE</div>
      </div>

      {/* Nav */}
      <div style={{ background: `${T.surface}ee`, borderBottom: `1px solid ${T.border}`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ padding: "14px 0" }}><Logo size={28} /></div>
          <div style={{ width: 1, height: 20, background: T.border }} />
          <div style={{ display: "flex", gap: 4 }}>
            {DASHBOARD_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "18px 16px", background: "transparent", border: "none",
                  borderBottom: `2px solid ${tab === t ? T.accent : "transparent"}`,
                  color: tab === t ? T.accent : T.muted,
                  fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase",
                  cursor: "pointer", fontWeight: tab === t ? 700 : 400,
                  fontFamily: "'Syne',sans-serif", transition: "all 0.15s",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, color: T.muted }}>{userEmail}</div>
          <Btn onClick={onReset}  variant="ghost" style={{ padding: "5px 12px", fontSize: 10 }}>New File</Btn>
          <Btn onClick={onLogout} variant="ghost" style={{ padding: "5px 12px", fontSize: 10 }}>Sign Out</Btn>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "28px 28px", maxWidth: 1300, margin: "0 auto" }}>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div>
            <div className="kpi-grid">
              <KpiCard label="Total Invested"   value={inr(totalInv)}  sub={`${stocks.length} holdings`} color={T.muted} />
              <KpiCard label="Current Value"    value={inr(totalVal)}  sub={fileName}                    color={T.text} />
              <KpiCard label="Total P & L"      value={`${sign(totalGain)}${inr(Math.abs(totalGain))}`} sub={pct(totalPct)} color={clr(totalGain)} />
              <KpiCard label="Winners / Losers" value={`${winners} / ${losers}`} sub={`${Math.round(winners / stocks.length * 100)}% in profit`} color={T.yellow} />
              <KpiCard label="Best Performer"   value={best?.name ?? "—"}  sub={pct(best?.gainPct)}  color={T.green} />
              <KpiCard label="Worst Performer"  value={worst?.name ?? "—"} sub={pct(worst?.gainPct)} color={T.red}   />
            </div>

            <div className="chart-grid" style={{ gridTemplateColumns: "1.4fr 1fr", marginBottom: 18 }}>
              <Card>
                <SectionTitle>Return % by Stock</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={returnBar} barSize={14}>
                    <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 8 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={55} />
                    <YAxis tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke={T.border2} />
                    <Bar dataKey="pct" name="Return %" radius={[3, 3, 0, 0]}>
                      {returnBar.map((s, i) => <Cell key={i} fill={s.pct >= 0 ? T.green : T.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle>Portfolio Allocation</SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => inr(v)} contentStyle={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 8, fontSize: 11, fontFamily: "'Syne',sans-serif" }} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card style={{ marginBottom: insights.length ? 18 : 0 }}>
              <SectionTitle>Invested vs Current Value</SectionTitle>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={cmpData} barSize={12} barGap={2}>
                  <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 8 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => inr(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="invested" name="Invested" fill="#c7d2fe" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="current"  name="Current"  fill={T.accent} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {insights.length > 0 && (
              <Card style={{ marginTop: 18 }}>
                <SectionTitle>🧠 Portfolio Insights</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ background: `${ins.color}08`, border: `1px solid ${ins.color}25`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 20, lineHeight: 1 }}>{ins.icon}</div>
                      <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6 }}>{ins.text}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── HOLDINGS ── */}
        {tab === "holdings" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
              {[["all", `All (${stocks.length})`], ["profit", `Profit (${winners})`], ["loss", `Loss (${losers})`]].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} style={{
                  background: filter === v ? `${T.accent}15` : "transparent",
                  border: `1px solid ${filter === v ? `${T.accent}50` : T.border2}`,
                  color: filter === v ? T.accent : T.muted,
                  padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 11, letterSpacing: 1, fontFamily: "'Syne',sans-serif",
                }}>{l}</button>
              ))}
              <span style={{ marginLeft: "auto", color: T.dim, fontSize: 9, letterSpacing: 1 }}>↕ CLICK HEADERS TO SORT</span>
            </div>

            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {[
                        { k: "name",     label: "Stock",     a: "left" },
                        { k: "price",    label: "Price",     a: "right" },
                        { k: "qty",      label: "Qty",       a: "right" },
                        { k: "invPrice", label: "Avg Cost",  a: "right" },
                        { k: "invAmt",   label: "Invested",  a: "right" },
                        { k: "curVal",   label: "Cur Value", a: "right" },
                        { k: "gain",     label: "P & L",     a: "right" },
                        { k: "gainPct",  label: "Return %",  a: "right" },
                        ...extraCols.map((c) => ({ k: c, label: c, a: "right", extra: true })),
                      ].map((c) => (
                        <th key={c.k} onClick={() => hs(c.k)} style={{
                          padding: "12px 14px", textAlign: c.a, fontSize: 8, letterSpacing: 2,
                          color: sort.key === c.k ? T.accent : c.extra ? T.dim : T.muted,
                          textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
                          borderBottom: sort.key === c.k ? `2px solid ${T.accent}` : "2px solid transparent",
                          fontFamily: "'Syne',sans-serif",
                        }}>
                          {c.label}{sort.key === c.k ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((s, i) => (
                      <tr key={s.name + i}
                        style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = `${T.accent}08`}
                        onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"}
                      >
                        <td style={{ padding: "10px 14px", color: T.text, fontWeight: 600, whiteSpace: "nowrap" }}>{s.name}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: "#aaa" }}>{inr(s.price)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: T.muted }}>{s.qty}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: T.muted }}>{inr(s.invPrice)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: T.muted }}>{inr(s.invAmt)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: T.text, fontWeight: 500 }}>{inr(s.curVal)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: clr(s.gain), fontWeight: 600 }}>{sign(s.gain)}{inr(Math.abs(s.gain))}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: clr(s.gainPct), fontWeight: 700 }}>{pct(s.gainPct)}</td>
                        {extraCols.map((col) => <td key={col} style={{ padding: "10px 14px", textAlign: "right", color: T.dim, fontSize: 11 }}>{s[col] ?? ""}</td>)}
                      </tr>
                    ))}
                    <tr style={{ borderTop: `1px solid ${T.border2}`, background: `${T.accent}08` }}>
                      <td style={{ padding: "12px 14px", color: T.accent, fontWeight: 700, fontSize: 10, letterSpacing: 2 }}>TOTAL</td>
                      <td /><td /><td />
                      <td style={{ padding: "12px 14px", textAlign: "right", color: T.muted, fontWeight: 600 }}>{inr(totalInv)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: T.text, fontWeight: 700 }}>{inr(totalVal)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: clr(totalGain), fontWeight: 700 }}>{sign(totalGain)}{inr(Math.abs(totalGain))}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: clr(totalPct), fontWeight: 700 }}>{pct(totalPct)}</td>
                      {extraCols.map((c) => <td key={c} />)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && (
          <div>
            <div className="chart-grid" style={{ marginBottom: 18 }}>
              <Card>
                <SectionTitle>Portfolio Weight & Return</SectionTitle>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Stock","Weight","P&L","Return"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: h === "Stock" ? "left" : "right", fontSize: 8, letterSpacing: 2, color: T.muted, textTransform: "uppercase", fontFamily: "'Syne',sans-serif" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topHeavy.map((s, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "8px 10px", color: T.text, fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                            <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border2, overflow: "hidden" }}>
                              <div style={{ width: `${s.allocation}%`, height: "100%", background: T.accent, borderRadius: 2 }} />
                            </div>
                            <span style={{ color: T.muted, fontSize: 11, minWidth: 36, textAlign: "right" }}>{s.allocation}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: clr(stocks.find((x) => x.name === s.name)?.gain), fontSize: 11 }}>
                          {sign(stocks.find((x) => x.name === s.name)?.gain)}{inr(Math.abs(stocks.find((x) => x.name === s.name)?.gain))}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: clr(s.gainPct), fontWeight: 600 }}>{pct(s.gainPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card>
                <SectionTitle>Investment Size vs Return % (Bubble)</SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <XAxis dataKey="x" name="Invested" tickFormatter={(v) => inr(v)} tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="y" name="Return %" tickFormatter={(v) => `${v}%`} tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} />
                    <ZAxis dataKey="z" range={[40, 400]} />
                    <ReferenceLine y={0} stroke={T.border2} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 8, padding: "8px 14px", fontSize: 11, fontFamily: "'Syne',sans-serif", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                          <div style={{ color: T.accent, fontWeight: 600 }}>{d?.name}</div>
                          <div style={{ color: T.muted }}>Invested: {inr(d?.x)}</div>
                          <div style={{ color: clr(d?.y) }}>Return: {pct(d?.y)}</div>
                        </div>
                      );
                    }} />
                    <Scatter data={scatterData} fill={T.accent} opacity={0.8}>
                      {scatterData.map((s, i) => <Cell key={i} fill={s.y >= 0 ? T.green : T.red} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card>
              <SectionTitle>Portfolio Treemap — size = current value, color = P&amp;L</SectionTitle>
              <ResponsiveContainer width="100%" height={240}>
                <Treemap
                  data={riskData.map((s, i) => ({ ...s, fill: s.gain >= 0 ? `hsl(${150 - i * 3},60%,${35 + i * 2}%)` : `hsl(${0 + i * 3},60%,${35 + i * 2}%)` }))}
                  dataKey="value"
                  aspectRatio={4 / 3}
                  content={TreeNode}
                />
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ── RISK ── */}
        {tab === "risk" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { l: "Concentration Risk", v: topHeavy[0] ? `${topHeavy[0].allocation}%` : "—", sub: `Top: ${topHeavy[0]?.name}`, c: topHeavy[0]?.allocation > 20 ? T.red : T.green },
                { l: "Profit Holdings",    v: `${winners} / ${stocks.length}`, sub: `${Math.round(winners / stocks.length * 100)}% of portfolio`, c: T.green },
                { l: "Avg Return",         v: pct(stocks.reduce((s, r) => s + r.gainPct, 0) / stocks.length), sub: "Mean across all stocks", c: clr(stocks.reduce((s, r) => s + r.gainPct, 0) / stocks.length) },
                { l: "Largest Loss",       v: inr(Math.abs(worst?.gain ?? 0)), sub: worst?.name, c: T.red },
              ].map(({ l, v, sub, c }) => (
                <Card key={l} style={{ position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${c},transparent)` }} />
                  <SectionTitle>{l}</SectionTitle>
                  <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>
                </Card>
              ))}
            </div>

            <div className="chart-grid">
              <Card>
                <SectionTitle>Top Concentration (% of portfolio)</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {topHeavy.slice(0, 8).map((s, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: T.text }}>{s.name}</span>
                        <span style={{ fontSize: 12, color: s.allocation > 20 ? T.red : T.muted }}>{s.allocation}%</span>
                      </div>
                      <div style={{ height: 5, background: T.border2, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(s.allocation, 100)}%`, height: "100%", background: s.allocation > 20 ? T.red : T.accent, borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <SectionTitle>P&L Distribution</SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={plDist} barSize={12}>
                    <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 7 }} axisLine={false} tickLine={false} interval={0} angle={-40} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: T.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => inr(v)} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke={T.border2} />
                    <Bar dataKey="gain" name="P&L" radius={[3, 3, 0, 0]}>
                      {plDist.map((s, i) => <Cell key={i} fill={s.gain >= 0 ? T.green : T.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {/* ── RESOURCES ── */}
        {tab === "resources" && (
          <div>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 6 }}>Resources</div>
              <div style={{ fontSize: 13, color: T.muted }}>Handpicked tools, courses and news to level up your investing game.</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {RESOURCES.map((section) => (
                <div key={section.category}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 3, height: 18, background: section.color, borderRadius: 2 }} />
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{section.category}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
                    {section.links.map((link) => (
                      <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", transition: "all 0.18s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = section.color; e.currentTarget.style.boxShadow = `0 4px 16px ${section.color}25`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{link.name}</div>
                            <span style={{ background: `${section.color}15`, color: section.color, fontSize: 9, padding: "3px 8px", borderRadius: 20, letterSpacing: 1, whiteSpace: "nowrap", marginLeft: 8 }}>{link.tag}</span>
                          </div>
                          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{link.desc}</div>
                          <div style={{ marginTop: 10, fontSize: 11, color: section.color, fontWeight: 600 }}>Visit →</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 48, padding: "24px 0", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Logo size={24} />
                <span style={{ fontSize: 11, color: T.muted }}>— Your personal portfolio intelligence platform</span>
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>Built with ♥ · Your data never leaves this device · No tracking</div>
            </div>
          </div>
        )}

        {/* ── ABOUT ── */}
        {tab === "about" && (
          <div style={{ maxWidth: 740, margin: "0 auto", padding: "16px 0 56px" }}>
            {/* Hero */}
            <Card style={{ marginBottom: 16, padding: "26px 28px", background: `linear-gradient(135deg,${T.accent}07,${T.accent2}04)`, border: `1px solid ${T.accent}1a` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
                <div style={{ width: 66, height: 66, borderRadius: 14, background: `linear-gradient(135deg,${T.accent},${T.accent2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>👨‍💻</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 2 }}>Ashwani Tiwari</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>Senior Full Stack Developer · 15 Years</div>
                  <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.85, maxWidth: 460 }}>
                    Based in Amsterdam. Currently building enterprise systems at CGI. Java · Spring Boot · React · Microservices · Cloud.
                    FINSTACK is a personal side project — zero backend, client-side only, built in React.
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    {["CGI · Amsterdam","Java 21","Spring Boot 3","React","Microservices","Docker","AWS","PostgreSQL"].map((t) => (
                      <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", border: `1px solid ${T.border2}`, borderRadius: 4, color: T.muted, background: T.surface }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Career timeline */}
            <Card style={{ marginBottom: 16 }}>
              <SectionTitle>// career_timeline</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {CAREER.map((e, i) => (
                  <div key={e.co} style={{ display: "flex", gap: 14, paddingBottom: i < CAREER.length - 1 ? 18 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 14 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: e.active ? T.accent : T.border2, border: `2px solid ${e.active ? T.accent : T.border2}`, marginTop: 3, flexShrink: 0 }} />
                      {i < CAREER.length - 1 && <div style={{ width: 1, flex: 1, background: T.border, marginTop: 3 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{e.co} <span style={{ fontSize: 11, fontWeight: 400, color: T.muted }}>· {e.loc}</span></div>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, color: e.active ? T.accent : T.muted, background: e.active ? `${T.accent}0e` : T.bg, padding: "2px 9px", borderRadius: 20 }}>{e.period}</span>
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{e.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Profile links */}
            <div className="about-links">
              {PROFILE_LINKS.map((l) => (
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <Card
                    style={{ padding: "16px 18px", cursor: "pointer", transition: "all 0.18s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.09)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: l.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 800, marginBottom: 10 }}>{l.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 2 }}>{l.label} ↗</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{l.sub}</div>
                  </Card>
                </a>
              ))}
            </div>

            {/* Skills */}
            <Card style={{ marginBottom: 16 }}>
              <SectionTitle>// available_for</SectionTitle>
              <div className="about-skills">
                {SKILL_TILES.map((s) => (
                  <div key={s.label} style={{ background: T.bg, borderRadius: 9, padding: "14px 15px", border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 18, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tech config */}
            <Card style={{ marginBottom: 16, padding: "18px 22px" }}>
              <SectionTitle>// finstack.config</SectionTitle>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, lineHeight: 2.1 }}>
                {[
                  ["framework",    "React 18 + Vite"],
                  ["charts",       "Recharts"],
                  ["file_parser",  "SheetJS (xlsx)"],
                  ["deployment",   "Vercel (static)"],
                  ["data_storage", "none · client-side only"],
                  ["backend",      "none · zero server calls"],
                  ["tracking",     "none · your data stays local"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: T.accent2, minWidth: 116 }}>{k}</span>
                    <span style={{ color: T.muted }}>:</span>
                    <span style={{ color: T.text }}>{v}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* CTA */}
            <Card style={{ textAlign: "center", padding: "22px 28px", background: `linear-gradient(135deg,${T.accent}07,${T.accent2}04)`, border: `1px solid ${T.accent}18` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>Open to interesting projects</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>Senior roles · backend architecture · fintech · consulting</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                {[
                  { label: "Visit Portfolio ↗", href: "https://about-ashwani.vercel.app/", bg: T.accent },
                  { label: "LinkedIn ↗",        href: "https://www.linkedin.com/in/ashwanitiwari/", bg: "#0077b5" },
                  { label: "GitHub ↗",          href: "https://github.com/tiwari-ashwani", bg: "#24292e" },
                ].map(({ label, href, bg }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <Btn style={{ background: bg, fontSize: 12, padding: "9px 20px", boxShadow: "none" }}>{label}</Btn>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="dash-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={22} />
          <span style={{ fontSize: 11, color: T.muted }}>· Portfolio Intelligence · © {new Date().getFullYear()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: T.muted }}>Built by</span>
          <a
            href="https://about-ashwani.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 700, color: T.accent, textDecoration: "none", display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", border: `1px solid ${T.accent}30`, borderRadius: 6, background: `${T.accent}08`, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${T.accent}08`; e.currentTarget.style.color = T.accent; }}
          >
            Ashwani Tiwari ↗
          </a>
          <span style={{ fontSize: 10, color: T.muted, letterSpacing: 0.5 }}>Data stays on your device · No tracking</span>
        </div>
      </div>
    </div>
  );
}
