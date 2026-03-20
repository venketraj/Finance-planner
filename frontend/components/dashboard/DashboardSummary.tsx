"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardOverview } from "@/lib/queries/useDashboard";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Wallet, TrendingUp, Target, PiggyBank, AlertCircle } from "lucide-react";
import Link from "next/link";

export function DashboardSummary() {
  const { data, isLoading } = useDashboardOverview();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-16 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const noIncome = !data || data.monthly_income === 0;
  const savings  = (data?.monthly_income ?? 0) - (data?.monthly_expenses ?? 0);

  const metrics = [
    {
      title: "Net Worth",
      value: formatCurrency(data?.net_worth ?? 0),
      icon: Wallet,
      sub: null,
    },
    {
      title: "Monthly Savings",
      value: noIncome ? "—" : formatCurrency(savings),
      icon: PiggyBank,
      sub: noIncome ? "Set income in Settings" : null,
    },
    {
      title: "FIRE Progress",
      value: noIncome ? "—" : formatPercent(data?.fire_progress_pct ?? 0),
      icon: Target,
      sub: noIncome ? "Set income & age in Settings" : null,
    },
    {
      title: "Savings Rate",
      value: noIncome ? "—" : formatPercent(data?.savings_rate ?? 0),
      icon: TrendingUp,
      sub: noIncome ? "Set income in Settings" : null,
    },
  ];

  return (
    <>
      {noIncome && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Savings rate and FIRE progress show after you set your income & expenses in{" "}
            <Link href="/protected/settings" className="font-medium underline underline-offset-2">Settings</Link>.
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.title}
              </CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{m.value}</div>
              {m.sub && (
                <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
