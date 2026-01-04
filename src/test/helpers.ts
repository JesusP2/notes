import { PGlite } from "@electric-sql/pglite";
import { runMigrations } from "@/db/migrations";
import {
  edgesCollection,
  nodesCollection,
  preloadCoreCollections,
  resetCollectionsForDb,
  usersCollection,
} from "@/lib/collections";
import { setPgliteInstance } from "@/lib/pglite";
import type { EdgeType, NodeType } from "@/db/schema/graph";

export const TEST_USER_ID = "test-user";

export async function createTestDb() {
  const db = await PGlite.create();
  setPgliteInstance(db);
  resetCollectionsForDb();
  await runMigrations(db);
  await preloadCoreCollections();
  await seedTestUser();
  return db;
}

async function seedTestUser() {
  const existing = usersCollection.state.get(TEST_USER_ID);
  if (!existing) {
    usersCollection.insert({
      id: TEST_USER_ID,
      username: "testuser",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export function insertTestNode(data: {
  id: string;
  type: NodeType;
  title: string;
  content?: string;
  color?: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  const now = new Date();
  nodesCollection.insert({
    id: data.id,
    userId: TEST_USER_ID,
    type: data.type,
    title: data.title,
    content: data.content ?? null,
    excerpt: null,
    color: data.color ?? null,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  });
}

export function insertTestEdge(data: {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
}) {
  edgesCollection.insert({
    id: data.id,
    userId: TEST_USER_ID,
    sourceId: data.sourceId,
    targetId: data.targetId,
    type: data.type,
    createdAt: new Date(),
  });
}

export async function reloadCollectionsFromDb() {
  resetCollectionsForDb();
  await preloadCoreCollections();
}

export function waitForLiveUpdate(ms = 100) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
