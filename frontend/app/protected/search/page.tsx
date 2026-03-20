"use client";

import { useState, useEffect } from "react";
import { Search, Bookmark, BookmarkCheck, TrendingUp, TrendingDown, Info, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStockQuote, useAddToWatchlist, useRemoveFromWatchlist, useWatchlist } from "@/lib/queries/useMarket";
import { useCreateAlert } from "@/lib/queries/useAlerts";
import type { StockQuote } from "@/lib/queries/useMarket";

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  return v.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtCr(v: number | null | undefined): string {
  if (v == null) return "—";
  const cr = v / 1e7;
  if (cr >= 1e5) return `₹${(cr / 1e5).toFixed(2)}L Cr`;
  if (cr >= 1e3) return `₹${(cr / 1e3).toFixed(2)}k Cr`;
  return `₹${cr.toFixed(2)} Cr`;
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ── Price alert form ──────────────────────────────────────────────────────────

function PriceAlertForm({
  symbol,
  name,
  onDone,
}: {
  symbol: string;
  name: string;
  onDone: () => void;
}) {
  const create = useCreateAlert();
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [windowDays, setWindowDays] = useState("7");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      alert_type: "price_target",
      label: `${symbol} ${direction} ₹${targetPrice}`,
      enabled: true,
      symbol,
      target_price: parseFloat(targetPrice),
      direction,
      alert_window_days: parseInt(windowDays) || 7,
    } as any);
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-lg border bg-muted/40 p-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Set price alert for {symbol}</p>
      <div className="flex gap-2 flex-wrap">
        <div>
          <label className="mb-1 block text-xs">Target Price (₹)</label>
          <Input
            type="number"
            step="0.01"
            required
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="h-8 w-32 text-sm"
            placeholder="e.g. 1500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs">Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "above" | "below")}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs">Check window (days)</label>
          <Input
            type="number"
            min="1"
            max="365"
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value)}
            className="h-8 w-24 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Set Alert"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Groq AI summary ───────────────────────────────────────────────────────────

