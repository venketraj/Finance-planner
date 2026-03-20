"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAlerts,
  useEvaluateAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  type AlertConfig,
} from "@/lib/queries/useAlerts";
import {
  Bell, BellOff, Plus, Trash2, AlertTriangle, CheckCircle2,
  Info, XCircle, Calendar, PieChart, Wallet, Flame, CreditCard,
  ChevronDown, ChevronUp, TrendingUp,
} from "lucide-react";

// ── Severity styles ──────────────────────────────────────────────────────────
const SEVERITY = {
  info:    { bg: "bg-blue-50 dark:bg-blue-950/40",    border: "border-blue-200 dark:border-blue-800",  icon: <Info      className="h-4 w-4 text-blue-500" />,  text: "text-blue-800 dark:text-blue-200" },
  warning: { bg: "bg-amber-50 dark:bg-amber-950/40",  border: "border-amber-200 dark:border-amber-800",icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, text: "text-amber-800 dark:text-amber-200" },
  error:   { bg: "bg-red-50 dark:bg-red-950/40",      border: "border-red-200 dark:border-red-800",    icon: <XCircle   className="h-4 w-4 text-red-500" />,    text: "text-red-800 dark:text-red-200" },
  success: { bg: "bg-green-50 dark:bg-green-950/40",  border: "border-green-200 dark:border-green-800",icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,text: "text-green-800 dark:text-green-200" },
};

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sip_reminder:   { label: "SIP Reminder",         icon: <Calendar    className="h-4 w-4" />, color: "text-blue-500"   },
  emi_reminder:   { label: "EMI Reminder",          icon: <CreditCard  className="h-4 w-4" />, color: "text-orange-500" },
  rebalance:      { label: "Rebalance Alert",       icon: <PieChart    className="h-4 w-4" />, color: "text-violet-500" },
  budget:         { label: "Budget Alert",          icon: <Wallet      className="h-4 w-4" />, color: "text-rose-500"   },
  fire_milestone: { label: "FIRE Milestone",        icon: <Flame       className="h-4 w-4" />, color: "text-amber-500"  },
  price_target:   { label: "Price Target",          icon: <TrendingUp  className="h-4 w-4" />, color: "text-green-500"  },
};

