"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getToken } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────────

type DocumentType = "stock" | "mutual_fund" | "other_scheme";
type Step = "upload" | "preview" | "done";

interface StockRow {
  isin: string;
  name: string;
  ticker: string;
  balance: number;
  closing_price: number;
  cost_value: number;
  market_value: number;
  statement_date: string;
  asset_type: string;
  include: boolean;
}

interface MfRow {
  isin: string;
  folio: string | null;
  name: string;
  ticker: string;
  unit_balance: number;
  nav: number;
  nav_date: string;
  cost_value: number;
  market_value: number;
  statement_date: string;
  asset_type: string;
  include: boolean;
}

interface OtherRow {
  scheme_type: string;
  account_id: string;
  name: string;
  ticker: string;
  units: number;
  unit_value: number;
  cost_value: number;
  market_value: number;
  start_date: string;
  statement_date: string;
  notes: string | null;
  asset_type: string;
  include: boolean;
  // editable fields
  scheme_type_str: string;
  account_id_str: string;
  name_str: string;
}

interface PreviewResponse {
  document_type: string;
  stocks: Omit<StockRow, "include">[];
  mutual_funds: Omit<MfRow, "include">[];
  other_schemes: Omit<OtherRow, "include" | "scheme_type_str" | "account_id_str" | "name_str">[];
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  stock:        "CDSL BO Statement (Stocks)",
  mutual_fund:  "CAMS / KFintech CAS (Mutual Funds)",
  other_scheme: "Other Schemes (LIC / PPF / NPS / FD / Bonds…)",
};

const SCHEME_TYPES = ["lic", "ppf", "nps", "fd", "bond", "ssy", "other"];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n);
}

// ── Stock Preview ──────────────────────────────────────────────────────────────

