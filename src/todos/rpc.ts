import { createServerFn } from "@tanstack/react-start";
import { todos as todosTable } from "@/db/schema/auth";
import { generateTxId } from "@/shared/generate-txid";
import { authMiddleware } from "@/shared/middleware";
import { todoSchema } from "./schema";

export const createTodo = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(todoSchema)
  .handler(async ({ data, context }) => {
    const result = await context.db.transaction(async (tx) => {
      const txid = await generateTxId(tx);
      const [item] = await tx.insert(todosTable).values(data).returning();
      return {
        item,
        txid,
      };
    });
    return result;
  });
