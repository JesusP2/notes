import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 5,
  name: "user_settings_id",
  up: async (db: PGlite) => {
    await db.exec(`
      ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS id TEXT;
      UPDATE user_settings
        SET id = user_id || ':' || key
        WHERE id IS NULL;
      ALTER TABLE user_settings ALTER COLUMN id SET NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_id ON user_settings(id);
    `);
  },
};
