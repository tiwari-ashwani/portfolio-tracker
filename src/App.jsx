import { useState } from "react";
import { buildStocks } from "./utils/parser";
import LoginScreen   from "./screens/LoginScreen";
import UploadScreen  from "./screens/UploadScreen";
import ColumnMapper  from "./screens/ColumnMapper";
import Dashboard     from "./screens/Dashboard";
import "./styles/global.css";

export default function App() {
  const [screen,    setScreen]  = useState("login");
  const [userEmail, setUser]    = useState("");
  const [parsed,    setParsed]  = useState(null);
  const [fileName,  setFile]    = useState("");
  const [dashboard, setDash]    = useState(null);

  const handleLogin  = (email) => { setUser(email); setScreen("upload"); };
  const handleLogout = ()      => { setUser(""); setParsed(null); setDash(null); setScreen("login"); };
  const handleReset  = ()      => { setParsed(null); setDash(null); setScreen("upload"); };

  const handleParsed = (result, fname) => {
    setFile(fname);
    if (result.missing.length > 0) {
      setParsed(result);
      setScreen("mapper");
    } else {
      const stocks = buildStocks(result.rows, result.mapping, result.extra);
      if (stocks.length === 0) return;
      setDash({ stocks, extra: result.extra.map((e) => e.label) });
      setScreen("dashboard");
    }
  };

  const handleMapped = ({ stocks, extra }) => {
    setDash({ stocks, extra });
    setScreen("dashboard");
  };

  if (screen === "login")     return <LoginScreen onLogin={handleLogin} />;
  if (screen === "upload")    return <UploadScreen userEmail={userEmail} onParsed={handleParsed} onLogout={handleLogout} />;
  if (screen === "mapper")    return <ColumnMapper parsed={parsed} fileName={fileName} onMapped={handleMapped} onBack={() => setScreen("upload")} />;
  if (screen === "dashboard") return <Dashboard {...dashboard} userEmail={userEmail} fileName={fileName} onReset={handleReset} onLogout={handleLogout} />;
  return null;
}
