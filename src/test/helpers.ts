import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "@/db/migrations";
import { preloadCoreCollections, resetCollectionsForDb } from "@/lib/collections";
import { setPgliteInstance } from "@/lib/pglite";

export async function createTestDb() {
  const db = await PGlite.create();
  setPgliteInstance(db);
  resetCollectionsForDb();
  await runMigrations(db);
  await preloadCoreCollections();
  return db;
}

export async function reloadCollectionsFromDb() {
  resetCollectionsForDb();
  await preloadCoreCollections();
}

export function waitForLiveUpdate(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
