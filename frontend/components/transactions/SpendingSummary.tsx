"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useTransactionSummary } from "@/lib/queries/useTransactions";

const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#8b5cf6","#14b8a6","#f97316","#64748b"];

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function SpendingSummary() {
  const [months, setMonths] = useState(1);
  const { data, isLoading } = useTransactionSummary(months);

  const categoryData = data
    ? Object.entries(data.by_category)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  const savings = (data?.total_income ?? 0) - (data?.total_expense ?? 0);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show last</span>
        {[1, 3, 6, 12].map((m) => (
          <button
            key={m}
            onClick={() => setMonths(m)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              months === m
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-muted"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
      ) : !data || categoryData.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No transactions in this period.</p>
      ) : (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 p-3">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="mt-1 font-semibold text-green-600">{fmtFull(data.total_income)}</p>
            </div>
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="mt-1 font-semibold text-red-600">{fmtFull(data.total_expense)}</p>
            </div>
            <div className={`rounded-md p-3 ${savings >= 0 ? "bg-blue-50 dark:bg-blue-950/30" : "bg-orange-50 dark:bg-orange-950/30"}`}>
              <p className="text-xs text-muted-foreground">Net Savings</p>
              <p className={`mt-1 font-semibold ${savings >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                {fmtFull(savings)}
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip formatter={(v: number) => fmtFull(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Category table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">% of Expenses</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((row, i) => (
                  <tr key={row.name} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {row.name}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">{fmtFull(row.value)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {data.total_expense > 0 ? `${((row.value / data.total_expense) * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
