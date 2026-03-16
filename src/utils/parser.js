import { MANDATORY } from "../constants/theme";

export function parseCSVText(text) {
  const trimmed = text.trim();
  let lines = [];

  if (trimmed.startsWith('"') && !trimmed.startsWith('"' + trimmed.split(",")[0].slice(1) + '"')) {
    let inner = trimmed.slice(1).replace(/["\r\n]+$/, "");
    lines = inner.split(/\r?\n/);
  } else {
    lines = trimmed.split(/\r?\n/);
  }

  return lines
    .filter((l) => l.trim() !== "")
    .map((line) => {
      let l = line.startsWith('"') ? line.slice(1) : line;
      l = l.replace(/,["]+$/, "").replace(/["]+$/, "").replace(/""/g, '"');
      return l.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    });
}

export function matchColumns(headers) {
  const lower = headers.map((h) => String(h).toLowerCase().trim());
  const mapping = {};

  for (const [key, { aliases }] of Object.entries(MANDATORY)) {
    const idx = lower.findIndex((h) => aliases.includes(h));
    if (idx !== -1) mapping[key] = idx;
  }

  const usedIdx = new Set(Object.values(mapping));
  const extra = headers
    .map((h, i) => ({ label: h, idx: i }))
    .filter(({ idx, label }) => !usedIdx.has(idx) && String(label).trim() !== "");

  return { mapping, extra };
}

export function rowsToResult(rows) {
  const headers = rows[0].map(String);
  const { mapping, extra } = matchColumns(headers);
  const missing = Object.keys(MANDATORY).filter((k) => !(k in mapping));
  return { headers, mapping, extra, missing, rows };
}

export function buildStocks(rows, mapping, extra) {
  return rows
    .slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ""))
    .map((r) => {
      const name     = String(r[mapping.name] ?? "").trim();
      const price    = parseFloat(String(r[mapping.price]).replace(/[^0-9.-]/g, ""));
      const qty      = parseFloat(String(r[mapping.qty]).replace(/[^0-9.-]/g, ""));
      const invPrice = parseFloat(String(r[mapping.invPrice]).replace(/[^0-9.-]/g, ""));
      const invAmt   = qty * invPrice;
      const curVal   = qty * price;
      const gain     = curVal - invAmt;
      const gainPct  = invAmt ? (gain / invAmt) * 100 : 0;
      const extraData = {};
      for (const { label, idx } of extra) extraData[label] = r[idx] ?? "";
      return { name, price, qty, invPrice, invAmt, curVal, gain, gainPct, ...extraData };
    })
    .filter((s) => s.name && !isNaN(s.price) && !isNaN(s.qty) && !isNaN(s.invPrice));
}
