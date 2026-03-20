"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolioSummary, usePortfolioImportHistory } from "@/lib/queries/usePortfolio";
import { TrendingUp, TrendingDown, Wallet, BarChart3, PieChart } from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

// ── Mini sparkline ──────────────────────────────────────────────────────────────
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 110, h = 32, pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + ((max - v) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const color = last >= prev ? "#22c55e" : "#ef4444";
  const [lx, ly] = pts[pts.length - 1].split(",");
  return (
    <svg width={w} height={h} className="opacity-80 shrink-0">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

// ── Stat row ────────────────────────────────────────────────────────────────────
function StatRow({
  icon,
  label,
  value,
  sub,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string | null;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-right">
        <span className="block text-sm font-semibold tabular-nums">{value}</span>
        {sub && (
          <span
            className={`block text-xs tabular-nums ${
              positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────────
export function PortfolioStats() {
  const { data, isLoading } = usePortfolioSummary();
  const { data: history }   = usePortfolioImportHistory();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portfolio Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Totals from summary
  const stocksVal    = data?.stocks_value    ?? 0;
  const mfInvested   = data?.mf_invested     ?? 0;
  const mfVal        = data?.mf_value        ?? 0;
  const otherInv     = data?.other_invested  ?? 0;
  const otherVal     = data?.other_value     ?? 0;
  const currentValue = data?.current_value   ?? 0;

  // "Invested" = MF cost + other cost (where CDSL gives no purchase price for stocks)
  const knownInvested = mfInvested + otherInv;
  const knownCurrent  = mfVal + otherVal;
  const gain          = knownCurrent - knownInvested;
  const gainPct       = knownInvested > 0 ? (gain / knownInvested) * 100 : 0;
  const isPositive    = gain >= 0;

  // Gain vs previous upload (from import history)
  const snapshots  = (history ?? []).slice().reverse(); // oldest → newest
  const sparkValues = snapshots.map((s) => s.total_value);
  let vsLastLabel: string | null = null;
  let vsLastPos = true;
  if (snapshots.length >= 2) {
    const prev    = snapshots[snapshots.length - 2].total_value;
    const curr    = snapshots[snapshots.length - 1].total_value;
    const diff    = curr - prev;
    const pct     = prev > 0 ? (diff / prev) * 100 : 0;
    vsLastPos     = diff >= 0;
    vsLastLabel   = `${diff >= 0 ? "+" : ""}${fmt(diff)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%) vs prev`;
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Portfolio Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Total portfolio value */}
        <StatRow
          icon={<BarChart3 className="h-4 w-4" />}
          label="Total Portfolio Value"
          value={fmt(currentValue)}
        />

        {/* Stocks (CDSL — no purchase cost) */}
        {stocksVal > 0 && (
          <StatRow
            icon={<PieChart className="h-3.5 w-3.5" />}
            label="Stocks (current)"
            value={fmt(stocksVal)}
            sub="CDSL — purchase cost unavailable"
            positive={true}
          />
        )}

        {/* MF + other invested vs current */}
        {knownInvested > 0 && (
          <>
            <StatRow
              icon={<Wallet className="h-4 w-4" />}
              label="MF + Schemes Invested"
              value={fmt(knownInvested)}
            />
            <StatRow
              icon={isPositive ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              label="MF + Schemes Gain/Loss"
              value={fmt(gain)}
              sub={`${isPositive ? "+" : ""}${gainPct.toFixed(2)}%`}
              positive={isPositive}
            />
          </>
        )}

        {/* Sparkline + vs prev upload */}
        {sparkValues.length >= 2 && (
          <div className="rounded-md bg-muted/30 px-3 py-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Growth trend</p>
              <Sparkline values={sparkValues} />
            </div>
            {vsLastLabel && (
              <p className={`text-xs tabular-nums text-right leading-tight ${vsLastPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {vsLastLabel}
              </p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-0.5">
          Values as of last imported PDF statement.
        </p>
      </CardContent>
    </Card>
  );
}
