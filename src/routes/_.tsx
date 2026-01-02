import { PGliteProvider } from "@electric-sql/pglite-react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useRef, useState, useTransition } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { ShortcutsDialog } from "@/components/help/shortcuts-dialog";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
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
  const navigate = useNavigate();
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const { createNote, createTag } = useNodeMutations();
  const [, startTransition] = useTransition();

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
      const note = await createNote("Untitled Note", "root");
      navigate({ to: "/notes/$noteId", params: { noteId: note.id } });
    });
  }, [createNote, navigate]);

  const handleCreateTag = useCallback(() => {
    startTransition(async () => {
      await createTag("New Tag", "root");
    });
  }, [createTag]);

  const handleShowShortcuts = useCallback(() => {
    setShortcutsOpen(true);
  }, []);

  useShortcut(SHORTCUTS.TOGGLE_SIDEBAR, toggleSidebar);
  useShortcut(SHORTCUTS.TOGGLE_THEME, toggleTheme);
  useShortcut(SHORTCUTS.NEW_NOTE, handleCreateNote);
  useShortcut(SHORTCUTS.NEW_TAG, handleCreateTag);
  useShortcut(SHORTCUTS.GRAPH_VIEW, () => navigate({ to: "/graph" }));
  useShortcut(SHORTCUTS.GO_HOME, () => navigate({ to: "/" }));
  useShortcut(SHORTCUTS.SHOW_SHORTCUTS, handleShowShortcuts);

  return (
    <>
      <CommandPalette
        onCreateNote={handleCreateNote}
        onCreateTag={handleCreateTag}
        onToggleSidebar={toggleSidebar}
        onToggleTheme={toggleTheme}
        onShowShortcuts={handleShowShortcuts}
        isDarkMode={resolvedTheme === "dark"}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ResizablePanelGroup autoSaveId="app-layout" className="h-svh" direction="horizontal">
        <ResizablePanel
          ref={sidebarRef}
          defaultSize={22}
          minSize={15}
          maxSize={40}
          collapsible
          collapsedSize={0}
          onCollapse={() => setIsCollapsed(true)}
          onExpand={() => setIsCollapsed(false)}
        >
          <AppSidebar />
        </ResizablePanel>
        <ResizableHandle className="hover:bg-primary/20 w-1" />
        <ResizablePanel>
          <main className="flex h-full flex-col relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="absolute top-2 left-2 z-10 h-8 w-8 opacity-60 hover:opacity-100"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpenIcon className="size-4" />
              ) : (
                <PanelLeftCloseIcon className="size-4" />
              )}
            </Button>
            <Outlet />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
