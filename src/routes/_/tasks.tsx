import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks, useTaskMutations } from "@/lib/graph-hooks";

export const Route = createFileRoute("/_/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const tasks = useTasks({ showDone: true });
  const { toggleTask } = useTaskMutations();

  const openTasks = tasks.filter((task) => !task.isDone);
  const doneTasks = tasks.filter((task) => task.isDone);

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="max-w-3xl mx-auto w-full px-8 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Tasks</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Open
          </h2>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks.</p>
          ) : (
            <div className="space-y-2">
              {openTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    checked={task.isDone}
                    onCheckedChange={() => {
                      void toggleTask(task.id, !task.isDone);
                    }}
                    aria-label="Toggle task"
                  />
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{task.content}</div>
                    <Link
                      to="/notes/$noteId"
                      params={{ noteId: task.noteId }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {task.noteTitle}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Completed
          </h2>
          {doneTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {doneTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    checked={task.isDone}
                    onCheckedChange={() => {
                      void toggleTask(task.id, !task.isDone);
                    }}
                    aria-label="Toggle task"
                  />
                  <div className="space-y-1">
                    <div className="text-sm line-through text-muted-foreground">{task.content}</div>
                    <Link
                      to="/notes/$noteId"
                      params={{ noteId: task.noteId }}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {task.noteTitle}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
