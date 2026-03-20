"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolved] = useState<"light" | "dark">("light");

  // On mount: read stored preference
  useEffect(() => {
    const stored = (localStorage.getItem("fp-theme") as Theme) || "system";
    setThemeState(stored);
  }, []);

  // Whenever theme changes: apply to <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    let dark: boolean;
    if (theme === "dark") dark = true;
    else if (theme === "light") dark = false;
    else dark = systemDark;

    root.classList.toggle("dark", dark);
    setResolved(dark ? "dark" : "light");
    localStorage.setItem("fp-theme", theme);
  }, [theme]);

  // Also react to OS-level changes when on "system"
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        document.documentElement.classList.toggle("dark", mq.matches);
        setResolved(mq.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
