import { createCollection } from "@tanstack/db";
import { drizzleCollectionOptions } from "tanstack-db-pglite";
import { todos } from "@/db/schema/graph";
import { drizzleInstance, pgliteInstance } from "@/lib/pglite";
import { runMigrations } from "@/db/migrations";

export type TodoRow = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

export const todosCollection = createCollection(
  drizzleCollectionOptions({
    db: drizzleInstance,
    table: todos,
    primaryColumn: todos.id,
    prepare: async () => {
      await runMigrations(pgliteInstance);
    },
  }),
);
