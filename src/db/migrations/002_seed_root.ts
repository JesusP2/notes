import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 2,
  name: "seed_root_folder",
  up: async (db: PGlite) => {
    await db.query(
      `INSERT INTO nodes (id, type, title, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      ["root", "folder", "Root"],
    );
  },
};
