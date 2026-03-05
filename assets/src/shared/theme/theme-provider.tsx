import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "chironium-theme";
const VALID_THEMES = new Set<Theme>(["light", "dark", "system"]);

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && VALID_THEMES.has(stored as Theme) ? (stored as Theme) : null;
}

/**
 * Manages dark/light/system theme by toggling a `.dark` class on `<html>`.
 * Persists the user's choice in localStorage.
 */
export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? defaultTheme);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");

      const applySystemTheme = () => {
        root.classList.remove("light", "dark");
        root.classList.add(mql.matches ? "dark" : "light");
      };

      applySystemTheme();
      mql.addEventListener("change", applySystemTheme);
      return () => mql.removeEventListener("change", applySystemTheme);
    }

    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to read and update the current theme.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}
