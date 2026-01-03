import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema/graph";

export let pgliteInstance = new PGlite({
  dataDir: "idb://notes-graph-db",
});

export let drizzleInstance = drizzle(pgliteInstance, { schema });

export function setPgliteInstance(db: PGlite) {
  pgliteInstance = db;
  drizzleInstance = drizzle(pgliteInstance, { schema });
}
