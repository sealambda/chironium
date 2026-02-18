import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

import { getLocale, type Locale, setLocale as setParaglideLocale } from "@/paraglide/runtime";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

interface LocaleProviderProps {
  children: ReactNode;
}

/**
 * Provider for reactive locale switching without page reload.
 * Wraps Paraglide's setLocale with React state to trigger re-renders.
 *
 * Uses a key prop to force re-mount of all children when locale changes,
 * ensuring all components using m.xyz() messages get updated.
 */
export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  const setLocale = useCallback((newLocale: Locale) => {
    void setParaglideLocale(newLocale, { reload: false });
    setLocaleState(newLocale);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <div key={locale} className="contents">
        {children}
      </div>
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access and update the current locale reactively.
 * Must be used within a LocaleProvider.
 */
export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