// ── Triggered alert banner ───────────────────────────────────────────────────
function TriggeredBanner({ alert }: { alert: any }) {
  const s = SEVERITY[alert.severity as keyof typeof SEVERITY] || SEVERITY.info;
  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${s.bg} ${s.border}`}>
      <div className="shrink-0 mt-0.5">{s.icon}</div>
      <div>
        <p className={`text-sm font-semibold ${s.text}`}>{alert.label}</p>
        <p className={`text-xs mt-0.5 whitespace-pre-line ${s.text} opacity-90`}>{alert.message}</p>
      </div>
    </div>
  );
}

// ── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────
function AlertCard({ alert, triggered }: { alert: AlertConfig; triggered: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const update = useUpdateAlert();
  const del    = useDeleteAlert();
  const meta   = TYPE_META[alert.alert_type];

  return (
    <div className={`rounded-lg border bg-card transition-colors ${triggered ? "border-amber-400 dark:border-amber-600" : ""}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 ${meta?.color}`}>{meta?.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{alert.label}</p>
            <p className="text-xs text-muted-foreground">{meta?.label}</p>
          </div>
          {triggered && (
            <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-900 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Toggle
            checked={alert.enabled}
            onChange={(v) => update.mutate({ id: alert.id, enabled: v })}
          />
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => del.mutate(alert.id)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-1 text-xs text-muted-foreground">
          {alert.reminder_day    && <p>Day of month: <strong>{alert.reminder_day}</strong></p>}
          {alert.reminder_note   && <p>Note: <strong>{alert.reminder_note}</strong></p>}
          {alert.category        && <p>Category: <strong>{alert.category}</strong></p>}
          {alert.budget_amount   && <p>Budget: <strong>₹{alert.budget_amount.toLocaleString("en-IN")}</strong></p>}
          {alert.milestone_pct   && <p>Milestone: <strong>{alert.milestone_pct}%</strong></p>}
          {alert.drift_threshold && <p>Drift threshold: <strong>{alert.drift_threshold}%</strong></p>}
          {alert.target_allocation && (
            <p>Target: {Object.entries(alert.target_allocation).map(([k, v]) => `${k} ${v}%`).join(", ")}</p>
          )}
          {alert.symbol          && <p>Symbol: <strong>{alert.symbol}</strong></p>}
          {alert.target_price    && <p>Target: <strong>₹{alert.target_price.toLocaleString("en-IN")}</strong> ({alert.direction})</p>}
          {alert.alert_window_days && <p>Check window: <strong>{alert.alert_window_days} day(s)</strong></p>}
        </div>
      )}
    </div>
  );
}

// ── Add alert form ────────────────────────────────────────────────────────────
function AddAlertForm({ onDone }: { onDone: () => void }) {
  const create = useCreateAlert();
  const [type, setType]   = useState("sip_reminder");
  const [label, setLabel] = useState("");
  const [day, setDay]     = useState("6");
  const [note, setNote]   = useState("");
  const [cat, setCat]     = useState("");
  const [budget, setBudget] = useState("");
  const [milestone, setMilestone] = useState("25");
  const [drift, setDrift]         = useState("5");
  const [stockPct, setStockPct]   = useState("40");
  const [mfPct, setMfPct]         = useState("50");
  const [otherPct, setOtherPct]   = useState("10");
  const [priceSymbol, setPriceSymbol]   = useState("");
  const [priceTarget, setPriceTarget]   = useState("");
  const [priceDir, setPriceDir]         = useState<"above"|"below">("above");
  const [priceWindow, setPriceWindow]   = useState("7");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const base = { alert_type: type, label: label || TYPE_META[type]?.label, enabled: true };
    let extra: Record<string, any> = {};
    if (type === "sip_reminder" || type === "emi_reminder") {
      extra = { reminder_day: parseInt(day), reminder_note: note };
    } else if (type === "budget") {
      extra = { category: cat, budget_amount: parseFloat(budget) };
    } else if (type === "fire_milestone") {
      extra = { milestone_pct: parseInt(milestone) };
    } else if (type === "rebalance") {
      extra = {
        drift_threshold: parseFloat(drift),
        target_allocation: {
          stock:        parseFloat(stockPct),
          mutual_fund:  parseFloat(mfPct),
          other_scheme: parseFloat(otherPct),
        },
      };
    } else if (type === "price_target") {
      extra = {
        symbol:            priceSymbol.trim().toUpperCase(),
        target_price:      parseFloat(priceTarget),
        direction:         priceDir,
        alert_window_days: parseInt(priceWindow) || 7,
      };
    }
    await create.mutateAsync({ ...base, ...extra } as any);
    onDone();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">New Alert</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Alert Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                {Object.entries(TYPE_META).map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Label (optional)</label>
              <Input
                placeholder={TYPE_META[type]?.label}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* SIP / EMI fields */}
          {(type === "sip_reminder" || type === "emi_reminder") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Day of month</label>
                <Input type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Note (e.g. HDFC Midcap SIP)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          )}

          {/* Budget fields */}
          {type === "budget" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Category</label>
                <Input placeholder="e.g. dining" value={cat} onChange={(e) => setCat(e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Monthly limit (₹)</label>
                <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          )}

          {/* FIRE milestone */}
          {type === "fire_milestone" && (
            <div>
              <label className="mb-1 block text-xs font-medium">Milestone</label>
              <select
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                className="w-40 rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                {["25", "50", "75", "100"].map((p) => (
                  <option key={p} value={p}>{p}% of FIRE corpus</option>
                ))}
              </select>
            </div>
          )}

          {/* Price target */}
          {type === "price_target" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Symbol (e.g. INFY.NS)</label>
                  <Input value={priceSymbol} onChange={(e) => setPriceSymbol(e.target.value)} className="h-8 text-sm" placeholder="INFY.NS" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Target Price (₹)</label>
                  <Input type="number" step="0.01" value={priceTarget} onChange={(e) => setPriceTarget(e.target.value)} className="h-8 text-sm" placeholder="e.g. 1800" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Direction</label>
                  <select value={priceDir} onChange={(e) => setPriceDir(e.target.value as "above"|"below")} className="w-full rounded-md border bg-background px-3 py-1.5 text-sm">
                    <option value="above">Above target</option>
                    <option value="below">Below target</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Alert window (days)</label>
                  <Input type="number" min="1" max="365" value={priceWindow} onChange={(e) => setPriceWindow(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Rebalance */}
          {type === "rebalance" && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium">Stocks target %</label>
                  <Input type="number" value={stockPct} onChange={(e) => setStockPct(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">MF target %</label>
                  <Input type="number" value={mfPct} onChange={(e) => setMfPct(e.target.value)} className="h-8 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Other target %</label>
                  <Input type="number" value={otherPct} onChange={(e) => setOtherPct(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium">Drift threshold %</label>
                <Input type="number" value={drift} onChange={(e) => setDrift(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add Alert"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const { data: alerts = [], isLoading } = useAlerts();
  const { data: evaluation }             = useEvaluateAlerts();
  const [adding, setAdding]              = useState(false);

  const triggeredIds = new Set((evaluation?.triggered ?? []).map((t) => t.id));

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure reminders and portfolio alerts. Evaluated each time you open this page.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="mr-1.5 h-4 w-4" /> New Alert
        </Button>
      </div>

      {/* Triggered alerts summary */}
      {(evaluation?.triggered_count ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400">
              <Bell className="h-4 w-4" />
              {evaluation!.triggered_count} Active Alert{evaluation!.triggered_count > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {evaluation!.triggered.map((t) => (
              <TriggeredBanner key={t.id} alert={t} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* No triggered */}
      {evaluation && evaluation.triggered_count === 0 && evaluation.total_enabled > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All {evaluation.total_enabled} alert{evaluation.total_enabled > 1 ? "s" : ""} checked — nothing to action right now.
        </div>
      )}

      {/* Add form */}
      {adding && <AddAlertForm onDone={() => setAdding(false)} />}

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : alerts.length === 0 && !adding ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <BellOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No alerts configured yet.</p>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add your first alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} triggered={triggeredIds.has(a.id)} />
          ))}
        </div>
      )}

      {/* Quick-add defaults note */}
      {alerts.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {evaluation?.total_configured ?? 0} configured · {evaluation?.total_enabled ?? 0} enabled
        </p>
      )}
    </div>
  );
}
