# Finance Planner

A full-stack personal finance and FIRE (Financial Independence, Retire Early) planning application built for the Indian market. Track investments, debts, expenses, and project your path to financial independence.

---

## Features

### Core Financial Tracking
- **Portfolio Holdings** — Stocks, mutual funds, LIC, PPF, NPS, FDs, bonds via manual entry or PDF/Excel bulk import
- **Transactions** — Income, expenses, debt payments, investments with category tracking and recurring support
- **Debt Management** — Track loans with outstanding balance, EMI, interest rate; 30-year amortization forecast
- **Net Worth** — Aggregated across all assets with historical snapshots for trend charting

### FIRE Projection Engine
- Inflation-adjusted future expense calculation using real (inflation-adjusted) returns
- Year-by-year corpus growth + debt paydown projection
- Computes FIRE number, years to financial independence, and monthly savings required
- What-if scenario simulation with fully custom parameters

### Alerts System
| Alert Type | Description |
|---|---|
| SIP Reminder | Notify on scheduled SIP payment day |
| EMI Reminder | Notify on loan payment day |
| Rebalance | Trigger when portfolio drifts beyond target allocation |
| Budget | Warn when spending exceeds monthly category limit |
| FIRE Milestone | Celebrate reaching 25/50/75/100% of FIRE corpus |
| Price Target | Alert when a stock crosses above/below your target price |

### Market Data (No API Key Required)
- Live stock/MF quotes via **yfinance** (free, no key needed)
- Full fundamentals: P/E, P/B, ROE, EPS, margins, debt ratios, dividend yield
- **Stock Screener** — filter large-cap universe by multiple fundamental criteria
- **Watchlist** — track instruments with live price updates

### Imports & Exports
- **PDF Import** — CDSL BO statements (stocks), CAMS/KFintech CAS (mutual funds), generic schemes
- **Excel Import** — Bulk holding import with flexible column mapping (.xlsx, .xls, .csv)
- **CSV Export** — Download holdings and transactions by type
- **JSON Backup** — Full user data export

### Other
- **Family Mode** — Track separate portfolios for spouse/family members, view combined net worth
- **AI Summaries (Optional)** — Paste your Groq API key in Settings for AI-generated stock analyst summaries (stored in browser only, never sent to backend)
- **PWA** — Installable as a web app with offline support
- **Dark Mode** — Full light/dark theme support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI 0.115+, Python 3.11+ |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Market Data | yfinance (free Yahoo Finance) |
| File Parsing | pdfplumber (PDF), openpyxl (Excel) |
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| State/Cache | TanStack React Query 5 |
| Charts | Recharts |
| Auth | Supabase SSR |

---

## Project Structure

```
finance_planner/
├── backend/
│   ├── app/
│   │   ├── main.py                  # App entry point, router registration
│   │   ├── config.py                # Settings via environment variables
│   │   ├── dependencies.py          # Auth & DB injection
│   │   ├── db/
│   │   │   ├── queries.py           # Async query helpers
│   │   │   └── supabase_client.py
│   │   ├── routers/                 # 14 API routers (see Endpoints section)
│   │   ├── services/
│   │   │   ├── fire_calculator.py   # FIRE projection engine
│   │   │   └── net_worth.py
│   │   └── scheduler/               # Background jobs
│   ├── migrations/                  # 8 SQL migration files
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   │   ├── (auth)/                  # Login / Register
│   │   └── protected/               # 11 authenticated pages
│   ├── components/                  # 30+ React components
│   ├── lib/
│   │   ├── api.ts                   # Authenticated fetch wrapper
│   │   ├── queries/                 # React Query hooks
│   │   ├── types.ts
│   │   └── utils.ts
│   └── package.json
└── README.md
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | User financial profile (income, expenses, age, FIRE targets) |
| `transactions` | Income/expense/investment records |
| `portfolio_holdings` | Unified stocks & MF holdings (Excel import flow) |
| `stocks` | CDSL BO statement data |
| `mutual_funds` | CAMS/KFintech CAS statement data |
| `other_schemes` | LIC, PPF, NPS, bonds, FDs |
| `debts` | Loans with outstanding balance, EMI, interest rate |
| `alerts_config` | Alert rules (all types) |
| `family_members` | Multi-user family mode |
| `watchlist` | Saved instruments |
| `net_worth_snapshots` | Historical net worth for trend chart |
| `portfolio_import_snapshots` | Import history |

All tables have **Row-Level Security** enabled — users can only access their own data.

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/signup` | Register |
| POST | `/signin` | Login, returns tokens |
| POST | `/signout` | Logout |
| GET | `/me` | Current user info |

### Profiles — `/api/profiles`
| Method | Path | Description |
|---|---|---|
| GET | `/` | Fetch profile |
| PUT | `/` | Update profile |

### Transactions — `/api/transactions`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List with filters (type, category, date, pagination) |
| POST | `/` | Create transaction |
| DELETE | `/{id}` | Delete |
| GET | `/summary` | Spending by category for N months |

### Holdings — `/api/holdings`
| Method | Path | Description |
|---|---|---|
| GET | `/stocks` | List stock holdings |
| GET | `/mutual-funds` | List MF holdings |
| GET | `/other-schemes` | List LIC/PPF/NPS/FD holdings |
| POST | `/manual` | Add single holding |
| POST | `/import-excel` | Bulk import from file |
| POST | `/import-pdf/preview` | Parse PDF, return preview |
| POST | `/import-pdf/confirm` | Save PDF-parsed holdings |

