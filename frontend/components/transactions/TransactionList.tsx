"use client";

import { useState } from "react";
import { useTransactions, useDeleteTransaction } from "@/lib/queries/useTransactions";
import { format, parseISO } from "date-fns";
import type { Transaction } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  income: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
  debt_payment: "bg-orange-100 text-orange-700",
  investment: "bg-blue-100 text-blue-700",
  transfer: "bg-gray-100 text-gray-600",
};

function fmtAmt(t: Transaction) {
  const sign = t.type === "income" ? "+" : "-";
  return `${sign}₹${Number(t.amount).toLocaleString("en-IN")}`;
}

const PAGE_SIZE = 20;

interface Props {
  recurringOnly?: boolean;
}

export function TransactionList({ recurringOnly = false }: Props) {
  const [typeFilter, setTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);

  const filters = {
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data: allTxns, isLoading } = useTransactions(filters);
  const deleteT = useDeleteTransaction();

  const txns = recurringOnly
    ? (allTxns ?? []).filter((t) => t.is_recurring)
    : allTxns ?? [];

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await deleteT.mutateAsync(id);
  }

  return (
    <div className="space-y-3">
      {/* Filters — hide for recurring view */}
      {!recurringOnly && (
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Types</option>
            {["expense", "income", "debt_payment", "investment", "transfer"].map((t) => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {(typeFilter || startDate || endDate) && (
            <button
              onClick={() => { setTypeFilter(""); setStartDate(""); setEndDate(""); setPage(0); }}
              className="text-sm text-muted-foreground underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      ) : txns.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {recurringOnly ? "No recurring transactions." : "No transactions found."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  {recurringOnly && <th className="px-4 py-2 text-left font-medium text-muted-foreground">Interval</th>}
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground">
                      {format(parseISO(t.transaction_date), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[t.type] ?? "bg-muted"}`}>
                        {t.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium">{t.category}</td>
                    <td className="px-4 py-2 text-muted-foreground">{t.description ?? "—"}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {fmtAmt(t)}
                    </td>
                    {recurringOnly && (
                      <td className="px-4 py-2 text-muted-foreground">{t.recurrence_interval ?? "—"}</td>
                    )}
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deleteT.isPending}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!recurringOnly && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + txns.length}</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-muted"
                >
                  Prev
                </button>
                <button
                  disabled={txns.length < PAGE_SIZE}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-muted"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
