import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Btn, Logo, Tag } from "../components/UI";
import { parseCSVText, rowsToResult } from "../utils/parser";
import { MANDATORY } from "../constants/theme";
import { T } from "../constants/theme";
import "../styles/screens.css";

export default function UploadScreen({ userEmail, onParsed, onLogout }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const inputRef = useRef();

  const handle = (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
      setError("Only .xlsx, .xls, or .csv files are supported.");
      return;
    }
    setLoading(true);
    setError("");

    const process = (rows) => {
      if (rows.length < 2) { setLoading(false); setError("File appears empty."); return; }
      const result = rowsToResult(rows);
      setLoading(false);
      onParsed(result, file.name);
    };

    if (ext === "csv") {
      const r = new FileReader();
      r.onload = (e) => {
        try { process(parseCSVText(e.target.result)); }
        catch (err) { setLoading(false); setError("CSV parse error: " + err.message); }
      };
      r.readAsText(file);
    } else {
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
          process(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" }));
        } catch (err) { setLoading(false); setError("File parse error: " + err.message); }
      };
      r.readAsArrayBuffer(file);
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handle(e.dataTransfer.files[0]);
  }, []);

  return (
    <div className="upload">
      <div className="grid-bg" />

      <nav className="upload__nav">
        <Logo size={28} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: "'JetBrains Mono',monospace" }}>
            {userEmail}
          </div>
          <Btn onClick={onLogout} variant="ghost" style={{ padding: "6px 14px", fontSize: 11 }}>
            Sign out
          </Btn>
        </div>
      </nav>

      <div className="upload__body">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 4, color: T.accent, textTransform: "uppercase", marginBottom: 12 }}>
            // step_01 · data_ingestion
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.text }}>Import Portfolio Holdings</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
            Supports Zerodha, Groww, and any broker export — CSV or Excel
          </div>
        </div>

        <div
          className={`upload__dropzone${dragging ? " upload__dropzone--active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current.click()}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>{loading ? "⚙️" : "📂"}</div>
          <div style={{ color: T.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            {loading ? "Parsing file…" : "Drop your holdings file here"}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", color: T.muted, fontSize: 11, marginBottom: 18 }}>
            {loading ? "running column detection…" : "or click to browse · zero uploads · client-side only"}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {["XLSX","XLS","CSV"].map((f) => <Tag key={f}>{f}</Tag>)}
          </div>
          <input
            ref={inputRef} type="file" accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            onChange={(e) => handle(e.target.files[0])}
          />
        </div>

        {error && <div className="upload__error">⚠ {error}</div>}

        <div className="upload__hints">
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: 3, color: T.muted, textTransform: "uppercase", marginBottom: 12 }}>
            // required_columns
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {Object.values(MANDATORY).map((m) => (
              <Tag key={m.label} color={T.accent}>{m.label}</Tag>
            ))}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: T.muted, lineHeight: 2 }}>
            <span style={{ color: T.green }}>✓</span> Missing columns? Manual mapper runs automatically<br />
            <span style={{ color: T.green }}>✓</span> Extra columns pass through to dashboard as-is<br />
            <span style={{ color: T.green }}>✓</span> Zerodha wrapped-CSV format supported
          </div>
        </div>
      </div>
    </div>
  );
}
