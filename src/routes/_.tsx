import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PGliteProvider } from "@electric-sql/pglite-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarProvider } from "@/components/ui/sidebar";
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

  if (!pglite) {
    return <div>Loading...</div>;
  }

  return (
    <PGliteProvider db={pglite}>
      <SidebarProvider>
        <ResizablePanelGroup autoSaveId="app-layout" className="h-svh" direction="horizontal">
          <ResizablePanel defaultSize={22} minSize={15} maxSize={40}>
            <AppSidebar />
          </ResizablePanel>
          <ResizableHandle className="hover:bg-primary/20 w-1" />
          <ResizablePanel>
            <main className="flex h-full flex-col">
              <Outlet />
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarProvider>
    </PGliteProvider>
  );
}
