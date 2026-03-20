"use client";

import { useState } from "react";
import { Bookmark, Trash2, ExternalLink, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWatchlist, useRemoveFromWatchlist, useStockQuote } from "@/lib/queries/useMarket";
import type { WatchlistItem } from "@/lib/queries/useMarket";

function fmt(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  return v.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

// Each watchlist row fetches its own live price
function WatchlistRow({ item, onRemove }: { item: WatchlistItem; onRemove: () => void }) {
  const { data: quote, isLoading, refetch } = useStockQuote(item.symbol);

  const change =
    quote?.current_price != null && quote?.previous_close != null
      ? quote.current_price - quote.previous_close
      : null;
  const changePct =
    change != null && quote?.previous_close
      ? (change / quote.previous_close) * 100
      : null;
  const positive = (change ?? 0) >= 0;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.symbol} · {item.asset_type === "stock" ? "Stock" : "Mutual Fund"}</p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        ) : quote?.current_price != null ? (
          <div className="text-right">
            <p className="text-sm font-semibold">₹{fmt(quote.current_price)}</p>
            {change != null && (
              <p className={`flex items-center justify-end gap-0.5 text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
                {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {positive ? "+" : ""}{changePct?.toFixed(2)}%
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No data</p>
        )}

        <button
          onClick={() => refetch()}
          title="Refresh price"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onRemove}
          title="Remove from watchlist"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const { data: watchlist = [], isLoading } = useWatchlist();
  const remove = useRemoveFromWatchlist();

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Watchlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Instruments you are watching. Add via the{" "}
            <a href="/protected/search" className="text-primary underline underline-offset-2">Search page</a>.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Your watchlist is empty.</p>
            <a href="/protected/search">
              <Button size="sm">Search for stocks</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {watchlist.map((item) => (
            <WatchlistRow
              key={item.id}
              item={item}
              onRemove={() => remove.mutate(item.symbol)}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Prices from Yahoo Finance · {watchlist.length} item{watchlist.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
