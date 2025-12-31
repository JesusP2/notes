import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_/todos")({
  component: RouteComponent,
  beforeLoad: () => console.log("beforeLoad todos route"),
});

function RouteComponent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <header className="mb-4">
        <h1 className="font-bold text-2xl">Test Template</h1>
      </header>
    </div>
  );
}
