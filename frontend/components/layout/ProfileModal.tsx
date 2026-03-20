"use client";

import { useEffect, useState } from "react";
import { X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfile, useUpdateProfile } from "@/lib/queries/useProfile";

interface ProfileModalProps {
  onClose: () => void;
  userEmail?: string;
}

export function ProfileModal({ onClose, userEmail }: ProfileModalProps) {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

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
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name:            profile.full_name ?? "",
        current_age:          profile.current_age?.toString() ?? "",
        retirement_age:       profile.retirement_age.toString(),
        life_expectancy:      profile.life_expectancy.toString(),
        monthly_income:       profile.monthly_income.toString(),
        monthly_expenses:     profile.monthly_expenses.toString(),
        expected_return:      (profile.expected_return * 100).toString(),
        expected_inflation:   (profile.expected_inflation * 100).toString(),
        safe_withdrawal_rate: (profile.safe_withdrawal_rate * 100).toString(),
      });
    }
  }, [profile]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateProfile.mutateAsync({
      full_name:            form.full_name || null,
      current_age:          form.current_age ? parseInt(form.current_age) : null,
      retirement_age:       parseInt(form.retirement_age),
      life_expectancy:      parseInt(form.life_expectancy),
      monthly_income:       parseFloat(form.monthly_income) || 0,
      monthly_expenses:     parseFloat(form.monthly_expenses) || 0,
      expected_return:      parseFloat(form.expected_return) / 100,
      expected_inflation:   parseFloat(form.expected_inflation) / 100,
      safe_withdrawal_rate: parseFloat(form.safe_withdrawal_rate) / 100,
    } as any);
  }

  // Initials for avatar inside modal
  const initials = form.full_name
    ? form.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">My Profile</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Avatar + email */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
              {initials}
            </div>
            {userEmail && (
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Personal Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Full Name</label>
                    <Input name="full_name" value={form.full_name} onChange={handleChange} placeholder="e.g. Ravi Kumar" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Current Age</label>
                      <Input name="current_age" type="number" value={form.current_age} onChange={handleChange} placeholder="35" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Retirement Age</label>
                      <Input name="retirement_age" type="number" value={form.retirement_age} onChange={handleChange} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Life Expectancy</label>
                    <Input name="life_expectancy" type="number" value={form.life_expectancy} onChange={handleChange} />
                  </div>
                </div>
              </section>

              {/* Financials */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly Financials
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Monthly Income (₹)</label>
                    <Input name="monthly_income" type="number" value={form.monthly_income} onChange={handleChange} placeholder="80000" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Monthly Expenses (₹)</label>
                    <Input name="monthly_expenses" type="number" value={form.monthly_expenses} onChange={handleChange} placeholder="40000" />
                  </div>
                </div>
              </section>

              {/* FIRE Parameters */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  FIRE Parameters
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Expected Return (%)</label>
                    <Input name="expected_return" type="number" step="0.1" value={form.expected_return} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Expected Inflation (%)</label>
                    <Input name="expected_inflation" type="number" step="0.1" value={form.expected_inflation} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Safe Withdrawal Rate (%)</label>
                    <Input name="safe_withdrawal_rate" type="number" step="0.1" value={form.safe_withdrawal_rate} onChange={handleChange} />
                  </div>
                </div>
              </section>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving…" : "Save Changes"}
                </Button>
                {updateProfile.isSuccess && (
                  <p className="mt-2 text-center text-sm text-green-600 dark:text-green-400">
                    Profile saved successfully!
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
