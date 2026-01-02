import { createContext, useContext, type ReactNode } from "react";

export type AppSettingsContextValue = {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  vimEnabled: boolean;
  setVimEnabled: (next: boolean) => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppSettingsContextValue;
}) {
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return context;
}
