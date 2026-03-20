"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTransactions } from "@/lib/queries/useTransactions";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

const typeBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  income: "default",
  expense: "destructive",
  debt_payment: "secondary",
  investment: "outline",
  transfer: "secondary",
};

export function RecentTransactions() {
  const { data, isLoading } = useTransactions({ limit: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const transactions = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={typeBadgeVariant[t.type] ?? "secondary"}>
                    {t.type}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{t.category}</p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(t.transaction_date), "dd MMM yyyy")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
