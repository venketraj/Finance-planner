"use client";

import { usePwa } from "@/lib/hooks/usePwa";
import { Download, WifiOff, X } from "lucide-react";
import { useState } from "react";

export function PwaBanner() {
  const { canInstall, isOnline, promptInstall } = usePwa();
  const [dismissed, setDismissed] = useState(false);

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 dark:bg-amber-950 px-4 py-2 text-sm text-amber-800 dark:text-amber-200 shadow-lg">
        <WifiOff className="h-4 w-4 shrink-0" />
        You're offline — showing cached data
      </div>
    );
  }

  if (canInstall && !dismissed) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg max-w-sm w-full mx-4">
        <Download className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install FinancePlanner</p>
          <p className="text-xs text-muted-foreground">Add to home screen for quick access</p>
        </div>
        <button
          onClick={promptInstall}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          Install
        </button>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
