"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { FireResult } from "@/lib/types";

interface FireProjectionProps {
  result: FireResult;
}

export function FireProjection({ result }: FireProjectionProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              FIRE Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(result.fire_number)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Years to FIRE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {result.years_to_fire !== null ? `${result.years_to_fire} yrs` : "N/A"}
            </p>
            {result.fire_age && (
              <p className="text-sm text-muted-foreground">Age {result.fire_age}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Savings Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(result.monthly_savings_needed)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{result.current_savings_rate}%</p>
            <p className="text-sm text-muted-foreground">
              {result.is_fire_ready ? "FIRE Ready!" : "Keep going!"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      {result.year_by_year.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Corpus Growth vs FIRE Target</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={result.year_by_year}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" label={{ value: "Age", position: "bottom" }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 10000000).toFixed(1)}Cr`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name,
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="net_worth"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Net Worth"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="corpus"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name="Corpus"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fire_target"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="FIRE Target"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="debt"
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={1}
                  name="Debt"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