### Debts — `/api/debts`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List debts |
| POST | `/` | Create debt |
| PATCH | `/{id}` | Update balance/EMI |

### Dashboard — `/api/dashboard`
| Method | Path | Description |
|---|---|---|
| GET | `/overview` | KPIs: net worth, savings rate, FIRE progress % |
| GET | `/net-worth-history` | Historical snapshots for chart |
| GET | `/debt-paydown` | 30-year amortization schedule |

### FIRE — `/api/fire`
| Method | Path | Description |
|---|---|---|
| GET | `/projection` | Compute FIRE projection from real data |
| POST | `/simulate` | What-if scenario with custom params |

### Market — `/api/market`
| Method | Path | Description |
|---|---|---|
| GET | `/quote/{symbol}` | Full fundamentals via yfinance |
| GET | `/price/{symbol}` | Current price only |
| POST | `/screener` | Filter symbols by fundamental criteria (max 30) |

### Alerts — `/api/alerts`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List alert configs |
| POST | `/` | Create alert |
| PATCH | `/{id}` | Update alert |
| DELETE | `/{id}` | Delete alert |
| GET | `/evaluate` | Evaluate all enabled alerts |

### Watchlist — `/api/watchlist`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List watchlist |
| POST | `/` | Add symbol |
| DELETE | `/{symbol}` | Remove symbol |

### Export — `/api/export`
| Method | Path | Description |
|---|---|---|
| GET | `/stocks.csv` | Export stocks |
| GET | `/mutual-funds.csv` | Export MFs |
| GET | `/transactions.csv` | Export transactions |
| GET | `/backup.json` | Full JSON backup |

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & configure environment

Copy `.env` (or create one at the project root):

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Run database migrations

In your **Supabase SQL Editor**, run each migration file in order:

```
backend/migrations/001_initial_schema.sql
backend/migrations/002_add_lic_govscheme_asset_types.sql
backend/migrations/003_separate_holdings_tables.sql
backend/migrations/004_portfolio_import_snapshots.sql
backend/migrations/005_alerts_config.sql
backend/migrations/006_family_members.sql
backend/migrations/007_portfolio_holdings_unified.sql
backend/migrations/008_watchlist_price_alerts.sql
```

### 3. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Excel Import Format

The bulk import endpoint accepts `.xlsx`, `.xls`, or `.csv` files. Column order is flexible; headers are matched case-insensitively.

| Column | Required | Notes |
|---|---|---|
| Asset Type | Yes | `Stock`, `Mutual Fund` |
| Investment | Yes | Name of stock or scheme |
| Investment Code | No | ISIN, FOLIO, or ticker |
| Asset Class | No | e.g. Equity, Debt |
| Category | No | e.g. Large Cap |
| AMC Name | No | For mutual funds |
| MF Direct/Regular | No | Direct / Regular |
| Expense Ratio | No | Annual % |
| Broker | No | Broker name |
| Investment Date | No | YYYY-MM-DD or DD-MM-YYYY |
| Total Units | No | |
| Invested Amount | Yes | Cost basis in INR |
| Market Value | Yes | Current value in INR |
| Holding (%) | No | % of portfolio |
| Total Gain/Loss (INR) | No | Auto-derived if missing |
| Total Gain/Loss (%) | No | Auto-derived if missing |
| XIRR (%) | No | Annualised return |

---

## AI Assistant (Optional)

The Search page can generate a 3-sentence analyst summary for any stock using Groq's free LLM API (`llama-3.3-70b-versatile`).

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Paste it in **Settings → AI Assistant**

The key is stored in your browser's `localStorage` only. It is never sent to the backend.

---

## FIRE Calculator

The FIRE projection uses the following inputs, most of which are auto-populated from your profile and holdings:

| Input | Source |
|---|---|
| Current Age | Settings → Profile |
| Target Retirement Age | Settings → Profile |
| Life Expectancy | Settings → Profile |
| Monthly Income | Settings → Profile |
| Monthly Expenses | Settings → Profile |
| Monthly EMIs | Sum of active debts |
| Current Portfolio Value | Sum of all holdings |
| Total Debt | Sum of active loans |
| Expected Return | Settings → Profile (default 12%) |
| Inflation | Settings → Profile (default 6%) |
| Safe Withdrawal Rate | Settings → Profile (default 4%) |

**Monthly investable surplus** = Income − Expenses − EMIs (no separate "monthly investment" field needed).

**FIRE Number** = Annual Expenses at Retirement ÷ SWR

---

## Defaults (India-focused)

| Parameter | Default | Notes |
|---|---|---|
| Expected Portfolio Return | 12% | Typical for India equity long-term |
| Inflation | 6% | India CPI average |
| Safe Withdrawal Rate | 4% | Classic Trinity Study rule; 3–3.5% recommended for India |
| Retirement Age | 50 | Configurable |
| Life Expectancy | 85 | Configurable |

---

## Notes

- **Debt balances** do not update automatically month-on-month. Update outstanding balances manually in the Debts section after making payments.
- **Net Worth chart** updates automatically after each Excel import or manual holding add.
- **yfinance** uses Yahoo Finance data which may have a 15–20 minute delay for Indian markets (NSE symbols need `.NS` suffix, BSE need `.BO`).
- The screener fetches data for up to 30 symbols per request concurrently.
