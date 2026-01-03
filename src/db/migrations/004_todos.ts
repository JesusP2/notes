import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 4,
  name: "todos_table",
  up: async (db: PGlite) => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE DEFAULT 'local',
        title TEXT NOT NULL,
        is_done BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
      CREATE INDEX IF NOT EXISTS idx_todos_done ON todos(user_id, is_done);
    `);
  },
};