function StockPreview({
  rows,
  onChange,
  onToggleAll,
}: {
  rows: StockRow[];
  onChange: (i: number, field: keyof StockRow, value: unknown) => void;
  onToggleAll: (v: boolean) => void;
}) {
  const selected = rows.filter((r) => r.include).length;
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No stocks found.</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{selected} of {rows.length} selected</span>
        <button onClick={() => onToggleAll(true)} className="text-primary hover:underline">Select all</button>
        <span>·</span>
        <button onClick={() => onToggleAll(false)} className="text-primary hover:underline">Deselect all</button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2 text-left font-medium">ISIN</th>
              <th className="px-3 py-2 text-left font-medium">Company Name</th>
              <th className="px-3 py-2 text-right font-medium">Balance (Qty)</th>
              <th className="px-3 py-2 text-right font-medium">Closing Price</th>
              <th className="px-3 py-2 text-right font-medium">Market Value (INR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b last:border-0 ${row.include ? "" : "opacity-40"}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={row.include}
                    onChange={(e) => onChange(i, "include", e.target.checked)} className="h-4 w-4" />
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.isin}</td>
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(row.balance)}</td>
                <td className="px-3 py-2 text-right tabular-nums">₹{fmt(row.closing_price)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">₹{fmt(row.market_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MF Preview ─────────────────────────────────────────────────────────────────

function MfPreview({
  rows,
  onChange,
  onToggleAll,
}: {
  rows: MfRow[];
  onChange: (i: number, field: keyof MfRow, value: unknown) => void;
  onToggleAll: (v: boolean) => void;
}) {
  const selected = rows.filter((r) => r.include).length;
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No mutual funds found.</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{selected} of {rows.length} selected</span>
        <button onClick={() => onToggleAll(true)} className="text-primary hover:underline">Select all</button>
        <span>·</span>
        <button onClick={() => onToggleAll(false)} className="text-primary hover:underline">Deselect all</button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2 text-left font-medium">Folio</th>
              <th className="px-3 py-2 text-left font-medium">ISIN</th>
              <th className="px-3 py-2 text-left font-medium">Scheme Name</th>
              <th className="px-3 py-2 text-right font-medium">Units</th>
              <th className="px-3 py-2 text-right font-medium">NAV Date</th>
              <th className="px-3 py-2 text-right font-medium">NAV (INR)</th>
              <th className="px-3 py-2 text-right font-medium">Cost (INR)</th>
              <th className="px-3 py-2 text-right font-medium">Market Value (INR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b last:border-0 ${row.include ? "" : "opacity-40"}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={row.include}
                    onChange={(e) => onChange(i, "include", e.target.checked)} className="h-4 w-4" />
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{row.folio || "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.isin}</td>
                <td className="px-3 py-2 font-medium max-w-[200px]">
                  <span className="block truncate" title={row.name}>{row.name}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(row.unit_balance)}</td>
                <td className="px-3 py-2 text-right text-xs text-muted-foreground">{row.nav_date}</td>
                <td className="px-3 py-2 text-right tabular-nums">₹{fmt(row.nav)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">₹{fmt(row.cost_value)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">₹{fmt(row.market_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Other Schemes Preview ──────────────────────────────────────────────────────

function OtherPreview({
  rows,
  onChange,
  onToggleAll,
}: {
  rows: OtherRow[];
  onChange: (i: number, field: keyof OtherRow, value: unknown) => void;
  onToggleAll: (v: boolean) => void;
}) {
  const selected = rows.filter((r) => r.include).length;
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">No rows found.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Review and correct each row. Set the scheme type, ID, and name before importing.
      </p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{selected} of {rows.length} selected</span>
        <button onClick={() => onToggleAll(true)} className="text-primary hover:underline">Select all</button>
        <span>·</span>
        <button onClick={() => onToggleAll(false)} className="text-primary hover:underline">Deselect all</button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 px-3 py-2" />
              <th className="px-3 py-2 text-left font-medium">Type *</th>
              <th className="px-3 py-2 text-left font-medium">Account / Policy ID *</th>
              <th className="px-3 py-2 text-left font-medium">Name *</th>
              <th className="px-3 py-2 text-right font-medium">Invested (INR)</th>
              <th className="px-3 py-2 text-right font-medium">Current Value (INR)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b last:border-0 ${row.include ? "" : "opacity-40"}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={row.include}
                    onChange={(e) => onChange(i, "include", e.target.checked)} className="h-4 w-4" />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.scheme_type_str}
                    onChange={(e) => onChange(i, "scheme_type_str", e.target.value)}
                    disabled={!row.include}
                    className="w-20 rounded border bg-background px-1 py-1 text-xs"
                  >
                    {SCHEME_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.account_id_str}
                    onChange={(e) => onChange(i, "account_id_str", e.target.value)}
                    disabled={!row.include}
                    className="w-32 text-xs"
                    placeholder="Policy / Acct No."
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    value={row.name_str}
                    onChange={(e) => onChange(i, "name_str", e.target.value)}
                    disabled={!row.include}
                    className="w-44 text-xs"
                    placeholder="Scheme name"
                  />
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">₹{fmt(row.cost_value)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">₹{fmt(row.market_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function CasImportDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep]               = useState<Step>("upload");
  const [docType, setDocType]         = useState<DocumentType>("stock");
  const [file, setFile]               = useState<File | null>(null);
  const [password, setPassword]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [doneMsg, setDoneMsg]         = useState("");
  const [stockRows, setStockRows]     = useState<StockRow[]>([]);
  const [mfRows, setMfRows]           = useState<MfRow[]>([]);
  const [otherRows, setOtherRows]     = useState<OtherRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // ── Parse ──────────────────────────────────────────────────────────────────

  async function handleParse() {
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("document_type", docType);
      if (password) fd.append("password", password);

      const res = await fetch(`${API_BASE}/api/holdings/import-pdf/preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Parse failed");
      }

      const data: PreviewResponse = await res.json();

      setStockRows(
        (data.stocks || []).map((r) => ({ ...r, include: true }))
      );
      setMfRows(
        (data.mutual_funds || []).map((r) => ({ ...r, include: true }))
      );
      setOtherRows(
        (data.other_schemes || []).map((r) => ({
          ...r,
          include: true,
          scheme_type_str: r.scheme_type,
          account_id_str: r.account_id,
          name_str: r.name,
        }))
      );
      setStep("preview");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    setError(null);
    setLoading(true);
    try {
      const token = await getToken();

      const body: Record<string, unknown> = { document_type: docType };

      if (docType === "stock") {
        body.stocks = stockRows
          .filter((r) => r.include)
          .map(({ include: _, ...r }) => r);
      } else if (docType === "mutual_fund") {
        body.mutual_funds = mfRows
          .filter((r) => r.include)
          .map(({ include: _, ...r }) => r);
      } else {
        body.other_schemes = otherRows
          .filter((r) => r.include)
          .map(({ include: _, scheme_type_str, account_id_str, name_str, ...r }) => ({
            ...r,
            scheme_type: scheme_type_str,
            account_id:  account_id_str,
            name:        name_str,
            ticker:      account_id_str.replace(/\s+/g, "_").toUpperCase(),
          }));
      }

      const res = await fetch(`${API_BASE}/api/holdings/import-pdf/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Import failed");
      }

      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["holdings-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["holdings-mf"] });
      queryClient.invalidateQueries({ queryKey: ["holdings-other"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      setDoneMsg(result.message);
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const totalSelected =
    stockRows.filter((r) => r.include).length +
    mfRows.filter((r) => r.include).length +
    otherRows.filter((r) => r.include).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">
          {step === "upload"  && "Import Holdings from PDF"}
          {step === "preview" && "Review & Confirm Holdings"}
          {step === "done"    && "Import Complete"}
        </CardTitle>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent>

        {/* ── STEP 1: UPLOAD ── */}
        {step === "upload" && (
          <div className="space-y-4 max-w-xl">

            {/* Document type selector */}
            <div>
              <label className="mb-1 block text-sm font-medium">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {docType === "stock"        && "Upload your CDSL Beneficial Owner (BO) statement PDF."}
                {docType === "mutual_fund"  && "Upload your CAMS or KFintech Consolidated Account Statement PDF."}
                {docType === "other_scheme" && "Upload any PDF containing LIC, PPF, NPS, FD, Bond, or similar data. You will review and correct each row."}
              </p>
            </div>

            {/* File drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-8 hover:border-primary/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              {file ? (
                <span className="text-sm font-medium">{file.name}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Click to select PDF</span>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">PDF Password (if any)</label>
              <Input
                type="password"
                placeholder="Leave blank if not password-protected"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleParse} disabled={!file || loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing...</> : "Parse PDF"}
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: PREVIEW ── */}
        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Type: <strong className="text-foreground">{DOC_TYPE_LABELS[docType]}</strong>
              {" · "}
              {docType === "stock"        && `${stockRows.length} stocks found`}
              {docType === "mutual_fund"  && `${mfRows.length} mutual funds found`}
              {docType === "other_scheme" && `${otherRows.length} rows found`}
            </p>

            {docType === "stock" && (
              <StockPreview
                rows={stockRows}
                onChange={(i, f, v) => setStockRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))}
                onToggleAll={(v) => setStockRows((prev) => prev.map((r) => ({ ...r, include: v })))}
              />
            )}

            {docType === "mutual_fund" && (
              <MfPreview
                rows={mfRows}
                onChange={(i, f, v) => setMfRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))}
                onToggleAll={(v) => setMfRows((prev) => prev.map((r) => ({ ...r, include: v })))}
              />
            )}

            {docType === "other_scheme" && (
              <OtherPreview
                rows={otherRows}
                onChange={(i, f, v) => setOtherRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r))}
                onToggleAll={(v) => setOtherRows((prev) => prev.map((r) => ({ ...r, include: v })))}
              />
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠ Importing will replace all existing {docType === "stock" ? "stock" : docType === "mutual_fund" ? "mutual fund" : "other scheme"} holdings for your account.
            </p>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleConfirm} disabled={loading || totalSelected === 0}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
                  : `Import ${totalSelected} row${totalSelected !== 1 ? "s" : ""}`}
              </Button>
              <Button variant="outline" onClick={() => { setStep("upload"); setError(null); }}>Back</Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">{doneMsg}</p>
            <p className="text-sm text-muted-foreground">
              Values shown are exactly as in the uploaded PDF.
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
