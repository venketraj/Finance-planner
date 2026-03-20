"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile, useUpdateProfile } from "@/lib/queries/useProfile";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Sun, Moon, Monitor, Bell, Database, Info, ArrowRight, Download, Sparkles, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { SUPPORTED_CURRENCIES } from "@/lib/hooks/useCurrency";
import { getToken } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function downloadExport(path: string, filename: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Theme option button ────────────────────────────────────────────────────────
function ThemeOption({
  value,
  current,
  icon,
  label,
  onClick,
}: {
  value: string;
  current: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-lg border px-5 py-3 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card hover:bg-muted text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
const PREFS_KEY    = "fp-prefs";
const GROQ_KEY_KEY = "fp-groq-api-key";

interface Prefs {
  compactTables: boolean;
  colorGains: boolean;
  currency: string;
  fireAlert: boolean;
  monthlyReport: boolean;
  debtReminder: boolean;
}

const DEFAULT_PREFS: Prefs = {
  compactTables: false,
  colorGains: true,
  currency: "INR",
  fireAlert: true,
  monthlyReport: false,
  debtReminder: false,
};

export default function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { theme, setTheme } = useTheme();

  const [form, setForm] = useState({
    full_name: "",
    current_age: "",
    retirement_age: "60",
    life_expectancy: "85",
    monthly_income: "",
    monthly_expenses: "",
    expected_return: "12",
    expected_inflation: "6",
    safe_withdrawal_rate: "4",
    fire_target: "",
  });

  const [prefs, setPrefs]       = useState<Prefs>(DEFAULT_PREFS);
  const [groqKey, setGroqKey]   = useState("");
  const [showGroq, setShowGroq] = useState(false);
  const [groqSaved, setGroqSaved] = useState(false);

  // Load profile into form
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        current_age: profile.current_age?.toString() ?? "",
        retirement_age: profile.retirement_age.toString(),
        life_expectancy: profile.life_expectancy.toString(),
        monthly_income: profile.monthly_income.toString(),
        monthly_expenses: profile.monthly_expenses.toString(),
        expected_return: (profile.expected_return * 100).toString(),
        expected_inflation: (profile.expected_inflation * 100).toString(),
        safe_withdrawal_rate: (profile.safe_withdrawal_rate * 100).toString(),
        fire_target: profile.fire_target?.toString() ?? "",
      });
    }
  }, [profile]);

  // Load prefs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      const gk = localStorage.getItem(GROQ_KEY_KEY);
      if (gk) setGroqKey(gk);
    } catch {}
  }, []);

  function savePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateProfile.mutateAsync({
      full_name: form.full_name || null,
      current_age: form.current_age ? parseInt(form.current_age) : null,
      retirement_age: parseInt(form.retirement_age),
      life_expectancy: parseInt(form.life_expectancy),
      monthly_income: parseFloat(form.monthly_income) || 0,
      monthly_expenses: parseFloat(form.monthly_expenses) || 0,
      expected_return: parseFloat(form.expected_return) / 100,
      expected_inflation: parseFloat(form.expected_inflation) / 100,
      safe_withdrawal_rate: parseFloat(form.safe_withdrawal_rate) / 100,
    } as any);
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-4 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* ── Appearance ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-4 w-4" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Theme</p>
            <div className="flex gap-3">
              <ThemeOption
                value="light"
                current={theme}
                icon={<Sun className="h-4 w-4" />}
                label="Light"
                onClick={() => setTheme("light")}
              />
              <ThemeOption
                value="dark"
                current={theme}
                icon={<Moon className="h-4 w-4" />}
                label="Dark"
                onClick={() => setTheme("dark")}
              />
              <ThemeOption
                value="system"
                current={theme}
                icon={<Monitor className="h-4 w-4" />}
                label="System"
                onClick={() => setTheme("system")}
              />
            </div>
          </div>

          <div className="divide-y">
            <Toggle
              checked={prefs.compactTables}
              onChange={(v) => savePref("compactTables", v)}
              label="Compact tables"
              description="Reduce row height in holdings tables"
            />
            <Toggle
              checked={prefs.colorGains}
              onChange={(v) => savePref("colorGains", v)}
              label="Colour-code gains / losses"
              description="Show green for profits and red for losses"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Currency display</label>
            <select
              value={prefs.currency}
              onChange={(e) => {
                savePref("currency", e.target.value);
                // Broadcast to other tabs / currency hook
                window.dispatchEvent(new StorageEvent("storage", { key: PREFS_KEY }));
              }}
              className="w-48 rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── Notifications ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-4 w-4" /> Alerts & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Configure SIP reminders, EMI due dates, budget limits, portfolio rebalancing alerts, and FIRE milestone notifications.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border px-2 py-0.5">SIP due date (e.g. 6th every month)</span>
            <span className="rounded-full border px-2 py-0.5">EMI reminder</span>
            <span className="rounded-full border px-2 py-0.5">Budget exceeded</span>
            <span className="rounded-full border px-2 py-0.5">Portfolio drift &gt;5%</span>
            <span className="rounded-full border px-2 py-0.5">FIRE 25/50/75/100%</span>
          </div>
          <Link
            href="/protected/alerts"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Manage Alerts <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      {/* ── Financial parameters ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Full Name</label>
              <Input name="full_name" value={form.full_name} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Current Age</label>
              <Input name="current_age" type="number" value={form.current_age} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Retirement Age</label>
              <Input name="retirement_age" type="number" value={form.retirement_age} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Life Expectancy</label>
              <Input name="life_expectancy" type="number" value={form.life_expectancy} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Monthly Income (₹)</label>
              <Input name="monthly_income" type="number" value={form.monthly_income} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Monthly Expenses (₹)</label>
              <Input name="monthly_expenses" type="number" value={form.monthly_expenses} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Expected Return (%)</label>
              <Input name="expected_return" type="number" step="0.1" value={form.expected_return} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Inflation (%)</label>
              <Input name="expected_inflation" type="number" step="0.1" value={form.expected_inflation} onChange={handleChange} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Safe Withdrawal Rate (%)</label>
              <Input name="safe_withdrawal_rate" type="number" step="0.1" value={form.safe_withdrawal_rate} onChange={handleChange} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving…" : "Save Parameters"}
              </Button>
              {updateProfile.isSuccess && (
                <span className="ml-3 text-sm text-green-600">Saved!</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Data management ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-4 w-4" /> Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export your holdings and transactions as CSV for offline analysis, or download a full JSON backup.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => downloadExport("/api/export/stocks.csv", "stocks.csv")}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Stocks CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExport("/api/export/mutual-funds.csv", "mutual_funds.csv")}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Mutual Funds CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExport("/api/export/other-schemes.csv", "other_schemes.csv")}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Other Schemes CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExport("/api/export/transactions.csv", "transactions.csv")}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Transactions CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadExport("/api/export/debts.csv", "debts.csv")}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Debts CSV
            </Button>
          </div>
          <div className="border-t pt-3">
            <p className="mb-2 text-sm font-medium">Full Backup</p>
            <p className="mb-2 text-xs text-muted-foreground">Download all your data as a single JSON file.</p>
            <Button variant="default" size="sm" onClick={() => downloadExport("/api/export/backup.json", `financeplanner_backup_${new Date().toISOString().slice(0,10)}.json`)}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download Full Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── AI Integration (optional) ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4" /> AI Assistant (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect a free <strong>Groq API key</strong> to enable AI-powered summaries on the Search page.
            Groq offers Llama 3.1 70B with 14,400 free requests/day.
            Your key is stored only in your browser (localStorage) — never sent to our servers.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Input
                type={showGroq ? "text" : "password"}
                placeholder="gsk_…"
                value={groqKey}
                onChange={(e) => { setGroqKey(e.target.value); setGroqSaved(false); }}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowGroq((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showGroq ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              size="sm"
              onClick={() => {
                localStorage.setItem(GROQ_KEY_KEY, groqKey);
                setGroqSaved(true);
              }}
            >
              Save Key
            </Button>
            {groqSaved && <span className="text-xs text-green-600">Saved!</span>}
          </div>
          {groqKey && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:text-red-600"
              onClick={() => {
                localStorage.removeItem(GROQ_KEY_KEY);
                setGroqKey("");
                setGroqSaved(false);
              }}
            >
              Remove key
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Get a free key at{" "}
            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
              console.groq.com
            </a>
            . Model: <code className="rounded bg-muted px-1">llama-3.3-70b-versatile</code>.
          </p>
        </CardContent>
      </Card>

      {/* ── About ───────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-4 w-4" /> About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-medium text-foreground">FIRE Planner</span> — Personal Finance & Retirement Tracker</p>
          <p>Version 1.0.0</p>
          <p>Track your portfolio, plan your FIRE corpus, and monitor your path to financial independence.</p>
        </CardContent>
      </Card>
    </div>
  );
}
