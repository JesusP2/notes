import { PGliteProvider } from "@electric-sql/pglite-react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useCallback, useState, useTransition } from "react";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { ShortcutsDialog } from "@/components/help/shortcuts-dialog";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppSettingsProvider } from "@/components/providers/app-settings";
import { ThemeProvider, useTheme } from "@/components/providers/theme-provider";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CurrentUserProvider, ROOT_TAG_ID } from "@/hooks/use-current-user";
import { useUserSetting } from "@/hooks/use-user-settings";
import { useNodeMutations } from "@/lib/graph-hooks";
import { SHORTCUTS } from "@/lib/shortcuts";
import { useShortcut } from "@/lib/use-shortcut";
import { pgliteInstance } from "@/lib/pglite";
import { todosCollection } from "@/lib/todos-db";

export const Route = createFileRoute("/_")({
  component: RouteComponent,
  ssr: false,
  beforeLoad: async () => {
    await todosCollection.preload();
  },
});

function RouteComponent() {
  return (
    <PGliteProvider db={pgliteInstance}>
      <MainLayout />
    </PGliteProvider>
  );
}

function MainLayout() {
  return (
    <CurrentUserProvider>
      <ThemeProvider defaultTheme="system" enableSystem>
        <MainLayoutContent />
      </ThemeProvider>
    </CurrentUserProvider>
  );
}

type SidebarLayout = {
  sidebarSize: number;
  collapsed: boolean;
};

const DEFAULT_SIDEBAR_LAYOUT: SidebarLayout = {
  sidebarSize: 22,
  collapsed: false,
};

function MainLayoutContent() {
  const [layout, setLayout] = useUserSetting<SidebarLayout>(
    "layout.sidebar",
    DEFAULT_SIDEBAR_LAYOUT,
  );

  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      const nextCollapsed = !open;
      if (nextCollapsed === layout.collapsed) return;
      void setLayout({ ...layout, collapsed: nextCollapsed });
    },
    [layout, setLayout],
  );

  return (
    <SidebarProvider
      open={!layout.collapsed}
      onOpenChange={handleSidebarOpenChange}
    >
      <MainLayoutShell />
    </SidebarProvider>
  );
}

function MainLayoutShell() {
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const { createNote, createTag } = useNodeMutations();
  const [, startTransition] = useTransition();
  const [vimEnabled, setVimEnabledSetting] = useUserSetting<boolean>(
    "vim_enabled",
    false,
  );
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const handleCreateNote = useCallback(() => {
    startTransition(async () => {
      const note = await createNote("Untitled Note", ROOT_TAG_ID);
      navigate({ to: "/notes/$noteId", params: { noteId: note.id } });
    });
  }, [createNote, navigate]);

  const handleCreateTag = useCallback(() => {
    startTransition(async () => {
      await createTag("New Tag", ROOT_TAG_ID);
    });
  }, [createTag]);

  const handleShowShortcuts = useCallback(() => {
    setShortcutsOpen(true);
  }, []);

  const handleSetVimEnabled = useCallback(
    (next: boolean) => {
      void setVimEnabledSetting(next);
    },
    [setVimEnabledSetting],
  );

  useShortcut(SHORTCUTS.TOGGLE_SIDEBAR, toggleSidebar);
  useShortcut(SHORTCUTS.TOGGLE_THEME, toggleTheme);
  useShortcut(SHORTCUTS.NEW_NOTE, handleCreateNote);
  useShortcut(SHORTCUTS.NEW_TAG, handleCreateTag);
  useShortcut(SHORTCUTS.GRAPH_VIEW, () => navigate({ to: "/graph" }));
  useShortcut(SHORTCUTS.GO_HOME, () => navigate({ to: "/" }));
  useShortcut(SHORTCUTS.SHOW_SHORTCUTS, handleShowShortcuts);

  return (
    <AppSettingsProvider
      value={{
        isSidebarCollapsed: isCollapsed,
        toggleSidebar,
        vimEnabled,
        setVimEnabled: handleSetVimEnabled,
      }}
    >
      <CommandPalette
        onCreateNote={handleCreateNote}
        onCreateTag={handleCreateTag}
        onToggleSidebar={toggleSidebar}
        onToggleTheme={toggleTheme}
        onShowShortcuts={handleShowShortcuts}
        isDarkMode={resolvedTheme === "dark"}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <AppSidebar />
      <SidebarInset>
        <Tooltip>
          <TooltipTrigger
            render={
              <SidebarTrigger className="absolute top-2 left-2 z-10 h-8 w-8 opacity-60 hover:opacity-100" />
            }
          />
          <TooltipContent className="flex items-center gap-2">
            <span>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
            <ShortcutHint shortcut={SHORTCUTS.TOGGLE_SIDEBAR} />
          </TooltipContent>
        </Tooltip>
        <Outlet />
      </SidebarInset>
      <Toaster richColors />
    </AppSettingsProvider>
  );
}
