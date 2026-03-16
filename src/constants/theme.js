export const T = {
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

export const PIE_COLORS = [
  "#4f46e5","#059669","#d97706","#dc2626","#0284c7","#ea580c",
  "#7c3aed","#0d9488","#db2777","#0369a1","#65a30d","#9333ea",
  "#16a34a","#c2410c","#b45309","#0891b2",
];

export const MANDATORY = {
  name:     { label: "Stock Name",       aliases: ["stock name","stock","name","symbol","ticker"] },
  price:    { label: "Current Price",    aliases: ["current price","price","ltp","latest price","cmp","market price"] },
  qty:      { label: "Quantity",         aliases: ["quantity","qty","shares","units","holding"] },
  invPrice: { label: "Investment Price", aliases: ["investment price","inv. price","inv price","buy price","avg price","average price","cost price","purchase price"] },
};

export const TICKER_DATA = [
  { label: "NIFTY 50",   value: "22,502.00", chg: "+0.43%" },
  { label: "SENSEX",     value: "74,119.02", chg: "+0.38%" },
  { label: "NIFTY BANK", value: "48,201.35", chg: "-0.12%" },
  { label: "GOLD",       value: "₹72,450",   chg: "+0.21%" },
  { label: "USD/INR",    value: "83.42",      chg: "-0.05%" },
  { label: "CRUDE OIL",  value: "$82.10",     chg: "+0.67%" },
];

export const DASHBOARD_TABS = ["overview", "holdings", "analytics", "risk", "resources", "about"];
