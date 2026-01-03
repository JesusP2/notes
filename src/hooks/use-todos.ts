import { ulid } from "ulidx";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { todosCollection, type TodoRow } from "@/lib/todos-db";
import { useLiveQuery } from "@tanstack/react-db";

export function useTodos() {
  const userId = useCurrentUserId();
  const todos = useLiveQuery((q) => q.from({ todos: todosCollection }));

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

  const toggleTodo = (todo: TodoRow) =>
    todosCollection.update(todo.id, (draft) => {
      draft.isDone = !todo.isDone;
      draft.updatedAt = new Date();
    });
  const deleteTodo = (todo: TodoRow) => todosCollection.delete(todo.id);

  const sortedTodos = todos.data.sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );

  return {
    todos: sortedTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}
