import { userSettings as userSettingsTable } from "@/db/schema/auth";
import { generateTxId } from "@/shared/generate-txid";
import { createServerFn } from "@tanstack/react-start";
import { userSettingsSchema } from "./schema";
import { authMiddleware } from "@/shared/middleware";

export const createUserSettings = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(userSettingsSchema)
  .handler(async ({ data, context }) => {
    const result = await context.db.transaction(async (tx) => {
      const txid = await generateTxId(tx);
      const [item] = await tx
        .insert(userSettingsTable)
        .values(data)
        .returning();
      return {
        item,
        txid,
      };
    });
    return result;
  });

export const updateUserSettings = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(userSettingsSchema)
  .handler(async ({ data, context }) => {
    const result = await context.db.transaction(async (tx) => {
      const txid = await generateTxId(tx);
      const [item] = await tx.update(userSettingsTable).set(data).returning();
      return {
        item,
        txid,
      };
    });
    return result;
  });
