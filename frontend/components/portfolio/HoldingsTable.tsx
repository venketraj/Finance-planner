"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useStockHoldings,
  useMutualFundHoldings,
  useOtherSchemeHoldings,
} from "@/lib/queries/useHoldings";
import { formatCurrency, formatCurrencyExact } from "@/lib/utils";
import type { PortfolioHolding, OtherSchemeHolding } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2) {
  if (n == null) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function GainCell({ value, pct }: { value: number | null; pct: number | null }) {
  const color =
    (value ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  return (
    <td className="py-2.5 pr-3 text-right whitespace-nowrap">
      {value != null ? (
        <>
          <span className={`block tabular-nums font-medium text-xs ${color}`}>
            {(value ?? 0) >= 0 ? "▲" : "▼"} ₹{fmt(Math.abs(value))}
          </span>
          {pct != null && (
            <span className={`block tabular-nums text-xs ${color}`}>{fmt(pct)}%</span>
          )}
        </>
      ) : "—"}
    </td>
  );
}

function TotalBar({
  invested,
  market,
  gain,
  hasNoCostBasis,
}: {
  invested: number;
  market: number;
  gain: number;
  hasNoCostBasis?: boolean;
}) {
  const gainColor = gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
  return (
    <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        Invested:{" "}
        {hasNoCostBasis
          ? <span className="font-semibold text-muted-foreground italic">N/A (no cost basis)</span>
          : <span className="font-semibold text-foreground">{formatCurrency(invested)}</span>
        }
      </span>
      <span className="text-muted-foreground">
        Market Value: <span className="font-semibold text-foreground">{formatCurrency(market)}</span>
      </span>
      {!hasNoCostBasis && invested > 0 && (
        <span className="text-muted-foreground">
          Total Gain:{" "}
          <span className={`font-semibold ${gainColor}`}>
            {gain >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(gain))}
            {" "}({fmt(((market - invested) / invested) * 100)}%)
          </span>
        </span>
      )}
    </div>
  );
}

// ── Stocks Table ──────────────────────────────────────────────────────────────

function StocksTable({ rows }: { rows: PortfolioHolding[] }) {
  const totalMarket  = rows.reduce((s, r) => s + (r.market_value ?? 0), 0);

  // A row has no cost basis when invested_amount is 0 and gain is also null/0
  const noCostBasis  = (r: PortfolioHolding) => !r.invested_amount || r.invested_amount === 0;
  const allNoCost    = rows.every(noCostBasis);
  const totalInvested = allNoCost ? 0 : rows.reduce((s, r) => s + (r.invested_amount ?? 0), 0);
  const totalGainINR  = allNoCost ? 0 : rows.reduce((s, r) => s + (r.total_gain_inr ?? 0), 0);

  return (
    <div>
      <TotalBar
        invested={totalInvested}
        market={totalMarket}
        gain={totalGainINR}
        hasNoCostBasis={allNoCost}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Asset Type</th>
              <th className="pb-2 pr-3 font-medium">Asset Class</th>
              <th className="pb-2 pr-3 font-medium">Category</th>
              <th className="pb-2 pr-3 font-medium">Investment</th>
              <th className="pb-2 pr-3 font-medium">Broker</th>
              <th className="pb-2 pr-3 font-medium whitespace-nowrap">Inv. Date</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Total Units</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Invested Amt</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Market Value</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Holding %</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Gain/Loss</th>
              <th className="pb-2 text-right font-medium">XIRR %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const noCost = noCostBasis(r);
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-3">
                    <span className="rounded-sm bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                      Stock
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{r.asset_class ?? "—"}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">{r.category ?? "—"}</td>
                  <td className="py-2.5 pr-3 max-w-[220px]">
                    <span className="block truncate font-medium" title={r.investment}>{r.investment}</span>
                    {r.investment_code && (
                      <span className="block font-mono text-xs text-muted-foreground">{r.investment_code}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                    {r.broker ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                    {r.investment_date ?? "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                    {r.total_units != null ? fmt(r.total_units, 4) : "—"}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-xs text-muted-foreground italic">
                    {noCost ? "N/A" : formatCurrencyExact(r.invested_amount)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-xs font-medium">
                    {formatCurrencyExact(r.market_value)}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                    {r.holding_pct != null ? `${fmt(r.holding_pct)}%` : "—"}
                  </td>
                  {noCost
                    ? <td className="py-2.5 pr-3 text-right text-xs text-muted-foreground italic">N/A</td>
                    : <GainCell value={r.total_gain_inr ?? null} pct={r.total_gain_pct ?? null} />
                  }
                  <td className="py-2.5 text-right tabular-nums text-xs">
                    {r.xirr_pct != null ? `${fmt(r.xirr_pct)}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Mutual Funds Table ────────────────────────────────────────────────────────

function MutualFundsTable({ rows }: { rows: PortfolioHolding[] }) {
  const totalInvested = rows.reduce((s, r) => s + (r.invested_amount ?? 0), 0);
  const totalMarket   = rows.reduce((s, r) => s + (r.market_value ?? 0), 0);
  const totalGainINR  = rows.reduce((s, r) => s + (r.total_gain_inr ?? 0), 0);

  return (
    <div>
      <TotalBar invested={totalInvested} market={totalMarket} gain={totalGainINR} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1300px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Asset Type</th>
              <th className="pb-2 pr-3 font-medium">Asset Class</th>
              <th className="pb-2 pr-3 font-medium">Category</th>
              <th className="pb-2 pr-3 font-medium">Investment</th>
              <th className="pb-2 pr-3 font-medium">AMC Name</th>
              <th className="pb-2 pr-3 font-medium whitespace-nowrap">Direct/Regular</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Exp. Ratio</th>
              <th className="pb-2 pr-3 font-medium">Broker</th>
              <th className="pb-2 pr-3 font-medium whitespace-nowrap">Inv. Date</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Total Units</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Invested Amt</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Market Value</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Holding %</th>
              <th className="pb-2 pr-3 text-right font-medium whitespace-nowrap">Gain/Loss</th>
              <th className="pb-2 text-right font-medium">XIRR %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-2.5 pr-3">
                  <span className="rounded-sm bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
                    MF
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground">{r.asset_class ?? "—"}</td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground">{r.category ?? "—"}</td>
                <td className="py-2.5 pr-3 max-w-[240px]">
                  <span className="block truncate font-medium" title={r.investment}>{r.investment}</span>
                  {r.investment_code && (
                    <span className="block font-mono text-xs text-muted-foreground">{r.investment_code}</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                  {r.amc_name ?? "—"}
                </td>
                <td className="py-2.5 pr-3 text-xs whitespace-nowrap">
                  {r.mf_type ? (
                    <span className={`rounded-sm px-1.5 py-0.5 text-xs font-medium ${
                      r.mf_type.toLowerCase() === "direct"
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                    }`}>
                      {r.mf_type}
                    </span>
                  ) : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                  {r.expense_ratio != null ? `${fmt(r.expense_ratio, 2)}%` : "—"}
                </td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                  {r.broker ?? "—"}
                </td>
                <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                  {r.investment_date ?? "—"}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                  {r.total_units != null ? fmt(r.total_units, 4) : "—"}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                  {formatCurrencyExact(r.invested_amount)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-xs font-medium">
                  {formatCurrencyExact(r.market_value)}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-xs">
                  {r.holding_pct != null ? `${fmt(r.holding_pct)}%` : "—"}
                </td>
                <GainCell value={r.total_gain_inr ?? null} pct={r.total_gain_pct ?? null} />
                <td className="py-2.5 text-right tabular-nums text-xs">
                  {r.xirr_pct != null ? `${fmt(r.xirr_pct)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Other Schemes Table (untouched layout) ────────────────────────────────────

function OtherSchemesTable({ rows }: { rows: OtherSchemeHolding[] }) {
  const totalMarket = rows.reduce((s, r) => s + r.market_value, 0);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total Value (INR)</span>
        <span className="font-semibold">{formatCurrency(totalMarket)}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Account / Policy ID</th>
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 text-right font-medium">Units / Premiums</th>
              <th className="pb-2 pr-4 text-right font-medium">Per Unit Value</th>
              <th className="pb-2 pr-4 text-right font-medium">Start Date</th>
              <th className="pb-2 pr-4 text-right font-medium">Cost Value (INR)</th>
              <th className="pb-2 text-right font-medium">Current Value (INR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cost = r.cost_value ?? 0;
              const val  = r.market_value ?? 0;
              const pct  = cost > 0 ? ((val - cost) / cost) * 100 : 0;
              const gainColor = pct >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400";
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-4">
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium uppercase">
                      {r.scheme_type}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {r.account_id}
                  </td>
                  <td className="py-2.5 pr-4 font-medium max-w-[220px]">
                    <span className="block truncate" title={r.name}>{r.name}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{r.units.toFixed(0)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatCurrencyExact(r.unit_value)}</td>
                  <td className="py-2.5 pr-4 text-right text-xs text-muted-foreground whitespace-nowrap">
                    {r.start_date}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                    {formatCurrencyExact(cost)}
                  </td>
                  <td className="py-2.5 text-right">
                    <span className="block tabular-nums font-medium">{formatCurrencyExact(val)}</span>
                    {cost > 0 && (
                      <span className={`block text-xs tabular-nums ${gainColor}`}>
                        {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TableSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function HoldingsTable() {
  const { data: stocks, isLoading: loadingStocks } = useStockHoldings();
  const { data: mfs,    isLoading: loadingMfs    } = useMutualFundHoldings();
  const { data: others, isLoading: loadingOthers } = useOtherSchemeHoldings();

  if (loadingStocks || loadingMfs || loadingOthers) {
    return (
      <div className="space-y-4">
        <TableSkeleton title="Stocks" />
        <TableSkeleton title="Mutual Funds" />
      </div>
    );
  }

  const hasStocks = stocks && stocks.length > 0;
  const hasMfs    = mfs    && mfs.length    > 0;
  const hasOthers = others && others.length > 0;

  if (!hasStocks && !hasMfs && !hasOthers) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No holdings yet. Upload an Excel file using the "Import Excel" button above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {hasStocks && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stocks ({stocks!.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <StocksTable rows={stocks!} />
          </CardContent>
        </Card>
      )}

      {hasMfs && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mutual Funds ({mfs!.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <MutualFundsTable rows={mfs!} />
          </CardContent>
        </Card>
      )}

      {hasOthers && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Other Schemes ({others!.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <OtherSchemesTable rows={others!} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
