"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateHolding } from "@/lib/queries/useHoldings";

const ASSET_CLASSES = ["Equity", "Debt", "Hybrid", "Gold", "Real Estate", "Others"];
const MF_TYPES = ["Direct", "Regular"];

export function AddHoldingDialog({ onClose }: { onClose: () => void }) {
  const createHolding = useCreateHolding();
  const [form, setForm] = useState({
    asset_type:      "stock" as "stock" | "mutual_fund",
    investment:      "",
    investment_code: "",
    asset_class:     "",
    category:        "",
    amc_name:        "",
    mf_type:         "",
    expense_ratio:   "",
    broker:          "",
    investment_date: "",
    total_units:     "",
    invested_amount: "",
    market_value:    "",
  });
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.investment.trim()) { setError("Investment name is required."); return; }

    const invested = parseFloat(form.invested_amount) || 0;
    const market   = parseFloat(form.market_value)   || 0;

    try {
      await createHolding.mutateAsync({
        asset_type:      form.asset_type,
        investment:      form.investment.trim(),
        investment_code: form.investment_code.trim() || undefined,
        asset_class:     form.asset_class  || undefined,
        category:        form.category     || undefined,
        amc_name:        form.amc_name.trim()     || undefined,
        mf_type:         form.mf_type       || undefined,
        expense_ratio:   form.expense_ratio ? parseFloat(form.expense_ratio) : undefined,
        broker:          form.broker.trim() || undefined,
        investment_date: form.investment_date || undefined,
        total_units:     form.total_units ? parseFloat(form.total_units) : undefined,
        invested_amount: invested,
        market_value:    market,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add holding.");
    }
  }

  const isMF = form.asset_type === "mutual_fund";

  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Add Holding Manually</CardTitle>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1 — type + name + code */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Asset Type *</label>
              <select
                value={form.asset_type}
                onChange={(e) => set("asset_type", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="stock">Stock</option>
                <option value="mutual_fund">Mutual Fund</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {isMF ? "Scheme Name *" : "Company Name *"}
              </label>
              <Input
                value={form.investment}
                onChange={(e) => set("investment", e.target.value)}
                placeholder={isMF ? "e.g. Parag Parikh Flexi Cap Fund" : "e.g. Infosys Ltd"}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {isMF ? "ISIN / Scheme Code" : "ISIN / Ticker"}
              </label>
              <Input
                value={form.investment_code}
                onChange={(e) => set("investment_code", e.target.value)}
                placeholder={isMF ? "INF879O01019" : "INE009A01021"}
              />
            </div>
          </div>

          {/* Row 2 — class + category + amc/broker */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Asset Class</label>
              <select
                value={form.asset_class}
                onChange={(e) => set("asset_class", e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {ASSET_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
              <Input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Large Cap, Small Cap"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {isMF ? "AMC Name" : "Broker"}
              </label>
              <Input
                value={isMF ? form.amc_name : form.broker}
                onChange={(e) => set(isMF ? "amc_name" : "broker", e.target.value)}
                placeholder={isMF ? "e.g. Parag Parikh AMC" : "e.g. Groww"}
              />
            </div>
          </div>

          {/* Row 3 — MF-specific: direct/regular + expense ratio | Stock: broker */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {isMF ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Direct / Regular</label>
                  <select
                    value={form.mf_type}
                    onChange={(e) => set("mf_type", e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— Select —</option>
                    {MF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Expense Ratio (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.expense_ratio}
                    onChange={(e) => set("expense_ratio", e.target.value)}
                    placeholder="e.g. 0.59"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Broker / Platform</label>
                  <Input
                    value={form.broker}
                    onChange={(e) => set("broker", e.target.value)}
                    placeholder="e.g. Groww, Zerodha"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Investment Date</label>
                <Input
                  type="date"
                  value={form.investment_date}
                  onChange={(e) => set("investment_date", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Row 4 — units + invested + market */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {isMF && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Investment Date</label>
                <Input
                  type="date"
                  value={form.investment_date}
                  onChange={(e) => set("investment_date", e.target.value)}
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Total Units</label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={form.total_units}
                onChange={(e) => set("total_units", e.target.value)}
                placeholder="e.g. 10.5"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Invested Amount (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.invested_amount}
                onChange={(e) => set("invested_amount", e.target.value)}
                placeholder="e.g. 50000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Current Market Value (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.market_value}
                onChange={(e) => set("market_value", e.target.value)}
                placeholder="e.g. 62000"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={createHolding.isPending}>
              {createHolding.isPending ? "Adding…" : "Add Holding"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
