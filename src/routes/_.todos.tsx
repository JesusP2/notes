import { PGliteProvider, useLiveQuery, usePGlite } from "@electric-sql/pglite-react";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export const Route = createFileRoute("/_/todos")({
  component: RouteComponent,
});

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
};

function RouteComponent() {
  return <TodosWithProvider />;
}

function TodosWithProvider() {
  const context = useRouteContext({
    from: "/_/todos",
  });
  console.log("context;", context);
  if (!context.db) return <div>Loading...</div>;

  return (
    <PGliteProvider db={context.db}>
      <TodoList />
    </PGliteProvider>
  );
}

function TodoList() {
  const db = usePGlite();
  const [newTodo, setNewTodo] = useState("");
  const [isPending, startTransition] = useTransition();

  const todos = useLiveQuery<Todo>("SELECT * FROM todos ORDER BY created_at DESC");

  const addTodo = () => {
    if (!newTodo.trim()) {
      return;
    }

    startTransition(async () => {
      await db.query("INSERT INTO todos (title) VALUES ($1)", [newTodo.trim()]);
      setNewTodo("");
    });
  };

  const toggleTodo = (id: number, completed: boolean) => {
    startTransition(async () => {
      await db.query("UPDATE todos SET completed = $1 WHERE id = $2", [!completed, id]);
    });
  };

  const deleteTodo = (id: number) => {
    startTransition(async () => {
      await db.query("DELETE FROM todos WHERE id = $1", [id]);
    });
  };

  const clearCompleted = () => {
    startTransition(async () => {
      await db.query("DELETE FROM todos WHERE completed = true");
    });
  };

  const completedCount = todos?.rows.filter((t) => t.completed).length ?? 0;
  const totalCount = todos?.rows.length ?? 0;

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-bold text-2xl">Todo List</h1>
        <p className="text-muted-foreground text-sm">Powered by PGlite (Postgres in WASM)</p>
      </header>

      <div className="mb-6 flex gap-2">
        <Input
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="What needs to be done?"
          value={newTodo}
        />
        <Button disabled={isPending || !newTodo.trim()} onClick={addTodo}>
          Add
        </Button>
      </div>

      {todos ? (
        todos.rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No todos yet. Add one above!</p>
        ) : (
          <ul className="space-y-2">
            {todos.rows.map((todo) => (
              <li className="flex items-center gap-3 rounded-lg border p-3" key={todo.id}>
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => toggleTodo(todo.id, todo.completed)}
                />
                <span
                  className={`flex-1 ${todo.completed ? "text-muted-foreground line-through" : ""}`}
                >
                  {todo.title}
                </span>
                <Button onClick={() => deleteTodo(todo.id)} size="sm" variant="ghost">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="flex items-center justify-center py-8">
          <Spinner className="size-6" />
        </div>
      )}

      {totalCount > 0 && (
        <footer className="mt-6 flex items-center justify-between text-muted-foreground text-sm">
          <span>
            {completedCount} of {totalCount} completed
          </span>
          {completedCount > 0 && (
            <Button onClick={clearCompleted} size="sm" variant="ghost">
              Clear completed
            </Button>
          )}
        </footer>
      )}
    </div>
  );
}
