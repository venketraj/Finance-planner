"use client";

import { useState } from "react";
import { useCreateTransaction } from "@/lib/queries/useTransactions";

const TYPES = ["expense", "income", "debt_payment", "investment", "transfer"] as const;
const INTERVALS = ["monthly", "quarterly", "yearly"] as const;

const today = () => new Date().toISOString().split("T")[0];

const EMPTY = {
  type: "expense" as string,
  category: "",
  amount: "",
  description: "",
  transaction_date: today(),
  is_recurring: false,
  recurrence_interval: "" as string,
  debt_name: "",
};

interface Props {
  onSuccess?: () => void;
}

export function AddTransactionForm({ onSuccess }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const create = useCreateTransaction();

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await create.mutateAsync({
        type: form.type as "expense" | "income" | "debt_payment" | "investment" | "transfer",
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || undefined,
        transaction_date: form.transaction_date,
        is_recurring: form.is_recurring,
        recurrence_interval: form.is_recurring && form.recurrence_interval
          ? (form.recurrence_interval as "monthly" | "quarterly" | "yearly")
          : undefined,
        debt_name: form.type === "debt_payment" && form.debt_name ? form.debt_name : undefined,
      } as never);
      setForm({ ...EMPTY, transaction_date: today() });
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Type */}
        <div className="sm:col-span-1">
          <label className="mb-1 block text-sm font-medium">Type</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="sm:col-span-1">
          <label className="mb-1 block text-sm font-medium">Category</label>
          <input
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            required
            placeholder="e.g. Groceries"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Amount */}
        <div className="sm:col-span-1">
          <label className="mb-1 block text-sm font-medium">Amount (₹)</label>
          <input
            type="number"
            min="0.01"
            step="any"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            required
            placeholder="0.00"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Date */}
        <div className="sm:col-span-1">
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            type="date"
            value={form.transaction_date}
            onChange={(e) => set("transaction_date", e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Description */}
        <div className="sm:col-span-1">
          <label className="mb-1 block text-sm font-medium">
            Description <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Notes..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Debt name — only for debt_payment */}
        {form.type === "debt_payment" && (
          <div className="sm:col-span-1">
            <label className="mb-1 block text-sm font-medium">Debt Name</label>
            <input
              value={form.debt_name}
              onChange={(e) => set("debt_name", e.target.value)}
              placeholder="e.g. Home Loan"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Recurring */}
        <div className="flex items-end gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={(e) => set("is_recurring", e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            Recurring
          </label>

          {form.is_recurring && (
            <select
              value={form.recurrence_interval}
              onChange={(e) => set("recurrence_interval", e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select interval</option>
              {INTERVALS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={create.isPending}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {create.isPending ? "Saving..." : "Save Transaction"}
      </button>
    </form>
  );
}
