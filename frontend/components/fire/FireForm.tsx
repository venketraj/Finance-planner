"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFireSimulate } from "@/lib/queries/useFire";
import { useDashboardOverview } from "@/lib/queries/useDashboard";
import { useProfile } from "@/lib/queries/useProfile";
import type { FireResult } from "@/lib/types";
import { Info } from "lucide-react";

interface FireFormProps {
  onResult: (result: FireResult) => void;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{children}</p>
  );
}

export function FireForm({ onResult }: FireFormProps) {
  const { data: overview } = useDashboardOverview();
  const { data: profile }  = useProfile();
  const simulate           = useFireSimulate();

  const [form, setForm] = useState({
    current_age:            "",
    retirement_age:         "50",
    life_expectancy:        "85",
    monthly_income:         "",
    monthly_expenses:       "",
    current_investments:    "",
    current_debt:           "",
    monthly_debt_payments:  "",
    avg_debt_interest_rate: "8.5",
    expected_return:        "12",
    expected_inflation:     "6",
    safe_withdrawal_rate:   "4",
  });

  // Auto-populate from real data when available
  useEffect(() => {
    if (!overview && !profile) return;
    setForm((prev) => ({
      ...prev,
      monthly_income:   overview?.monthly_income ? String(overview.monthly_income) : prev.monthly_income,
      monthly_expenses: overview?.monthly_expenses ? String(overview.monthly_expenses) : prev.monthly_expenses,
      current_investments: overview?.total_investments ? String(overview.total_investments) : prev.current_investments,
      current_debt:     overview?.total_debt ? String(overview.total_debt) : prev.current_debt,
      current_age:      profile?.current_age ? String(profile.current_age) : prev.current_age,
      retirement_age:   profile?.retirement_age ? String(profile.retirement_age) : prev.retirement_age,
      life_expectancy:  profile?.life_expectancy ? String(profile.life_expectancy) : prev.life_expectancy,
      expected_return:  profile?.expected_return ? String(Math.round(profile.expected_return * 100)) : prev.expected_return,
      expected_inflation: profile?.expected_inflation ? String(Math.round(profile.expected_inflation * 100)) : prev.expected_inflation,
      safe_withdrawal_rate: profile?.safe_withdrawal_rate ? String(profile.safe_withdrawal_rate * 100) : prev.safe_withdrawal_rate,
    }));
  }, [overview, profile]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await simulate.mutateAsync({
      current_age:            parseInt(form.current_age),
      retirement_age:         parseInt(form.retirement_age),
      life_expectancy:        parseInt(form.life_expectancy),
      monthly_income:         parseFloat(form.monthly_income) || 0,
      monthly_expenses:       parseFloat(form.monthly_expenses) || 0,
      current_investments:    parseFloat(form.current_investments) || 0,
      current_debt:           parseFloat(form.current_debt) || 0,
      monthly_debt_payments:  parseFloat(form.monthly_debt_payments) || 0,
      avg_debt_interest_rate: parseFloat(form.avg_debt_interest_rate) / 100,
      expected_return:        parseFloat(form.expected_return) / 100,
      expected_inflation:     parseFloat(form.expected_inflation) / 100,
      safe_withdrawal_rate:   parseFloat(form.safe_withdrawal_rate) / 100,
    });
    onResult(result);
  }

  // Compute monthly investable surplus as preview
  const income   = parseFloat(form.monthly_income)   || 0;
  const expenses = parseFloat(form.monthly_expenses)  || 0;
  const emi      = parseFloat(form.monthly_debt_payments) || 0;
  const surplus  = income - expenses - emi;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">FIRE Calculator Parameters</CardTitle>
        <p className="text-xs text-muted-foreground">
          Fields auto-filled from your portfolio & settings. Edit any value before calculating.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* ── Age ─────────────────────────────────────────────────────── */}
          <div>
            <label className="mb-1 block text-sm font-medium">Current Age</label>
            <Input name="current_age" type="number" value={form.current_age} onChange={handleChange} required placeholder="e.g. 30" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Target Retirement Age</label>
            <Input name="retirement_age" type="number" value={form.retirement_age} onChange={handleChange} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Life Expectancy</label>
            <Input name="life_expectancy" type="number" value={form.life_expectancy} onChange={handleChange} required />
          </div>

          {/* ── Income & Expenses ────────────────────────────────────────── */}
          <div>
            <label className="mb-1 block text-sm font-medium">Monthly Income (₹)</label>
            <Input name="monthly_income" type="number" value={form.monthly_income} onChange={handleChange} required placeholder="Total take-home pay" />
            <Tip>Your net monthly salary / business income after tax.</Tip>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Monthly Expenses (₹)</label>
            <Input name="monthly_expenses" type="number" value={form.monthly_expenses} onChange={handleChange} required placeholder="All living costs" />
            <Tip>Rent, food, utilities, insurance, subscriptions — everything except EMIs.</Tip>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Monthly EMI / Debt Payments (₹)</label>
            <Input name="monthly_debt_payments" type="number" value={form.monthly_debt_payments} onChange={handleChange} placeholder="Auto-filled from Debts section" />
            <Tip>Auto-filled from your debts. Total of all loan EMIs you pay each month.</Tip>
          </div>

          {/* ── Surplus preview ──────────────────────────────────────────── */}
          <div className="md:col-span-3">
            <div className="rounded-lg bg-muted/40 border px-4 py-2 flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Monthly investable surplus: </span>
                <strong className={surplus >= 0 ? "text-green-600" : "text-red-500"}>
                  ₹{surplus.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </strong>
                <span className="ml-2 text-xs text-muted-foreground">(Income − Expenses − EMIs)</span>
              </div>
              <div>
                <span className="text-muted-foreground">Savings rate: </span>
                <strong>{income > 0 ? ((surplus / income) * 100).toFixed(1) : "—"}%</strong>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              This surplus is what gets invested each month in the FIRE projection. To invest more, reduce expenses or pay off debts.
              You don't need to enter a separate "monthly investment" — it's automatically Income − Expenses − EMIs.
            </p>
          </div>

          {/* ── Current portfolio ────────────────────────────────────────── */}
          <div>
            <label className="mb-1 block text-sm font-medium">Current Portfolio Value (₹)</label>
            <Input name="current_investments" type="number" value={form.current_investments} onChange={handleChange} required />
            <Tip>Auto-filled from your portfolio holdings (stocks + MFs + other).</Tip>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Total Outstanding Debt (₹)</label>
            <Input name="current_debt" type="number" value={form.current_debt} onChange={handleChange} />
            <Tip>Auto-filled from Debts section. Sum of all outstanding loan balances.</Tip>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Avg Debt Interest Rate (%)</label>
            <Input name="avg_debt_interest_rate" type="number" step="0.1" value={form.avg_debt_interest_rate} onChange={handleChange} />
            <Tip>Weighted avg rate across all loans (home, car, personal).</Tip>
          </div>

          {/* ── Rates ────────────────────────────────────────────────────── */}
          <div>
            <label className="mb-1 block text-sm font-medium">Expected Portfolio Return (%)</label>
            <Input name="expected_return" type="number" step="0.1" value={form.expected_return} onChange={handleChange} required />
            <Tip>Long-term average annual return. 10–12% is typical for India equity.</Tip>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Expected Inflation (%)</label>
            <Input name="expected_inflation" type="number" step="0.1" value={form.expected_inflation} onChange={handleChange} required />
            <Tip>India CPI inflation average ~5–6%. Used to adjust future expenses.</Tip>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Safe Withdrawal Rate — SWR (%)</label>
            <Input name="safe_withdrawal_rate" type="number" step="0.1" value={form.safe_withdrawal_rate} onChange={handleChange} required />
            <Tip>
              SWR = % of corpus you withdraw yearly in retirement without running out of money.
              4% is the classic "4% Rule" (from Trinity Study). For India with higher inflation, 3–3.5% is safer.
            </Tip>
          </div>

          <div className="md:col-span-3 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
            <strong>What is SWR?</strong> The Safe Withdrawal Rate is the % of your retirement corpus you can safely spend each year without exhausting your savings over your remaining lifetime.
            At 4% SWR, a ₹3 Cr corpus → ₹12L/year spend (₹1L/month). Your FIRE Number = Annual Expenses ÷ SWR.
            Lower SWR = larger required corpus = more conservative. Use 3.5% for India.
          </div>

          <div className="md:col-span-3">
            <Button type="submit" disabled={simulate.isPending} className="w-full md:w-auto">
              {simulate.isPending ? "Calculating…" : "Calculate FIRE Projection"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
