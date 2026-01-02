import { PGliteProvider } from "@electric-sql/pglite-react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { ShortcutsDialog } from "@/components/help/shortcuts-dialog";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppSettingsProvider } from "@/components/providers/app-settings";
import { ThemeProvider, useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { ShortcutHint } from "@/components/ui/shortcut-hint";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CurrentUserProvider, ROOT_TAG_ID } from "@/hooks/use-current-user";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { useUserSetting } from "@/hooks/use-user-settings";
import { useNodeMutations } from "@/lib/graph-hooks";
import { dbPromise } from "@/lib/pglite";
import { SHORTCUTS } from "@/lib/shortcuts";
import { useShortcut } from "@/lib/use-shortcut";

export const Route = createFileRoute("/_")({
  component: RouteComponent,
  ssr: false,
  beforeLoad: async () => {
    const db = await dbPromise;
    return {
      db: db?.db ?? null,
      pglite: db?.pglite ?? null,
    };
  },
});

function RouteComponent() {
  const { pglite } = Route.useRouteContext();

  if (!pglite) {
    return <div>Loading...</div>;
  }

  return (
    <PGliteProvider db={pglite}>
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
  const navigate = useNavigate();
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const { createNote, createTag } = useNodeMutations();
  const [, startTransition] = useTransition();
  const [vimEnabled, setVimEnabledSetting] = useUserSetting<boolean>("vim_enabled", false);
  const [layout, setLayout] = useUserSetting<SidebarLayout>(
    "layout.sidebar",
    DEFAULT_SIDEBAR_LAYOUT,
  );
  const { call: persistLayout } = useDebouncedCallback((next: SidebarLayout) => {
    void setLayout(next);
  }, 200);

  const isCollapsed = layout.collapsed;

  const toggleSidebar = useCallback(() => {
    const panel = sidebarRef.current;
    if (!panel) return;

    if (isCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }, [isCollapsed]);

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

  const handleLayoutChange = useCallback(
    (sizes: number[]) => {
      const sidebarSize = sizes[0] ?? DEFAULT_SIDEBAR_LAYOUT.sidebarSize;
      const collapsed = sidebarSize === 0;
      persistLayout({
        sidebarSize: collapsed ? layout.sidebarSize : sidebarSize,
        collapsed,
      });
    },
    [layout.sidebarSize, persistLayout],
  );

  useEffect(() => {
    const panel = sidebarRef.current;
    if (!panel) return;
    if (layout.collapsed) {
      panel.collapse();
      return;
    }
    panel.resize(layout.sidebarSize);
  }, [layout.collapsed, layout.sidebarSize]);

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
      <ResizablePanelGroup className="h-svh" direction="horizontal" onLayout={handleLayoutChange}>
        <ResizablePanel
          ref={sidebarRef}
          defaultSize={layout.sidebarSize}
          minSize={15}
          maxSize={40}
          collapsible
          collapsedSize={0}
        >
          <AppSidebar />
        </ResizablePanel>
        <ResizableHandle className="hover:bg-primary/20 w-1" />
        <ResizablePanel>
          <main className="flex h-full flex-col relative">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-2 z-10 h-8 w-8 opacity-60 hover:opacity-100"
                  />
                }
                onClick={toggleSidebar}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <PanelLeftOpenIcon className="size-4" />
                ) : (
                  <PanelLeftCloseIcon className="size-4" />
                )}
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
                <ShortcutHint shortcut={SHORTCUTS.TOGGLE_SIDEBAR} />
              </TooltipContent>
            </Tooltip>
            <Outlet />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
      <Toaster richColors />
    </AppSettingsProvider>
  );
}
