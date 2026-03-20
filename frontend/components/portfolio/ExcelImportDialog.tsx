"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ImportResult {
  message: string;
  stocks_count: number;
  mf_count: number;
  total_rows: number;
}

export function ExcelImportDialog({ onClose }: { onClose: () => void }) {
  const fileRef              = useRef<HTMLInputElement>(null);
  const queryClient          = useQueryClient();
  const [file, setFile]      = useState<File | null>(null);
  const [status, setStatus]  = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [result, setResult]  = useState<ImportResult | null>(null);
  const [error, setError]    = useState<string>("");
  const [dragOver, setDrag]  = useState(false);

  function handleFile(f: File | null) {
    if (!f) return;
    const ok = /\.(xlsx|xls|csv)$/i.test(f.name);
    if (!ok) {
      setError("Only .xlsx, .xls, or .csv files are supported.");
      return;
    }
    setError("");
    setFile(f);
    setStatus("idle");
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setError("");
    try {
      const token  = await getToken();
      const form   = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_URL}/api/holdings/import-excel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail ?? "Upload failed.");
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setStatus("success");

      // Invalidate all holding + portfolio queries so UI refreshes
      await queryClient.invalidateQueries({ queryKey: ["holdings-stocks"] });
      await queryClient.invalidateQueries({ queryKey: ["holdings-mf"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["portfolio-import-history"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setStatus("error");
    }
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
          Import Excel / CSV
        </CardTitle>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFile(e.dataTransfer.files[0] ?? null);
          }}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {file ? file.name : "Drop your file here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, .csv</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Column hint */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          Expected columns:{" "}
          <span className="font-mono">
            Asset Type, Asset Class, Category, Investment Code, Investment, AMC Name,
            MF Direct/Regular, Expense Ratio, Broker, Investment Date, Total Units,
            Invested Amount, Market Value, Holding (%), Total Gain/Loss (INR),
            Total Gain/Loss (%), XIRR (%)
          </span>
          <br />
          The <strong>Asset Type</strong> column must contain <strong>Stock</strong> or{" "}
          <strong>Mutual Fund</strong>.
        </p>

        {/* Error */}
        {(status === "error" || error) && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Success */}
        {status === "success" && result && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {result.message}{" "}
              <span className="font-medium">
                ({result.stocks_count} stocks, {result.mf_count} mutual funds)
              </span>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {status === "success" ? "Close" : "Cancel"}
          </Button>
          <Button
            size="sm"
            disabled={!file || status === "uploading" || status === "success"}
            onClick={handleUpload}
          >
            {status === "uploading" ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Uploading…
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Upload & Import
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
