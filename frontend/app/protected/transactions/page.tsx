"use client";

import { useState } from "react";
import { AddTransactionForm } from "@/components/transactions/AddTransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { SpendingSummary } from "@/components/transactions/SpendingSummary";

type Tab = "all" | "recurring" | "summary";

export default function TransactionsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? "Cancel" : "+ Add Transaction"}
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">New Transaction</h2>
          <AddTransactionForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {(["all", "summary", "recurring"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
              tab === t
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "all" ? "All Transactions" : t === "summary" ? "Spending Summary" : "Recurring"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-lg border bg-card p-6">
        {tab === "all" && <TransactionList />}
        {tab === "summary" && <SpendingSummary />}
        {tab === "recurring" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              These transactions are marked as recurring. They are not auto-created — add them manually each period.
            </p>
            <TransactionList recurringOnly />
          </div>
        )}
      </div>
    </div>
  );
}
