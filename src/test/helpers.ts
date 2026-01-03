import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "@/db/migrations";
import { resetCollectionsForDb } from "@/lib/collections";
import { setPgliteInstance } from "@/lib/pglite";

export async function createTestDb() {
  const db = await PGlite.create();
  setPgliteInstance(db);
  resetCollectionsForDb();
  await runMigrations(db);
  return db;
}

export function waitForLiveUpdate(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
