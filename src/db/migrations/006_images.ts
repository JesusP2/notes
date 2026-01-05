import type { PGlite } from "@electric-sql/pglite";

export const migration = {
  version: 6,
  name: "images_metadata",
  up: async (db: PGlite) => {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blob_key TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        filename TEXT,
        synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_images_user ON images(user_id);
      CREATE INDEX IF NOT EXISTS idx_images_blob_key ON images(blob_key);
      CREATE INDEX IF NOT EXISTS idx_images_synced ON images(user_id, synced_at);
    `);
  },
};
