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



  return (
    <div className={dark ? "app dark" : "app"}>
      <header className="header">
        <div className="logo">
          <img src="/logo.png" alt="Matecap Wealth" />
          <span>Matecap Wealth</span>
        </div>

        <button onClick={() => setDark(!dark)} className="toggle">
          {dark ? "Light" : "Dark"}
        </button>
      </header>


      <main className="main">
        <section className="hero hero-main">
          <h1>Build Wealth with Discipline & Clarity</h1>
          <p>
            Matecap Wealth helps you make informed investment decisions with
            transparent SIP planning and real-time mutual fund research.
          </p>

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

            <button
              className="secondary-btn"
              onClick={() =>
                document
                  .getElementById("contact-section")
                  .scrollIntoView({ behavior: "smooth" })
              }
            >
              Contact Us
            </button>
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

          <input
            type="text"
            placeholder="Search ICICI Prudential, HDFC, SBI..."
            value={search}
            disabled={!!selectedFund}
            onChange={(e) => setSearch(e.target.value)}
            className="fund-search"
          />


          {loadingFunds && <p style={{ marginTop: "10px" }}>Loading funds...</p>}

          {results.map((fund) => (
            <div
              key={fund.schemeCode}
              className="fund-item"
              onClick={async () => {
                const details = await fetchFundDetails(fund.schemeCode);
                setSelectedFund(details);
                setSearch(fund.schemeName);   // lock input to selected fund
                setResults([]);               // hide dropdown
              }}
            >
              {fund.schemeName}
            </div>
          ))}
          <button
            className="change-fund-btn"
            onClick={() => {
              setSelectedFund(null);
              setSearch("");
            }}
          >
            Change Fund
          </button>

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
              <NavChart data={selectedFund.data.slice(0, 180)} dark={dark} />
            </div>
          </section>
        )}

        <section id="contact-section" className="card contact-card">
          <h2>Get in Touch</h2>
          <p className="contact-sub">
            Have a query or want investment guidance? We’ll get back to you.
          </p>

          <div className="contact-form">
            <input type="text" placeholder="Your Name" />
            <input type="email" placeholder="Your Email" />
            <textarea placeholder="Your Message" rows="4" />
            <button className="primary-btn">Send Query</button>
          </div>
        </section>


      </main>

      <footer className="footer">
        © {new Date().getFullYear()} Matecap Wealth | contact@matecapwealth.com
      </footer>
    </div>
  );
}

export default App;
