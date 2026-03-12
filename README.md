
# 📈 FINSTACK — Portfolio Intelligence Dashboard

A modern **browser-based stock portfolio analytics dashboard** that lets you upload your holdings and instantly visualize performance, allocation, and risk — **without sending your data to any server**.

Built with **React + Recharts**, FINSTACK runs entirely in your browser.

---

## 🚀 Features

### 📂 Portfolio Import
- Upload **CSV / XLSX / XLS** portfolio files
- Automatic **column detection**
- Smart **manual column mapping** if fields are missing
- Works with exports from brokers like **Groww, Zerodha, or custom spreadsheets**

### 📊 Portfolio Analytics
- Total invested vs current value
- P&L and return percentage
- Winners vs losers
- Best & worst performing stocks

### 📈 Visualizations
- Return % bar charts
- Portfolio allocation pie chart
- Invested vs current comparison
- Bubble chart (investment size vs return)
- Treemap visualization
- Profit/Loss distribution charts

### 🧠 Smart Insights
Automatically generated insights such as:
- Concentration risk warnings
- Best & worst performers
- Portfolio diversification suggestions
- Average portfolio return analysis

### 📋 Holdings Table
Sortable table with:
- Price
- Quantity
- Average cost
- Invested value
- Current value
- P&L
- Return %

Supports **extra columns from uploaded files** automatically.

### ⚠️ Risk Analytics
- Concentration analysis
- Portfolio exposure
- Loss distribution
- Largest drawdowns

### 🔒 Privacy First
- No backend
- No API calls
- No data storage
- Everything runs **locally in the browser**

---

# 🧱 Tech Stack

| Technology | Purpose |
|------------|--------|
| React | UI framework |
| Recharts | Charts & visualizations |
| XLSX | Excel file parsing |
| JavaScript | Application logic |

---

# ⚙️ Installation

### Clone repository

git clone https://github.com/yourusername/finstack.git
cd finstack

### Install dependencies

npm install

### Run the app

npm run dev

---

# 📥 Example Portfolio Format

Stock Name,Current Price,Quantity,Investment Price
AAPL,182.1,10,165.2
MSFT,320.4,8,295.5
NVDA,485.3,4,420.1

---

# 👨‍💻 Author

Ashwani Tiwari

LinkedIn  
https://www.linkedin.com/in/ashwanitiwari/

GitHub  
https://github.com/tiwari-ashwani

---

# 📜 License

MIT License
