"use client";

import { useState } from "react";
import { AddTransactionForm } from "./AddTransactionForm";

export function QuickAddModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        + Add Transaction
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">Add Transaction</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <AddTransactionForm onSuccess={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
