import { createFileRoute, Outlet } from "@tanstack/react-router";
import { dbPromise } from "@/lib/pglite";

export const Route = createFileRoute("/_")({
  component: RouteComponent,
  ssr: false,
  beforeLoad: async () => {
    const db = await dbPromise;
    return {
      db: db as any,
    };
  },
});

function RouteComponent() {
  return <Outlet />;
}
