import { todos } from "@/db/schema/graph";
import { todosCollection } from "@/lib/collections";

export type TodoRow = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

export { todosCollection };
