import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema/graph";

let _pgliteInstance: PGlite | null = null;
let _drizzleInstance: ReturnType<typeof drizzle> | null = null;

const isTestEnv =
  typeof process !== "undefined" &&
  (process.env.VITEST === "true" || process.env.NODE_ENV === "test");

function createDefaultPglite() {
  if (isTestEnv) {
    return new PGlite();
  }
  return new PGlite({ dataDir: "idb://notes-graph-db" });
}

export function getPgliteInstance(): PGlite {
  if (!_pgliteInstance) {
    _pgliteInstance = createDefaultPglite();
  }
  return _pgliteInstance;
}

export function getDrizzleInstance() {
  if (!_drizzleInstance) {
    _drizzleInstance = drizzle(getPgliteInstance(), { schema });
  }
  return _drizzleInstance;
}

export function setPgliteInstance(db: PGlite) {
  _pgliteInstance = db;
  _drizzleInstance = drizzle(db, { schema });
}

export const pgliteInstance = new Proxy({} as PGlite, {
  get(_target, prop) {
    const instance = getPgliteInstance();
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export const drizzleInstance = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const instance = getDrizzleInstance();
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
