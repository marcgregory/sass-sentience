"use client";

import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { useUIStore } from "@/stores/ui-store";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "light", setTheme: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<Theme>("light");
  const storeTheme = useUIStore((s) => s.theme);
  const setStoreTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const stored = localStorage.getItem("sentience-ui");
      const pref = stored ? JSON.parse(stored).state?.theme : "system";
      if (pref === "dark") {
        root.classList.add("dark");
        setThemeState("dark");
      } else if (pref === "light") {
        root.classList.remove("dark");
        setThemeState("light");
      } else {
        if (mediaQuery.matches) {
          root.classList.add("dark");
          setThemeState("dark");
        } else {
          root.classList.remove("dark");
          setThemeState("light");
        }
      }
    }

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [storeTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    setStoreTheme(t);
    const root = document.documentElement;
    if (t === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
