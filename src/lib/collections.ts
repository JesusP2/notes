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
    edgeMetadataCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: edgeMetadata,
        primaryColumn: edgeMetadata.edgeId,
        prepare,
      }),
    ),
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
    templatesMetaCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: templatesMeta,
        primaryColumn: templatesMeta.nodeId,
        prepare,
      }),
    ),
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
    canvasScenesCollection: createCollection(
      drizzleCollectionOptions({
        db,
        table: canvasScenes,
        primaryColumn: canvasScenes.canvasId,
        prepare,
      }),
    ),
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

let collections = createCollections(drizzleInstance, pgliteInstance);

export let usersCollection = collections.usersCollection;
export let nodesCollection = collections.nodesCollection;
export let edgesCollection = collections.edgesCollection;
export let edgeMetadataCollection = collections.edgeMetadataCollection;
export let userSettingsCollection = collections.userSettingsCollection;
export let userNodePrefsCollection = collections.userNodePrefsCollection;
export let templatesMetaCollection = collections.templatesMetaCollection;
export let nodeVersionsCollection = collections.nodeVersionsCollection;
export let tasksCollection = collections.tasksCollection;
export let todosCollection = collections.todosCollection;
export let canvasScenesCollection = collections.canvasScenesCollection;
export let canvasLinksCollection = collections.canvasLinksCollection;

function applyCollections(next: Collections) {
  usersCollection = next.usersCollection;
  nodesCollection = next.nodesCollection;
  edgesCollection = next.edgesCollection;
  edgeMetadataCollection = next.edgeMetadataCollection;
  userSettingsCollection = next.userSettingsCollection;
  userNodePrefsCollection = next.userNodePrefsCollection;
  templatesMetaCollection = next.templatesMetaCollection;
  nodeVersionsCollection = next.nodeVersionsCollection;
  tasksCollection = next.tasksCollection;
  todosCollection = next.todosCollection;
  canvasScenesCollection = next.canvasScenesCollection;
  canvasLinksCollection = next.canvasLinksCollection;
}

export function resetCollectionsForDb(
  db: DrizzleDb = drizzleInstance,
  pglite: PGlite = pgliteInstance,
) {
  migrationsPromise = null;
  collections = createCollections(db, pglite);
  applyCollections(collections);
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
