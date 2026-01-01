import { PGliteProvider } from "@electric-sql/pglite-react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { dbPromise } from "@/lib/pglite";

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
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!pglite) {
    return <div>Loading...</div>;
  }

  const toggleSidebar = () => {
    const panel = sidebarRef.current;
    if (!panel) return;

    if (isCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  };

  return (
    <PGliteProvider db={pglite}>
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
    </PGliteProvider>
  );
}
