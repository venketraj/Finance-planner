"use client";

import { useState } from "react";
import { useDebts, useCreateDebt } from "@/lib/queries/useDebts";
import type { Debt } from "@/lib/types";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function DebtCard({ debt }: { debt: Debt }) {
  const paid = debt.principal - debt.outstanding_balance;
  const pct = Math.min(100, Math.round((paid / debt.principal) * 100));

  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">{debt.name}</h3>
          <p className="text-xs text-muted-foreground">{debt.interest_rate}% p.a.</p>
        </div>
        <span className="text-sm font-medium text-destructive">{formatCurrency(debt.outstanding_balance)}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Repaid {pct}%</span>
          <span>of {formatCurrency(debt.principal)}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      {debt.emi_amount && (
        <p className="text-xs text-muted-foreground">EMI: {formatCurrency(debt.emi_amount)} / month</p>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  principal: "",
  outstanding_balance: "",
  interest_rate: "",
  emi_amount: "",
  start_date: "",
  end_date: "",
};

export default function DebtsPage() {
  const { data: debts, isLoading } = useDebts();
  const createDebt = useCreateDebt();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    try {
      await createDebt.mutateAsync({
        name: form.name,
        principal: parseFloat(form.principal),
        outstanding_balance: parseFloat(form.outstanding_balance),
        interest_rate: parseFloat(form.interest_rate),
        emi_amount: form.emi_amount ? parseFloat(form.emi_amount) : undefined,
        start_date: form.start_date,
        end_date: form.end_date || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add debt");
    }
  }

  const totalDebt = debts?.reduce((s, d) => s + d.outstanding_balance, 0) ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debts</h1>
          {!isLoading && debts && (
            <p className="text-sm text-muted-foreground mt-1">
              {debts.length} active debt{debts.length !== 1 ? "s" : ""} · Total outstanding: {formatCurrency(totalDebt)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? "Cancel" : "+ Add Debt"}
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">New Debt</h2>
          {formError && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{formError}</div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Debt Name</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Home Loan" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Principal Amount (₹)</label>
              <input name="principal" type="number" min="1" step="any" value={form.principal} onChange={handleChange} required placeholder="500000" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Outstanding Balance (₹)</label>
              <input name="outstanding_balance" type="number" min="1" step="any" value={form.outstanding_balance} onChange={handleChange} required placeholder="350000" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Interest Rate (% p.a.)</label>
              <input name="interest_rate" type="number" min="0" step="any" value={form.interest_rate} onChange={handleChange} required placeholder="8.5" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">EMI Amount (₹) <span className="text-muted-foreground">(optional)</span></label>
              <input name="emi_amount" type="number" min="1" step="any" value={form.emi_amount} onChange={handleChange} placeholder="15000" className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Start Date</label>
              <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">End Date <span className="text-muted-foreground">(optional)</span></label>
              <input name="end_date" type="date" value={form.end_date} onChange={handleChange} className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={createDebt.isPending} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {createDebt.isPending ? "Saving..." : "Save Debt"}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading debts...</p>
      ) : debts && debts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {debts.map((debt) => <DebtCard key={debt.id} debt={debt} />)}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-muted-foreground">No debts added yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Click &quot;+ Add Debt&quot; to track a loan or credit card.</p>
        </div>
      )}
    </div>
  );
}
