import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface DetailContextValue {
  /** Whether we're currently in a detail/focused view mode */
  isDetailMode: boolean;
  /** Enable detail mode (hides standard nav elements) */
  enterDetailMode: () => void;
  /** Exit detail mode (restores standard nav elements) */
  exitDetailMode: () => void;
  /** Custom header content to render in the top bar */
  headerContent: ReactNode | null;
  /** Set custom header content for the top bar */
  setHeaderContent: (content: ReactNode | null) => void;
}

const DetailContext = createContext<DetailContextValue | null>(null);

interface DetailProviderProps {
  children: ReactNode;
}

/**
 * Provider for detail mode state management.
 * When detail mode is active, the standard nav elements (org selector, profile, bottom nav)
 * are hidden and custom header content can be rendered in the top bar.
 */
export function DetailProvider({ children }: Readonly<DetailProviderProps>) {
  const [isDetailMode, setIsDetailMode] = useState(false);
  const [headerContent, setHeaderContent] = useState<ReactNode | null>(null);

  const enterDetailMode = useCallback(() => {
    setIsDetailMode(true);
  }, []);

  const exitDetailMode = useCallback(() => {
    setIsDetailMode(false);
    setHeaderContent(null);
  }, []);

  const value = useMemo(
    () => ({
      isDetailMode,
      enterDetailMode,
      exitDetailMode,
      headerContent,
      setHeaderContent,
    }),
    [isDetailMode, enterDetailMode, exitDetailMode, headerContent],
  );

  return <DetailContext.Provider value={value}>{children}</DetailContext.Provider>;
}

/**
 * Hook to access detail mode state and controls.
 * Must be used within a DetailProvider.
 */
export function useDetailMode() {
  const context = useContext(DetailContext);
  if (!context) {
    throw new Error("useDetailMode must be used within a DetailProvider");
  }
  return context;
}

/**
 * Hook to activate detail mode on mount and deactivate on unmount.
 * Use this in pages that should hide the standard navigation.
 *
 * @param headerContent - Custom header content to render in the top bar
 * @param contentKey - Key to identify when content should update.
 *                     When the key changes, header content will be updated.
 */
export function useDetailModeEffect(headerContent: ReactNode, contentKey: string) {
  const { enterDetailMode, exitDetailMode, setHeaderContent } = useDetailMode();

  // Enter detail mode on mount, exit on unmount
  useEffect(() => {
    enterDetailMode();
    return () => {
      exitDetailMode();
    };
  }, [enterDetailMode, exitDetailMode]);

  // Update header content when contentKey changes.
  // We intentionally exclude headerContent from deps to avoid infinite loops
  // caused by JSX elements creating new references on each render.
  // The contentKey serves as a stable identifier for when content should update.
  // biome-ignore lint/correctness/useExhaustiveDependencies: contentKey is intentionally used as the trigger instead of headerContent to avoid infinite loops from JSX reference changes.
  useEffect(() => {
    setHeaderContent(headerContent);
  }, [contentKey, setHeaderContent]);
}
