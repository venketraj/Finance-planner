// Mirrors backend Pydantic models

export interface Profile {
  id: string;
  full_name: string | null;
  monthly_income: number;
  monthly_expenses: number;
  current_age: number | null;
  retirement_age: number;
  life_expectancy: number;
  safe_withdrawal_rate: number;
  expected_inflation: number;
  expected_return: number;
  fire_target_annual_expense: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: "expense" | "income" | "debt_payment" | "investment" | "transfer";
  category: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  is_recurring: boolean;
  recurrence_interval: string | null;
  debt_name: string | null;
  created_at: string;
}

// Unified portfolio holding — stocks and mutual funds from Excel import
export interface PortfolioHolding {
  id: string;
  user_id: string;
  asset_type: "stock" | "mutual_fund";
  asset_class: string | null;
  category: string | null;
  investment_code: string | null;
  investment: string;
  amc_name: string | null;
  mf_type: string | null;        // "Direct" | "Regular" | null
  expense_ratio: number | null;
  broker: string | null;
  investment_date: string | null;
  total_units: number | null;
  invested_amount: number;
  market_value: number;
  holding_pct: number | null;
  total_gain_inr: number | null;
  total_gain_pct: number | null;
  xirr_pct: number | null;
  imported_at: string;
}

// Keep these aliases so PortfolioStats / PortfolioAllocation still compile
export type StockHolding = PortfolioHolding & { asset_type: "stock" };
export type MutualFundHolding = PortfolioHolding & { asset_type: "mutual_fund" };

// Other scheme row — LIC / PPF / NPS / FD / Bonds… (untouched)
export interface OtherSchemeHolding {
  id: string;
  user_id: string;
  asset_type: "other_scheme";
  scheme_type: string;
  account_id: string;
  name: string;
  ticker: string;
  units: number;
  unit_value: number;
  cost_value: number;
  market_value: number;
  start_date: string;
  statement_date: string;
  notes: string | null;
  imported_at: string;
}

// Legacy shape kept for any remaining references
export interface Holding {
  id: string;
  user_id: string;
  asset_type: "stock" | "mutual_fund" | "lic" | "gov_scheme" | "other_scheme";
  ticker: string;
  name: string | null;
  folio: string | null;
  units: number;
  purchase_price: number;
  purchase_date: string;
  is_active: boolean;
  notes: string | null;
  current_price: number | null;
  current_value: number | null;
  gain_loss: number | null;
  gain_loss_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  principal: number;
  outstanding_balance: number;
  interest_rate: number;
  emi_amount: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  snapshot_date: string;
  total_investments: number;
  total_debt: number;
  net_worth: number;
  breakdown: Record<string, number>;
}

export interface DashboardOverview {
  net_worth: number;
  total_investments: number;
  total_debt: number;
  stocks_value: number;
  mutual_funds_value: number;
  monthly_income: number;
  monthly_expenses: number;
  savings_rate: number;
  fire_progress_pct: number;
}

export interface FireResult {
  fire_number: number;
  years_to_fire: number | null;
  fire_age: number | null;
  monthly_savings_needed: number;
  current_savings_rate: number;
  projected_corpus_at_retirement: number;
  is_fire_ready: boolean;
  inflation_adjusted_annual_expense: number;
  year_by_year: Array<{
    year: number;
    age: number;
    corpus: number;
    debt: number;
    net_worth: number;
    fire_target: number;
  }>;
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  stocks_value: number;
  mf_invested: number;
  mf_value: number;
  other_invested: number;
  other_value: number;
  total_gain: number;
  total_gain_pct: number;
  allocation: Record<string, number>;
  top_holdings: Array<{
    ticker: string;
    name: string;
    value: number;
    gain_pct: number;
  }>;
}

export interface DebtPaydown {
  debts: Array<{
    name: string;
    outstanding_balance: number;
    interest_rate: number;
    emi_amount: number;
  }>;
  schedule: Array<{
    month: string;
    outstanding: number;
    interest_paid: number;
  }>;
  total_interest: number;
  total_principal: number;
  payoff_date: string | null;
}
