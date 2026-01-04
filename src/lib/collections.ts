import type { PGlite } from "@electric-sql/pglite";
import { createCollection } from "@tanstack/db";
import { drizzleCollectionOptions } from "tanstack-db-pglite";
import { runMigrations } from "@/db/migrations";
import {
  canvasLinks,
  canvasScenes,
  edgeMetadata,
  edges,
  nodeVersions,
  nodes,
  tasks,
  templatesMeta,
  todos,
  userNodePrefs,
  userSettings,
  users,
} from "@/db/schema/graph";
import { drizzleInstance, pgliteInstance } from "@/lib/pglite";

type DrizzleDb = typeof drizzleInstance;

let migrationsPromise: Promise<void> | null = null;

async function ensureMigrations(db: PGlite) {
  if (!migrationsPromise) {
    migrationsPromise = runMigrations(db);
  }

  await migrationsPromise;
}

function createCollections(db: DrizzleDb, pglite: PGlite) {
  const prepare = async () => {
    await ensureMigrations(pglite);
  };

  return {
    usersCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: users,
        primaryColumn: users.id,
        prepare,
      }),
    ),
    nodesCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: nodes,
        primaryColumn: nodes.id,
        prepare,
      }),
    ),
    edgesCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: edges,
        primaryColumn: edges.id,
        prepare,
      }),
    ),
    edgeMetadataCollection: createCollection({
      ...drizzleCollectionOptions({
        db,
        table: edgeMetadata,
        primaryColumn: edgeMetadata.edgeId,
        prepare,
      }),
      getKey: (item) => item.edgeId,
    }),
    userSettingsCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: userSettings,
        primaryColumn: userSettings.id,
        prepare,
      }),
    ),
    userNodePrefsCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: userNodePrefs,
        primaryColumn: userNodePrefs.id,
        prepare,
      }),
    ),
    templatesMetaCollection: createCollection({
      ...drizzleCollectionOptions({
        db,
        table: templatesMeta,
        primaryColumn: templatesMeta.nodeId,
        prepare,
      }),
      getKey: (item) => item.nodeId,
    }),
    nodeVersionsCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: nodeVersions,
        primaryColumn: nodeVersions.id,
        prepare,
      }),
    ),
    tasksCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: tasks,
        primaryColumn: tasks.id,
        prepare,
      }),
    ),
    todosCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: todos,
        primaryColumn: todos.id,
        prepare,
      }),
    ),
    canvasScenesCollection: createCollection({
      ...drizzleCollectionOptions({
        db,
        table: canvasScenes,
        primaryColumn: canvasScenes.canvasId,
        prepare,
      }),
      getKey: (item) => item.canvasId,
    }),
    canvasLinksCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: canvasLinks,
        primaryColumn: canvasLinks.id,
        prepare,
      }),
    ),
  };
}

type Collections = ReturnType<typeof createCollections>;

let collections: Collections | null = null;

function getOrCreateCollections(): Collections {
  if (!collections) {
    collections = createCollections(drizzleInstance, pgliteInstance);
  }
  return collections;
}

// Lazy getters - collections are only created when first accessed
export const usersCollection = new Proxy({} as Collections["usersCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().usersCollection, prop);
  },
});

export const nodesCollection = new Proxy({} as Collections["nodesCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().nodesCollection, prop);
  },
});

export const edgesCollection = new Proxy({} as Collections["edgesCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().edgesCollection, prop);
  },
});

export const edgeMetadataCollection = new Proxy({} as Collections["edgeMetadataCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().edgeMetadataCollection, prop);
  },
});

export const userSettingsCollection = new Proxy({} as Collections["userSettingsCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().userSettingsCollection, prop);
  },
});

export const userNodePrefsCollection = new Proxy({} as Collections["userNodePrefsCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().userNodePrefsCollection, prop);
  },
});

export const templatesMetaCollection = new Proxy({} as Collections["templatesMetaCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().templatesMetaCollection, prop);
  },
});

export const nodeVersionsCollection = new Proxy({} as Collections["nodeVersionsCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().nodeVersionsCollection, prop);
  },
});

export const tasksCollection = new Proxy({} as Collections["tasksCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().tasksCollection, prop);
  },
});

export const todosCollection = new Proxy({} as Collections["todosCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().todosCollection, prop);
  },
});

export const canvasScenesCollection = new Proxy({} as Collections["canvasScenesCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().canvasScenesCollection, prop);
  },
});

export const canvasLinksCollection = new Proxy({} as Collections["canvasLinksCollection"], {
  get(_target, prop) {
    return Reflect.get(getOrCreateCollections().canvasLinksCollection, prop);
  },
});

export function resetCollectionsForDb(
  db: DrizzleDb = drizzleInstance,
  pglite: PGlite = pgliteInstance,
) {
  migrationsPromise = null;
  collections = createCollections(db, pglite);
}

export async function preloadCoreCollections() {
  await Promise.all([
    usersCollection.preload(),
    nodesCollection.preload(),
    edgesCollection.preload(),
    userSettingsCollection.preload(),
    userNodePrefsCollection.preload(),
    tasksCollection.preload(),
    todosCollection.preload(),
  ]);
}
