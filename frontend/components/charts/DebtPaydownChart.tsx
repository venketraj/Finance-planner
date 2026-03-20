"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebtPaydown } from "@/lib/queries/useDashboard";
import { format, parseISO } from "date-fns";

function fmt(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DebtPaydownChart() {
  const { data, isLoading } = useDebtPaydown();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Debt Paydown</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const schedule = data?.schedule ?? [];

  if (schedule.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Debt Paydown</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No active debts — you&apos;re debt free!
          </div>
        </CardContent>
      </Card>
    );
  }

  // Thin out data points for readability (max ~36 points)
  const step = Math.max(1, Math.floor(schedule.length / 36));
  const chartData = schedule
    .filter((_, i) => i % step === 0 || i === schedule.length - 1)
    .map((s) => ({
      month: format(parseISO(s.month), "MMM yy"),
      outstanding: s.outstanding,
      interest: s.interest_paid,
    }));

  const payoffDate = data?.payoff_date
    ? format(parseISO(data.payoff_date), "MMM yyyy")
    : "N/A";

  const debts = data?.debts ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Debt Paydown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="mt-1 text-base font-semibold text-destructive">
              {fmtFull(data?.total_principal ?? 0)}
            </p>
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Total Interest Cost</p>
            <p className="mt-1 text-base font-semibold text-orange-500">
              {fmtFull(data?.total_interest ?? 0)}
            </p>
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Debt Free By</p>
            <p className="mt-1 text-base font-semibold text-green-600">{payoffDate}</p>
          </div>
        </div>

        {/* Per-debt breakdown */}
        <div className="space-y-2">
          {debts.map((d) => {
            const monthlyInterest = d.outstanding_balance * (d.interest_rate / 100 / 12);
            const principalPerMonth = d.emi_amount - monthlyInterest;
            return (
              <div key={d.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{d.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{d.interest_rate}% p.a.</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-destructive">{fmtFull(d.outstanding_balance)}</p>
                  {d.emi_amount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      EMI {fmtFull(d.emi_amount)}
                      {principalPerMonth > 0
                        ? ` · ${fmtFull(principalPerMonth)} to principal`
                        : " · interest only"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Paydown area chart */}
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradOutstanding" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
            <Tooltip
              formatter={(value: number, name: string) => [
                fmtFull(value),
                name === "outstanding" ? "Outstanding Balance" : "Cumulative Interest",
              ]}
            />
            <Area
              type="monotone"
              dataKey="outstanding"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#gradOutstanding)"
              name="outstanding"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
