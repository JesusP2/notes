import { createFileRoute } from "@tanstack/react-router";
import { dbPromise } from "@/lib/pglite";
import { Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_")({
  component: RouteComponent,
  beforeLoad: async () => {
    const db = await dbPromise;
    return {
      db: db as any,
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
