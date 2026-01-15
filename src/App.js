import Chart from "chart.js/auto";
import React, { useState } from "react";
import "./App.css";

// Fetch all mutual funds (once)
async function fetchAllFunds() {
  const res = await fetch("https://api.mfapi.in/mf");
  return res.json();
}

// Fetch single fund details
async function fetchFundDetails(code) {
  const res = await fetch(`https://api.mfapi.in/mf/${code}`);
  return res.json();
}


function calculateSIP(monthly, rate, years) {
  const r = rate / 100 / 12;
  const n = years * 12;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

function parseMFDate(dateStr) {
  // MFAPI format: DD-MM-YYYY
  const [dd, mm, yyyy] = dateStr.split("-");
  return new Date(`${yyyy}-${mm}-${dd}`);
}

function NavChart({ data, dark }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    if (!data || data.length === 0) return;

    const ctx = canvasRef.current.getContext("2d");

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map((d) => d.date).reverse(),
        datasets: [
          {
            label: "NAV",
            data: data.map((d) => Number(d.nav)).reverse(),
            borderColor: "#22c55e",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: dark ? "#94a3b8" : "#475569" },
            grid: { display: false },
          },
          y: {
            ticks: { color: dark ? "#94a3b8" : "#475569" },
            grid: { color: dark ? "#1e293b" : "#e5e7eb" },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data, dark]);

  return <canvas ref={canvasRef} />;
}
function SipChart({ monthly, rate, years, dark }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const sipData = generateSipData(monthly, rate, years);
    const ctx = canvasRef.current.getContext("2d");

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: sipData.map((d) => d.month),
        datasets: [
          {
            label: "Portfolio Value",
            data: sipData.map((d) => d.value),
            borderColor: "#0ea5e9",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            display: false,
          },
          y: {
            ticks: {
              color: dark ? "#94a3b8" : "#475569",
              callback: (v) => `₹${(v / 100000).toFixed(1)}L`,
            },
            grid: {
              color: dark ? "#1e293b" : "#e5e7eb",
            },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [monthly, rate, years, dark]);

  return <canvas ref={canvasRef} />;
}

function generateSipData(monthly, rate, years) {
  const r = rate / 100 / 12;
  const months = years * 12;
  let value = 0;

  const data = [];

  for (let i = 1; i <= months; i++) {
    value = value * (1 + r) + monthly;
    data.push({
      month: i,
      value: Math.round(value),
    });
  }

  return data;
}

function getClosestNav(histData, targetDate) {
  const target = new Date(targetDate).getTime();

  for (let i = histData.length - 1; i >= 0; i--) {
    const d = parseMFDate(histData[i].date).getTime();

    if (d <= target) {
      return Number(histData[i].nav);
    }
  }

  return null;
}


function simpleReturn(current, past) {
  return ((current / past) - 1) * 100;
}

function annualisedReturn(current, past, years) {
  return (Math.pow(current / past, 1 / years) - 1) * 100;
}


function App() {
  const [dark, setDark] = useState(false);

  // SIP states
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const invested = monthly * years * 12;
  const futureValue = Math.round(calculateSIP(monthly, rate, years));
  const gain = futureValue - invested;

  // Fund Researcher states
  const [allFunds, setAllFunds] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [selectedFund, setSelectedFund] = useState(null);
  const [loadingFunds, setLoadingFunds] = useState(false);

  React.useEffect(() => {
    setLoadingFunds(true);
    fetchAllFunds()
      .then((data) => {
        setAllFunds(data);
        setLoadingFunds(false);
      })
      .catch(() => setLoadingFunds(false));
  }, []);

  React.useEffect(() => {
    // If a fund is selected, do NOT show dropdown
    if (selectedFund || search.length < 3) {
      setResults([]);
      return;
    }

    const filtered = allFunds
      .filter((f) =>
        f.schemeName.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 10);

    setResults(filtered);
  }, [search, allFunds, selectedFund]);

  const histData = React.useMemo(() => {
    if (!selectedFund?.data) return [];
    return [...selectedFund.data].reverse(); // oldest → newest
  }, [selectedFund]);



  const performance = React.useMemo(() => {
    if (!histData || histData.length === 0) return null;

    const latest = histData[histData.length - 1];

    const currentNav = Number(latest.nav);
    const today = parseMFDate(latest.date);


    const periods = [
      { label: "1 Week", days: 7, type: "simple" },
      { label: "1 Month", days: 30, type: "simple" },
      { label: "3 Months", days: 90, type: "simple" },
      { label: "6 Months", days: 180, type: "simple" },
      { label: "YTD", ytd: true, type: "simple" },
      { label: "1 Year", years: 1, type: "annualised" },
      { label: "2 Years", years: 2, type: "annualised" },
      { label: "3 Years", years: 3, type: "annualised" }
    ];

    return periods.map(p => {
      let pastNav = null;

      if (p.ytd) {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        pastNav = getClosestNav(histData, startOfYear);
      } else if (p.days) {
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - p.days);
        pastNav = getClosestNav(histData, pastDate);
      } else if (p.years) {
        const pastDate = new Date(today);
        pastDate.setFullYear(today.getFullYear() - p.years);
        pastNav = getClosestNav(histData, pastDate);
      }

      if (!pastNav) return { label: p.label, value: null };

      const value =
        p.type === "simple"
          ? simpleReturn(currentNav, pastNav)
          : annualisedReturn(currentNav, pastNav, p.years);

      return { label: p.label, value };
    });
  }, [histData]);


  return (
    <div className={dark ? "app dark" : "app"}>
      <header className="header">
        <div className="logo">
          <img src="/logo.png" alt="Matecap Wealth" />
          <span>Matecap Wealth</span>
        </div>

        <div className="header-actions">
          <a
            href="https://wa.me/918478999888"
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-icon-btn"
            aria-label="Chat on WhatsApp"
          >
            <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor">
              <path d="M16 .5C7.5.5.5 7.4.5 16c0 2.8.7 5.4 2 7.7L.5 31.5l8-2.1c2.2 1.2 4.7 1.8 7.5 1.8 8.6 0 15.5-6.9 15.5-15.2S24.6.5 16 .5zm0 27.6c-2.4 0-4.6-.6-6.6-1.7l-.5-.3-4.7 1.2 1.3-4.5-.3-.5c-1.2-1.9-1.8-4.1-1.8-6.4C3.4 9 9.1 3.5 16 3.5S28.6 9 28.6 16 22.9 28.1 16 28.1z" />
            </svg>
          </a>

          <button
            onClick={() => setDark(!dark)}
            className="mode-icon-btn"
            aria-label="Toggle theme"
          >
            {dark ? (
              /* Sun icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            ) : (
              /* Moon icon */
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            )}
          </button>

        </div>

      </header>



      <main className="main">
        <section className="hero hero-main">
          <h1>Build Wealth with Discipline & Clarity</h1>

          <p>
            Matecap Wealth helps you make informed investment decisions with
            transparent SIP planning and real-time mutual fund research.
          </p>

          <div className="amfi-badge">
            <span className="amfi-dot" />
            AMFI Registered Mutual Fund Distributor
            <span className="amfi-sep">•</span>
            ARN – 344831
          </div>

          <div className="hero-actions">
            <button
              className="primary-btn"
              onClick={() =>
                document
                  .getElementById("sip-section")
                  .scrollIntoView({ behavior: "smooth" })
              }
            >
              Start SIP Planning
            </button>

            <a
              href="https://wa.me/918478999888"
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-btn"
            >
              WhatsApp Us
            </a>

          </div>


        </section>



        <section id="sip-section">
          {/* SIP Calculator cards here */}

          <section className="hero">
            <h1>SIP Calculator</h1>
            <p>
              Estimate how your monthly investments can grow over time with
              disciplined SIP investing.
            </p>
          </section>

          <section className="card sip-card">
            <div className="field">
              <label>Monthly Investment (₹)</label>
              <input
                type="number"
                value={monthly}
                onChange={(e) => setMonthly(Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label>Expected Return (% p.a.)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
            </div>

            <div className="field">
              <label>Investment Duration (Years)</label>
              <input
                type="number"
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
              />
            </div>
          </section>

          <section className="card result-card">
            <div className="result">
              <span>Invested Amount</span>
              <strong>₹ {invested.toLocaleString("en-IN")}</strong>
            </div>

            <div className="result highlight">
              <span>Estimated Value</span>
              <strong>₹ {futureValue.toLocaleString("en-IN")}</strong>
            </div>

            <div className="result">
              <span>Wealth Gained</span>
              <strong>₹ {gain.toLocaleString("en-IN")}</strong>
            </div>
          </section>

          <section className="card">
            <h3 style={{ marginBottom: "14px" }}>SIP Growth</h3>
            <div className="sip-chart">
              <SipChart
                monthly={monthly}
                rate={rate}
                years={years}
                dark={dark}
              />
            </div>
          </section>

        </section>

        <section className="card">
          <h2 style={{ marginBottom: "16px" }}>Fund Researcher</h2>

          <div className="fund-search-shell">
            <input
              type="text"
              placeholder="Search ICICI Prudential, HDFC, SBI..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedFund(null);
              }}
              className="fund-search"
            />

            {search && (
              <button
                className="clear-search"
                onClick={() => {
                  setSearch("");
                  setResults([]);
                  setSelectedFund(null);
                }}
                aria-label="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>



          {loadingFunds && <p style={{ marginTop: "10px" }}>Loading funds...</p>}

          {results.map((fund) => (
            <div
              key={fund.schemeCode}
              className="fund-item"
              onClick={async () => {
                const details = await fetchFundDetails(fund.schemeCode);
                setSelectedFund(details);
                setSearch(fund.schemeName); // show selected fund name
                setResults([]);             // hide dropdown
              }}

            >
              {fund.schemeName}
            </div>
          ))}

        </section>

        {selectedFund && (
          <section className="card">
            <h3>{selectedFund.meta.scheme_name}</h3>
            <p style={{ opacity: 0.7 }}>
              {selectedFund.meta.fund_house}
            </p>

            <div className="result" style={{ marginTop: "12px" }}>
              <span>Latest NAV</span>
              <strong>₹ {selectedFund.data[0].nav}</strong>
            </div>

            <div className="result">
              <span>NAV Date</span>
              <strong>{selectedFund.data[0].date}</strong>
            </div>
            <div className="nav-chart">
              <NavChart data={histData.slice(-180)} dark={dark} />

            </div>
          </section>
        )}


        {performance && (
          <section className="card">
            <h3 style={{ marginBottom: "16px" }}>Performance</h3>

            <div className="performance-list">
              {performance.map(p => (
                <div key={p.label} className="performance-row">
                  <span>{p.label}</span>
                  <span
                    className={
                      p.value === null
                        ? "neutral"
                        : p.value >= 0
                          ? "positive"
                          : "negative"
                    }
                  >
                    {p.value !== null && (p.value >= 0 ? "▲ " : "▼ ")}
                    {p.value === null ? "--" : `${p.value.toFixed(2)}%`}
                  </span>
                </div>
              ))}
            </div>

            <p className="performance-note">
              Past performance is not indicative of future returns.
            </p>
          </section>
        )}





        <section className="card whatsapp-card">
          <h2>Speak With Us</h2>
          <p>
            Have questions about SIPs or mutual funds?
            Chat directly with us on WhatsApp.
          </p>

          <a
            href="https://wa.me/918478999888"
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-big-btn"
          >
            Chat on WhatsApp
          </a>
        </section>


      </main>

      <footer className="footer">
        © {new Date().getFullYear()} Matecap Wealth | contact@matecapwealth.com

        <div className="footer-trust">
          AMFI Registered Mutual Fund Distributor &nbsp;|&nbsp; ARN – 344831
        </div>

      </footer>
    </div>
  );
}

export default App;
