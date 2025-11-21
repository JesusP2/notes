import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import Loader from "@/components/loader";
import { ThemeButton } from "@/theme/theme-button";
import ThemePresetSelect from "@/theme/theme-preset-select";
import { TodosForm } from "@/todos/form";
import { TodosList } from "@/todos/list";

export const Route = createFileRoute("/_/todos")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <header className="mb-4">
        <h1 className="font-bold text-2xl">Test Template</h1>
        <ThemeButton />
      </header>
      <ThemePresetSelect />
      <Suspense fallback={<Loader />}>
        <TodosForm />
      </Suspense>
      <ClientOnly>
        <TodosList />
      </ClientOnly>
    </div>
  );
}
