import { userSettings as userSettingsTable } from "@/db/schema/auth";
import { generateTxId } from "@/shared/generate-txid";
import { createServerFn } from "@tanstack/react-start";
import { userSettingsSchema } from "./schema";
import { authMiddleware } from "@/shared/middleware";
import { eq, and } from "drizzle-orm";

export const createUserSettings = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(userSettingsSchema)
  .handler(async ({ data, context }) => {
    if (context.session.user.id !== data.user_id) {
      throw new Error("Invalid request");
    }
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
      const [item] = await tx
        .update(userSettingsTable)
        .set(data)
        .where(
          and(
            eq(userSettingsTable.id, data.id),
            eq(userSettingsTable.user_id, context.session.user.id)
          )
        )
        .returning();
      return {
        item,
        txid,
      };
    });
    return result;
  });
