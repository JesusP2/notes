import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "@/db/migrations";

export async function createTestDb() {
  const db = await PGlite.create();
  await runMigrations(db);
  return db;
}

export async function seedTestData(db: PGlite) {
  await db.query(
    "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    ["folder-1", "folder", "Test Folder"],
  );
  await db.query(
    "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
    ["edge-1", "folder-1", "root", "part_of"],
  );
}

export function waitForLiveUpdate(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
