import { PGlite } from "@electric-sql/pglite";
import { live } from "@electric-sql/pglite/live";
import { runMigrations } from "@/db/migrations";

export async function createTestDb() {
  const db = await PGlite.create({
    extensions: { live },
  });
  await runMigrations(db);
  return db;
}

export function waitForLiveUpdate(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
