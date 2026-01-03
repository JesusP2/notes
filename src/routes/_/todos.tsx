import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useTodos } from "@/hooks/use-todos";

export const Route = createFileRoute("/_/todos")({
  component: TodosPage,
});

function TodosPage() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
  const openTodos = todos.filter((todo) => !todo.isDone);
  const doneTodos = todos.filter((todo) => todo.isDone);
  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const newTodoTitle = new FormData(e.target as any).get("newTodoTitle") as string;
    if (!newTodoTitle.trim()) return;
    e.target.newTodoTitle.value = "";
    addTodo(newTodoTitle);
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl space-y-8 px-8 py-8">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Todos</h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal tasks
            </p>
          </div>
        </div>

        <form onSubmit={handleAddTodo} className="flex gap-3">
          <Input
            name="newTodoTitle"
            placeholder="What needs to be done?"
            className="h-10 text-base shadow-sm focus-visible:ring-primary/20"
            autoFocus
          />
          <Button type="submit" className="h-10 px-6 font-medium shadow-sm">
            Add
          </Button>
        </form>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              In Progress
              <span className="ml-auto text-[10px] font-normal opacity-70">
                {openTodos.length} items
              </span>
            </h2>

            {openTodos.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
                No open tasks. Time to add some!
              </div>
            ) : (
              <div className="grid gap-2">
                {openTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="group flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
                  >
                    <Checkbox
                      checked={todo.isDone}
                      onCheckedChange={() => void toggleTodo(todo)}
                      className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex-1 space-y-1 pt-0.5">
                      <p className="text-sm font-medium leading-none">
                        {todo.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(todo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => void deleteTodo(todo)}
                      className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      aria-label="Delete todo"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Completed
              <span className="ml-auto text-[10px] font-normal opacity-70">
                {doneTodos.length} items
              </span>
            </h2>

            {doneTodos.length > 0 && (
              <div className="grid gap-2">
                {doneTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="group flex items-center gap-3 rounded-lg border bg-muted/30 p-3 opacity-70 transition-all hover:opacity-100"
                  >
                    <Checkbox
                      checked={todo.isDone}
                      onCheckedChange={() => void toggleTodo(todo)}
                      className="data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
                    />
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-medium leading-none line-through text-muted-foreground">
                        {todo.title}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => void deleteTodo(todo)}
                      className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      aria-label="Delete todo"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {doneTodos.length === 0 && openTodos.length > 0 && (
              <p className="text-sm text-muted-foreground italic pl-2">
                Get to work!
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
