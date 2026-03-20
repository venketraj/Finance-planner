"use client";

import { useState } from "react";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { AddHoldingDialog } from "@/components/portfolio/AddHoldingDialog";
import { ExcelImportDialog } from "@/components/portfolio/ExcelImportDialog";
import { PortfolioAllocation } from "@/components/charts/PortfolioAllocation";
import { FinanceQuotes } from "@/components/portfolio/FinanceQuotes";
import { PortfolioStats } from "@/components/portfolio/PortfolioStats";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Plus } from "lucide-react";

type Panel = "none" | "add" | "import";

export default function PortfolioPage() {
  const [panel, setPanel] = useState<Panel>("none");

  function toggle(p: Panel) {
    setPanel((cur) => (cur === p ? "none" : p));
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Portfolio</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={panel === "add" ? "default" : "outline"}
            onClick={() => toggle("add")}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Manually
          </Button>
          <Button
            size="sm"
            variant={panel === "import" ? "default" : "outline"}
            onClick={() => toggle("import")}
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Import Excel
          </Button>
        </div>
      </div>

      {/* Panels — shown side by side if both could open, but only one at a time */}
      {panel === "add"    && <AddHoldingDialog  onClose={() => setPanel("none")} />}
      {panel === "import" && <ExcelImportDialog onClose={() => setPanel("none")} />}

      {/* Top section: pie chart + quotes + stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PortfolioAllocation />
        <div className="flex flex-col gap-4">
          <FinanceQuotes />
          <PortfolioStats />
        </div>
      </div>

      {/* Full-width holdings tables */}
      <HoldingsTable />
    </div>
  );
}
