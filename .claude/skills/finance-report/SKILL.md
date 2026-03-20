---
name: finance-report
description: Use when someone asks to generate a finance report, create a financial summary, show net worth summary, check FIRE progress, or review debt and portfolio status.
argument-hint: [optional: net-worth | portfolio | fire | debt]
---

## What This Skill Does

Generates a comprehensive personal finance report covering:
1. Net Worth Summary
2. Portfolio Analytics
3. FIRE Progress
4. Debt Paydown

The report is printed in plain text and saved to `reports/finance-report-YYYY-MM-DD.md`.

---

## Steps

### Step 1: Collect Financial Data

Ask the user to provide their financial data. Request all of the following in one message:

```
Please provide your financial data so I can generate your report. Share as much as you have:

NET WORTH:
- Cash & bank balances
- Investment values (stocks, mutual funds, LICs, govt schemes)
- Other assets (real estate, gold, etc.)
- Liabilities (loans, credit card balances, outstanding debts)

PORTFOLIO:
- Holdings list (asset name, type, invested amount, current value)
- Asset allocation targets (if any)

FIRE GOALS:
- Current age and target retirement age
- Monthly expenses (current and expected in retirement)
- Expected annual return rate (%)
- Inflation rate assumption (%)
- Current total savings/investments

DEBTS:
- Each debt: name, outstanding principal, interest rate (%), monthly EMI
- Any extra payments planned
```

If the user already provided some or all of this data earlier in the conversation, use that — do not re-ask for data already given.

### Step 2: Generate the Report

Using the data provided, produce a plain-text report with the four sections below. If data for a section is missing or incomplete, clearly note "Data not provided" for that section — never estimate or make up numbers.

---

**REPORT TEMPLATE:**

```
===============================================================
PERSONAL FINANCE REPORT
Generated: [current date]
===============================================================

--- NET WORTH SUMMARY ---

Total Assets:        ₹ [amount]
Total Liabilities:   ₹ [amount]
Net Worth:           ₹ [amount]

Breakdown:
  Cash & Bank:       ₹ [amount]
  Investments:       ₹ [amount]
  Other Assets:      ₹ [amount]
  Loans & Debts:     ₹ [amount]

[1-2 sentence plain-English summary of net worth health]


--- PORTFOLIO ANALYTICS ---

Total Invested:      ₹ [amount]
Current Value:       ₹ [amount]
Absolute Gain/Loss:  ₹ [amount] ([%])

Asset Allocation:
  Stocks:            [%] (₹ [amount])
  Mutual Funds:      [%] (₹ [amount])
  LIC / Insurance:   [%] (₹ [amount])
  Govt Schemes:      [%] (₹ [amount])
  Other:             [%] (₹ [amount])

Top Holdings:
  [Name] - ₹ [current value] (Gain: [%])
  ...

[1-2 sentence summary of portfolio composition and performance]


--- FIRE PROGRESS ---

Current Age:         [age]
Target Retirement:   [age] (in [N] years)
Monthly Expenses:    ₹ [current] → ₹ [retirement, inflation-adjusted]
FIRE Number:         ₹ [25x annual retirement expenses]
Current Savings:     ₹ [amount]
FIRE Progress:       [%] ([current savings] / [FIRE number])
Projected FIRE Date: [year] (at [return]% return, [inflation]% inflation)

[1-2 sentence plain-English assessment of FIRE timeline]


--- DEBT PAYDOWN ---

Total Outstanding:   ₹ [amount]
Total Monthly EMI:   ₹ [amount]

Debts:
  [Debt Name]
    Principal:       ₹ [amount]
    Interest Rate:   [%]
    Monthly EMI:     ₹ [amount]
    Est. Payoff:     [month/year]
  ...

[1-2 sentence summary of debt situation and recommended priority]

===============================================================
END OF REPORT
===============================================================
```

### Step 3: Save the Report

1. Determine today's date in YYYY-MM-DD format.
2. Create the `reports/` directory at the project root if it does not exist.
3. Save the report to `reports/finance-report-[YYYY-MM-DD].md`.
4. Tell the user the file was saved and its path.

---

## Notes

- Use Indian Rupee (₹) as the currency symbol throughout.
- FIRE Number calculation: `Annual Retirement Expenses × 25` (4% withdrawal rule).
- Projected FIRE Date: use the formula `years = log(FIRE_number / current_savings) / log(1 + real_return)` where `real_return = (1 + return_rate) / (1 + inflation_rate) - 1`.
- If return rate or inflation rate are not provided, default to 12% and 6% respectively and note the assumption in the report.
- Never fabricate numbers. If a data point is missing, write "Data not provided" for that line.
- Keep the report factual and concise — no financial advice, no recommendations beyond plain observations.
