import { useState } from "react";
import { Btn, Card, Logo, SectionTitle, Tag } from "../components/UI";
import { buildStocks } from "../utils/parser";
import { MANDATORY, T } from "../constants/theme";
import "../styles/screens.css";

export default function ColumnMapper({ parsed, fileName, onMapped, onBack }) {
  const { headers, mapping: initialMapping, extra: initialExtra, missing, rows } = parsed;
  const [userMap, setUserMap] = useState({});

  const currentMapping = { ...initialMapping, ...userMap };
  const stillMissing   = missing.filter((k) => !(k in currentMapping));
  const allMapped      = stillMissing.length === 0;

  const usedIdxs = new Set(Object.values(currentMapping));
  const availableCols = headers
    .map((h, i) => ({ label: h || `(Column ${i + 1})`, idx: i }))
    .filter(({ idx }) => !usedIdxs.has(idx) || Object.values(userMap).includes(idx));

  const confirm = () => {
    const finalMapping = currentMapping;
    const usedIdx = new Set(Object.values(finalMapping));
    const extra = headers
      .map((h, i) => ({ label: h, idx: i }))
      .filter(({ idx, label }) => !usedIdx.has(idx) && String(label).trim() !== "");
    const stocks = buildStocks(rows, finalMapping, extra);
    if (stocks.length === 0) return;
    onMapped({ stocks, extra: extra.map((e) => e.label) });
  };

  return (
    <div className="mapper">
      <nav className="mapper__nav">
        <Logo size={28} />
        <Btn onClick={onBack} variant="ghost" style={{ padding: "6px 14px", fontSize: 11 }}>← Back</Btn>
      </nav>

      <div className="mapper__body">
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: T.red, textTransform: "uppercase", marginBottom: 12 }}>
            ⚠ Missing Columns Detected
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 8 }}>Map your columns</div>
          <div style={{ fontSize: 13, color: T.muted }}>
            <span style={{ color: T.accent }}>{fileName}</span> is missing {missing.length} required column{missing.length > 1 ? "s" : ""}. Tell us which columns match.
          </div>
        </div>

        {/* Auto-detected columns */}
        {Object.entries(initialMapping).length > 0 && (
          <Card style={{ marginBottom: 20 }}>
            <SectionTitle>Auto-detected ✓</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(initialMapping).map(([key, idx]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: T.muted, fontSize: 13 }}>{MANDATORY[key].label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Tag color={T.green}>{headers[idx] || `Col ${idx + 1}`}</Tag>
                    <span style={{ color: T.green, fontSize: 11 }}>✓</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Manual mapping */}
        <Card>
          <SectionTitle>Needs your input</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {missing.map((key) => (
              <div key={key}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>{MANDATORY[key].label}</div>
                    <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>
                      e.g. {MANDATORY[key].aliases.slice(0, 3).join(", ")}
                    </div>
                  </div>
                  {key in userMap && <Tag color={T.green}>Mapped ✓</Tag>}
                </div>
                <select
                  value={userMap[key] ?? ""}
                  onChange={(e) => setUserMap((p) => ({ ...p, [key]: parseInt(e.target.value) }))}
                  className={`mapper__select${key in userMap ? " mapper__select--mapped" : ""}`}
                >
                  <option value="">— Select a column from your file —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `(Column ${i + 1})`} — e.g. {rows[1]?.[i] ?? ""}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <Btn onClick={onBack} variant="ghost" style={{ flex: 1 }}>← Re-upload</Btn>
          <Btn onClick={confirm} disabled={!allMapped} style={{ flex: 2 }}>
            {allMapped
              ? "Build Dashboard →"
              : `Map ${stillMissing.length} more column${stillMissing.length > 1 ? "s" : ""}`}
          </Btn>
        </div>
      </div>
    </div>
  );
}