function AiSummary({ quote }: { quote: StockQuote }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function fetchSummary() {
    const key = typeof window !== "undefined" ? localStorage.getItem("fp-groq-api-key") : null;
    if (!key) { setError("No Groq API key saved. Add one in Settings."); return; }
    setLoading(true);
    setError("");
    try {
      const prompt = `You are a financial analyst. Given the following data for ${quote.name} (${quote.symbol}), provide a concise 3-sentence fundamental analysis covering valuation, profitability, and key risks. Be factual and direct.

P/E: ${quote.pe_ratio ?? "N/A"}, P/B: ${quote.pb_ratio ?? "N/A"}, ROE: ${quote.roe != null ? (quote.roe * 100).toFixed(1) + "%" : "N/A"}, Net Margin: ${quote.profit_margins != null ? (quote.profit_margins * 100).toFixed(1) + "%" : "N/A"}, Debt/Equity: ${quote.debt_to_equity ?? "N/A"}, EPS: ${quote.eps_ttm ?? "N/A"}, Market Cap: ${quote.market_cap ? (quote.market_cap / 1e7).toFixed(0) + " Cr" : "N/A"}, Sector: ${quote.sector ?? "N/A"}.`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });
      if (!res.ok) throw new Error(`Groq API error ${res.status}`);
      const json = await res.json();
      setSummary(json.choices?.[0]?.message?.content?.trim() ?? "No summary returned.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch AI summary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
          <Sparkles className="h-3.5 w-3.5" /> AI Summary (Groq · Llama 3.1 70B)
        </p>
        {!summary && !loading && (
          <button
            onClick={fetchSummary}
            className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            Generate
          </button>
        )}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {summary && <p className="text-xs leading-relaxed text-violet-800 dark:text-violet-200">{summary}</p>}
      {summary && (
        <button onClick={() => { setSummary(null); setError(""); }} className="text-[10px] text-muted-foreground hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}

// ── Quote card ────────────────────────────────────────────────────────────────

function QuoteCard({ quote, symbol }: { quote: StockQuote; symbol: string }) {
  const [showAlert, setShowAlert] = useState(false);
  const addWl    = useAddToWatchlist();
  const removeWl = useRemoveFromWatchlist();
  const { data: watchlist = [] } = useWatchlist();

  const inWatchlist = watchlist.some((w) => w.symbol === quote.symbol);

  const change =
    quote.current_price != null && quote.previous_close != null
      ? quote.current_price - quote.previous_close
      : null;
  const changePct =
    change != null && quote.previous_close
      ? (change / quote.previous_close) * 100
      : null;
  const positive = (change ?? 0) >= 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{quote.name}</h2>
          <p className="text-xs text-muted-foreground">{quote.symbol} · {quote.exchange} · {quote.sector}</p>
        </div>
        <div className="flex items-center gap-2">
          {quote.current_price != null && (
            <div className="text-right">
              <p className="text-2xl font-bold">₹{fmt(quote.current_price)}</p>
              {change != null && (
                <p className={`flex items-center justify-end gap-1 text-sm font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
                  {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {positive ? "+" : ""}{fmt(change)} ({positive ? "+" : ""}{changePct?.toFixed(2)}%)
                </p>
              )}
            </div>
          )}
          <button
            onClick={() =>
              inWatchlist
                ? removeWl.mutate(quote.symbol)
                : addWl.mutate({ symbol: quote.symbol, name: quote.name, asset_type: "stock" })
            }
            title={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            className="rounded-full p-2 hover:bg-muted transition-colors"
          >
            {inWatchlist ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Price range */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Day High" value={`₹${fmt(quote.day_high)}`} />
        <Stat label="Day Low"  value={`₹${fmt(quote.day_low)}`} />
        <Stat label="52W High" value={`₹${fmt(quote.fifty_two_week_high)}`} />
        <Stat label="52W Low"  value={`₹${fmt(quote.fifty_two_week_low)}`} />
      </div>

      {/* Valuation */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valuation</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Market Cap"     value={fmtCr(quote.market_cap)} />
          <Stat label="P/E (TTM)"      value={fmt(quote.pe_ratio)} />
          <Stat label="Forward P/E"    value={fmt(quote.forward_pe)} />
          <Stat label="P/B"            value={fmt(quote.pb_ratio)} />
          <Stat label="P/S"            value={fmt(quote.ps_ratio)} />
          <Stat label="EV/EBITDA"      value={fmt(quote.ev_ebitda)} />
          <Stat label="EPS (TTM)"      value={`₹${fmt(quote.eps_ttm)}`} />
          <Stat label="EPS (Forward)"  value={`₹${fmt(quote.eps_forward)}`} />
        </div>
      </div>

      {/* Fundamentals */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fundamentals</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Revenue"        value={fmtCr(quote.revenue)} />
          <Stat label="Gross Margin"   value={fmtPct(quote.gross_margins)} />
          <Stat label="Op. Margin"     value={fmtPct(quote.operating_margins)} />
          <Stat label="Net Margin"     value={fmtPct(quote.profit_margins)} />
          <Stat label="ROE"            value={fmtPct(quote.roe)} />
          <Stat label="ROA"            value={fmtPct(quote.roa)} />
          <Stat label="Debt / Equity"  value={fmt(quote.debt_to_equity)} />
          <Stat label="Book Value"     value={`₹${fmt(quote.book_value)}`} />
          <Stat label="Current Ratio"  value={fmt(quote.current_ratio)} />
          <Stat label="Quick Ratio"    value={fmt(quote.quick_ratio)} />
          <Stat label="Div. Yield"     value={fmtPct(quote.dividend_yield)} />
          <Stat label="Payout Ratio"   value={fmtPct(quote.payout_ratio)} />
          <Stat label="Earnings Gr."   value={fmtPct(quote.earnings_growth)} />
          <Stat label="Revenue Gr."    value={fmtPct(quote.revenue_growth)} />
        </div>
      </div>

      {/* Description */}
      {quote.description && (
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{quote.description}</p>
        </div>
      )}

      {/* AI Summary */}
      <AiSummary quote={quote} />

      {/* Price alert */}
      <div>
        {!showAlert && (
          <Button size="sm" variant="outline" onClick={() => setShowAlert(true)}>
            Set Price Alert
          </Button>
        )}
        {showAlert && (
          <PriceAlertForm symbol={quote.symbol} name={quote.name} onDone={() => setShowAlert(false)} />
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [input, setInput]   = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);

  const { data: quote, isLoading, isError, error } = useStockQuote(symbol);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (!s) return;
    // Auto-append .NS for NSE if no exchange suffix provided
    const sym = s.includes(".") ? s : `${s}.NS`;
    setSymbol(sym);
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Search & Fundamentals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a yfinance ticker (e.g. <code className="rounded bg-muted px-1">INFY.NS</code>, <code className="rounded bg-muted px-1">TCS.NS</code>, <code className="rounded bg-muted px-1">HDFCBANK.NS</code>).
          Append <code className="rounded bg-muted px-1">.BO</code> for BSE. Powered by yfinance (free).
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. INFY or INFY.NS"
          className="max-w-xs"
        />
        <Button type="submit">
          <Search className="mr-1.5 h-4 w-4" /> Search
        </Button>
      </form>

      {isLoading && (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Fetching data for {symbol}…
            </div>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-red-500">
              Could not fetch data for <strong>{symbol}</strong>. Try appending <code>.NS</code> or <code>.BO</code>.
            </p>
          </CardContent>
        </Card>
      )}

      {quote && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <QuoteCard quote={quote} symbol={symbol!} />
          </CardContent>
        </Card>
      )}

      {/* Tip */}
      <div className="flex items-start gap-2 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-300">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>Data sourced from Yahoo Finance via yfinance. Indian stocks use <strong>.NS</strong> (NSE) or <strong>.BO</strong> (BSE) suffix. Mutual fund NAV is not available via yfinance — use MFAPI.in for MF lookups.</span>
      </div>
    </div>
  );
}
