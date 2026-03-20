"use client";

import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { NetWorthChart } from "@/components/charts/NetWorthChart";
import { DebtPaydownChart } from "@/components/charts/DebtPaydownChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { QuickAddModal } from "@/components/transactions/QuickAddModal";

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <QuickAddModal />
      </div>

      <DashboardSummary />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NetWorthChart />
        <DebtPaydownChart />
      </div>

      <RecentTransactions />
    </div>
  );
}
