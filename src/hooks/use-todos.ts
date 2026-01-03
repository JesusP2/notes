import { useLiveQuery } from "@tanstack/react-db";
import { ulid } from "ulidx";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { todosCollection, type TodoRow } from "@/lib/todos-db";

export function useTodos() {
  const userId = useCurrentUserId();
  const todosQuery = useLiveQuery((q) => q.from({ todos: todosCollection }));

  const addTodo = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const now = new Date();
    todosCollection.insert({
      id: ulid(),
      userId,
      title: trimmed,
      isDone: false,
      createdAt: now,
      updatedAt: now,
    });
  };

  const toggleTodo = (todo: TodoRow) => {
    todosCollection.update(todo.id, (draft) => {
      draft.isDone = !todo.isDone;
      draft.updatedAt = new Date();
    });
  };

  const deleteTodo = (todo: TodoRow) => {
    todosCollection.delete(todo.id);
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
