"use client";

import { useState } from "react";
import { Filter, Play, Trash2, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScreener } from "@/lib/queries/useMarket";
import type { StockQuote } from "@/lib/queries/useMarket";

function fmt(v: number | null | undefined, d = 2) {
  if (v == null) return "—";
  return v.toLocaleString("en-IN", { maximumFractionDigits: d });
}
function fmtPct(v: number | null | undefined) {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
function fmtCr(v: number | null | undefined) {
  if (v == null) return "—";
  const cr = v / 1e7;
  if (cr >= 1e5) return `${(cr / 1e5).toFixed(1)}L Cr`;
  if (cr >= 1e3) return `${(cr / 1e3).toFixed(1)}k Cr`;
  return `${cr.toFixed(0)} Cr`;
}

const PRESET_INDICES = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "HINDUNILVR.NS",
  "ICICIBANK.NS", "SBIN.NS", "BAJFINANCE.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
  "AXISBANK.NS", "LT.NS", "WIPRO.NS", "MARUTI.NS", "TITAN.NS",
  "SUNPHARMA.NS", "NTPC.NS", "POWERGRID.NS", "ULTRACEMCO.NS", "NESTLEIND.NS",
];

interface Filters {
  min_pe: string; max_pe: string;
  min_pb: string; max_pb: string;
  min_roe: string;
  max_debt_to_equity: string;
  min_market_cap: string; max_market_cap: string;
  min_eps: string;
  min_book_value: string;
  min_profit_margin: string;
}

const BLANK: Filters = {
  min_pe: "", max_pe: "",
  min_pb: "", max_pb: "",
  min_roe: "",
  max_debt_to_equity: "",
  min_market_cap: "", max_market_cap: "",
  min_eps: "",
  min_book_value: "",
  min_profit_margin: "",
};

function FilterRow({
  label, minKey, maxKey, step, placeholder, filters, onChange,
}: {
  label: string;
  minKey: keyof Filters;
  maxKey?: keyof Filters;
  step?: string;
  placeholder?: string;
  filters: Filters;
  onChange: (k: keyof Filters, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground col-span-1">{label}</span>
      <Input
        type="number"
        step={step ?? "0.01"}
        placeholder={`Min${placeholder ? ` (${placeholder})` : ""}`}
        value={filters[minKey]}
        onChange={(e) => onChange(minKey, e.target.value)}
        className="h-8 text-xs"
      />
      {maxKey ? (
        <Input
          type="number"
          step={step ?? "0.01"}
          placeholder="Max"
          value={filters[maxKey]}
          onChange={(e) => onChange(maxKey, e.target.value)}
          className="h-8 text-xs"
        />
      ) : (
        <div />
      )}
    </div>
  );
}

export default function ScreenerPage() {
  const [symbolInput, setSymbolInput] = useState(PRESET_INDICES.join(", "));
  const [filters, setFilters] = useState<Filters>(BLANK);
  const screener = useScreener();

  function setFilter(k: keyof Filters, v: string) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  function parseNum(s: string): number | undefined {
    const n = parseFloat(s);
    return isNaN(n) ? undefined : n;
  }

  function handleRun() {
    const symbols = symbolInput
      .split(/[,\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 30);

    screener.mutate({
      symbols,
      min_pe:              parseNum(filters.min_pe),
      max_pe:              parseNum(filters.max_pe),
      min_pb:              parseNum(filters.min_pb),
      max_pb:              parseNum(filters.max_pb),
      min_roe:             parseNum(filters.min_roe) ? parseNum(filters.min_roe)! / 100 : undefined,
      max_debt_to_equity:  parseNum(filters.max_debt_to_equity),
      min_market_cap:      parseNum(filters.min_market_cap) ? parseNum(filters.min_market_cap)! * 1e7 : undefined,
      max_market_cap:      parseNum(filters.max_market_cap) ? parseNum(filters.max_market_cap)! * 1e7 : undefined,
      min_eps:             parseNum(filters.min_eps),
      min_book_value:      parseNum(filters.min_book_value),
      min_profit_margin:   parseNum(filters.min_profit_margin) ? parseNum(filters.min_profit_margin)! / 100 : undefined,
    });
  }

  const results: StockQuote[] = screener.data ?? [];

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Screener</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Filter stocks by fundamentals. Enter up to 30 tickers (NSE: <code className="rounded bg-muted px-1">.NS</code>, BSE: <code className="rounded bg-muted px-1">.BO</code>).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Filters panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FilterRow label="P/E Ratio"      minKey="min_pe"   maxKey="max_pe"              filters={filters} onChange={setFilter} />
            <FilterRow label="P/B Ratio"      minKey="min_pb"   maxKey="max_pb"              filters={filters} onChange={setFilter} />
            <FilterRow label="ROE (%)"        minKey="min_roe"  step="1" placeholder="%"     filters={filters} onChange={setFilter} />
            <FilterRow label="Debt/Equity max" minKey="max_debt_to_equity"                   filters={filters} onChange={setFilter} />
            <FilterRow label="Market Cap (Cr)" minKey="min_market_cap" maxKey="max_market_cap" step="1" placeholder="₹Cr" filters={filters} onChange={setFilter} />
            <FilterRow label="EPS (₹) min"   minKey="min_eps"                                filters={filters} onChange={setFilter} />
            <FilterRow label="Book Value min" minKey="min_book_value"                        filters={filters} onChange={setFilter} />
            <FilterRow label="Net Margin (%)" minKey="min_profit_margin" step="1" placeholder="%" filters={filters} onChange={setFilter} />

            <div className="pt-1 flex gap-2">
              <Button size="sm" onClick={handleRun} disabled={screener.isPending} className="flex-1">
                {screener.isPending ? (
                  <>
                    <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Run Screener
                  </>
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFilters(BLANK)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              ROE, Net Margin values are entered as % (e.g. 15 for 15%). Market Cap in ₹ Crore.
            </p>
          </CardContent>
        </Card>

        {/* Symbol list + results */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Symbols to screen</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono resize-y min-h-[80px]"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="INFY.NS, TCS.NS, RELIANCE.NS…"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Comma or space separated. Pre-loaded with Nifty 20 large caps. Max 30.
              </p>
            </CardContent>
          </Card>

          {/* Results table */}
          {screener.isError && (
            <p className="text-sm text-red-500">Error running screener. Check console.</p>
          )}

          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{results.length} match{results.length !== 1 ? "es" : ""}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {["Symbol", "Name", "Price", "P/E", "P/B", "ROE", "D/E", "Mkt Cap", "EPS", "Net Margin"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.symbol} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-medium whitespace-nowrap">
                            <a href={`/protected/search?q=${r.symbol}`} className="text-primary hover:underline">{r.symbol}</a>
                          </td>
                          <td className="px-3 py-2 max-w-[140px] truncate">{r.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">₹{fmt(r.current_price)}</td>
                          <td className="px-3 py-2">{fmt(r.pe_ratio)}</td>
                          <td className="px-3 py-2">{fmt(r.pb_ratio)}</td>
                          <td className="px-3 py-2">{fmtPct(r.roe)}</td>
                          <td className="px-3 py-2">{fmt(r.debt_to_equity)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtCr(r.market_cap)}</td>
                          <td className="px-3 py-2">₹{fmt(r.eps_ttm)}</td>
                          <td className="px-3 py-2">{fmtPct(r.profit_margins)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {screener.isSuccess && results.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No stocks matched the selected filters.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        Data from Yahoo Finance. yfinance may rate-limit requests for large symbol lists — consider screening in smaller batches if you see missing data.
      </div>
    </div>
  );
}
