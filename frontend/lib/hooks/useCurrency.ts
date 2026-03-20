"use client";

import { useEffect, useState } from "react";

const PREFS_KEY = "fp-prefs";

const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string }> = {
  INR: { locale: "en-IN", symbol: "₹" },
  USD: { locale: "en-US", symbol: "$" },
  EUR: { locale: "de-DE", symbol: "€" },
  GBP: { locale: "en-GB", symbol: "£" },
  SGD: { locale: "en-SG", symbol: "S$" },
  AED: { locale: "ar-AE", symbol: "AED" },
};

export function useCurrency() {
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.currency) setCurrency(prefs.currency);
      }
    } catch {}

    // Listen for changes from settings page
    const handler = () => {
      try {
        const stored = localStorage.getItem(PREFS_KEY);
        if (stored) {
          const prefs = JSON.parse(stored);
          if (prefs.currency) setCurrency(prefs.currency);
        }
      } catch {}
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const config = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.INR;

  function fmt(amount: number, decimals = 0): string {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(amount);
  }

  function fmtExact(amount: number): string {
    return fmt(amount, 2);
  }

  return { currency, symbol: config.symbol, fmt, fmtExact };
}

export const SUPPORTED_CURRENCIES = Object.entries(CURRENCY_CONFIG).map(([code, c]) => ({
  code,
  symbol: c.symbol,
  label: `${c.symbol} ${code}`,
}));
