import { useLiveQuery } from "@tanstack/react-db";
import { ulid } from "ulidx";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { todosCollection, type TodoRow } from "@/lib/todos-db";

export function useTodos() {
  const userId = useCurrentUserId();
  const todosQuery = useLiveQuery((q) => q.from({ todos: todosCollection }));

  const addTodo = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const now = new Date();
    const tx = todosCollection.insert({
      id: ulid(),
      userId,
      title: trimmed,
      isDone: false,
      createdAt: now,
      updatedAt: now,
    });
    await tx.isPersisted.promise;
  };

  const toggleTodo = async (todo: TodoRow) => {
    const tx = todosCollection.update(todo.id, (draft) => {
      draft.isDone = !todo.isDone;
      draft.updatedAt = new Date();
    });
    await tx.isPersisted.promise;
  };

  const deleteTodo = async (todo: TodoRow) => {
    const tx = todosCollection.delete(todo.id);
    await tx.isPersisted.promise;
  };

  const todos = todosQuery.data ?? [];
  const sortedTodos = [...todos].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );

  return {
    todos: sortedTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}
