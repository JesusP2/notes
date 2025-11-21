import { useLiveQuery } from "@tanstack/react-db";
import { todosCollection } from "@/todos/collection";

export function TodosList() {
  const query = useLiveQuery((q) => q.from({ todosCollection }));
  return (
    <ul>
      {query.data.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
