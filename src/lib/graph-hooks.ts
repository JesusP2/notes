import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import { and, eq, or } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { ulid } from "ulidx";
import type { Edge, EdgeType, Node } from "@/db/schema/graph";
import { useCurrentUserId } from "@/hooks/use-current-user";
import { hashContent } from "@/lib/content-hash";
import { buildNoteExcerpt } from "@/lib/note-excerpt";
import { applyTemplatePlaceholders } from "@/lib/templates";
import {
  canvasLinksCollection,
  canvasScenesCollection,
  edgeMetadataCollection,
  edgesCollection,
  nodeVersionsCollection,
  nodesCollection,
  tasksCollection,
  templatesMetaCollection,
  userNodePrefsCollection,
} from "@/lib/collections";

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function normalizeCanvasAppState(appState: AppState | null | undefined): AppState {
  const next = { ...(appState ?? {}) } as AppState & {
    collaborators?: unknown;
  };
  if (!(next.collaborators instanceof Map)) {
    next.collaborators = new Map();
  }
  return next;
}

function stripCanvasAppStateForStorage(appState: AppState | null | undefined): Partial<AppState> {
  if (!appState) return {};
  const { collaborators, ...rest } = appState as AppState & {
    collaborators?: unknown;
  };
  return rest;
}

function compareTagFirst(left: Node, right: Node) {
  if (left.type === right.type) return 0;
  if (left.type === "tag") return -1;
  if (right.type === "tag") return 1;
  return 0;
}

function compareTitle(left: Node, right: Node) {
  return left.title.toLowerCase().localeCompare(right.title.toLowerCase());
}

function compareUpdatedDesc(left: Node, right: Node) {
  return right.updatedAt.getTime() - left.updatedAt.getTime();
}

export function useTagChildren(tagId: string): Node[] {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .innerJoin({ edges: edgesCollection }, ({ nodes, edges }) => eq(nodes.id, edges.sourceId))
        .where(({ nodes, edges }) =>
          and(
            eq(nodes.userId, userId),
            eq(edges.userId, userId),
            eq(edges.targetId, tagId),
            or(
              and(eq(edges.type, "part_of"), eq(nodes.type, "tag")),
              and(
                eq(edges.type, "tagged_with"),
                or(eq(nodes.type, "note"), eq(nodes.type, "canvas")),
              ),
            ),
          ),
        )
        .select(({ nodes }) => ({ ...nodes })),
    [tagId, userId],
  );

  const sortedChildren = [...data].sort((left, right) => {
    const typeOrder = compareTagFirst(left, right);
    if (typeOrder !== 0) return typeOrder;
    return compareTitle(left, right);
  });

  return sortedChildren;
}

export function useNodeById(nodeId: string): Node | null {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .where(({ nodes }) => and(eq(nodes.id, nodeId), eq(nodes.userId, userId))),
    [nodeId, userId],
  );

  return data[0] ?? null;
}

export function useNodeEdges(nodeId: string): {
  outgoing: Edge[];
  incoming: Edge[];
} {
  const userId = useCurrentUserId();
  const outgoing = useLiveQuery(
    (q) =>
      q
        .from({ edges: edgesCollection })
        .where(({ edges }) => and(eq(edges.sourceId, nodeId), eq(edges.userId, userId))),
    [nodeId, userId],
  );
  const incoming = useLiveQuery(
    (q) =>
      q
        .from({ edges: edgesCollection })
        .where(({ edges }) => and(eq(edges.targetId, nodeId), eq(edges.userId, userId))),
    [nodeId, userId],
  );

  return {
    outgoing: outgoing.data ?? [],
    incoming: incoming.data ?? [],
  };
}

export function useGraphData(): { nodes: Node[]; edges: Edge[] } {
  const userId = useCurrentUserId();
  const nodesResult = useLiveQuery(
    (q) => q.from({ nodes: nodesCollection }).where(({ nodes }) => eq(nodes.userId, userId)),
    [userId],
  );
  const edgesResult = useLiveQuery(
    (q) => q.from({ edges: edgesCollection }).where(({ edges }) => eq(edges.userId, userId)),
    [userId],
  );

  return {
    nodes: nodesResult.data ?? [],
    edges: edgesResult.data ?? [],
  };
}

export function useSearchNodes(queryText: string): Node[] {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) => q.from({ nodes: nodesCollection }).where(({ nodes }) => eq(nodes.userId, userId)),
    [userId],
  );

  const trimmed = queryText.trim();

  if (!trimmed) return [];
  const query = trimmed.toLowerCase();
  return data
    .filter((node) => {
      const title = node.title.toLowerCase();
      const content = (node.content ?? "").toLowerCase();
      return title.includes(query) || content.includes(query);
    })
    .sort(compareUpdatedDesc)
    .slice(0, 20);
}

export function useRecentNotes(limit = 10): Node[] {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .where(({ nodes }) => and(eq(nodes.userId, userId), eq(nodes.type, "note"))),
    [userId],
  );

  return [...data].sort(compareUpdatedDesc).slice(0, limit);
}

export function useBacklinks(noteId: string): Node[] {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .innerJoin({ edges: edgesCollection }, ({ nodes, edges }) => eq(nodes.id, edges.sourceId))
        .where(({ nodes, edges }) =>
          and(
            eq(edges.type, "references"),
            eq(edges.targetId, noteId),
            eq(edges.userId, userId),
            eq(nodes.userId, userId),
          ),
        )
        .select(({ nodes }) => ({ ...nodes })),
    [noteId, userId],
  );

  return [...data].sort(compareUpdatedDesc);
}

export function useTags(): Node[] {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .where(({ nodes }) => and(eq(nodes.userId, userId), eq(nodes.type, "tag"))),
    [userId],
  );

  return [...data].sort(compareTitle);
}

export function useTemplates(): Node[] {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .where(({ nodes }) => and(eq(nodes.userId, userId), eq(nodes.type, "template"))),
    [userId],
  );

  return [...data].sort(compareTitle);
}

export function useNoteTags(nodeId: string): Node[] {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .innerJoin({ edges: edgesCollection }, ({ nodes, edges }) => eq(nodes.id, edges.targetId))
        .where(({ nodes, edges }) =>
          and(
            eq(edges.sourceId, nodeId),
            eq(edges.type, "tagged_with"),
            eq(edges.userId, userId),
            eq(nodes.userId, userId),
            eq(nodes.type, "tag"),
          ),
        )
        .select(({ nodes }) => ({ ...nodes })),
    [nodeId, userId],
  );

  return [...data].sort(compareTitle);
}

export function usePinnedNotes(): Node[] {
  const userId = useCurrentUserId();
  const prefsResult = useLiveQuery(
    (q) =>
      q.from({ prefs: userNodePrefsCollection }).where(({ prefs }) => eq(prefs.userId, userId)),
    [userId],
  );
  const nodesResult = useLiveQuery(
    (q) =>
      q
        .from({ nodes: nodesCollection })
        .where(({ nodes }) => and(eq(nodes.userId, userId), eq(nodes.type, "note"))),
    [userId],
  );

  const prefs = (prefsResult.data ?? []).filter((pref) => pref.pinnedRank !== null);
  const nodesById = new Map((nodesResult.data ?? []).map((node) => [node.id, node]));
  return prefs
    .sort((left, right) => (left.pinnedRank ?? 0) - (right.pinnedRank ?? 0))
    .map((pref) => nodesById.get(pref.nodeId))
    .filter((node): node is Node => Boolean(node));
}

export function useNodePreferences(nodeId: string): {
  isFavorite: boolean;
  pinnedRank: number | null;
} {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ prefs: userNodePrefsCollection })
        .where(({ prefs }) => and(eq(prefs.userId, userId), eq(prefs.nodeId, nodeId))),
    [nodeId, userId],
  );

  const row = data[0];
  return {
    isFavorite: row?.isFavorite ?? false,
    pinnedRank: row?.pinnedRank ?? null,
  };
}

export function useNoteVersions(noteId: string): Array<{
  id: string;
  title: string;
  content: string;
  contentHash: string;
  createdAt: Date;
  reason: string | null;
}> {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ versions: nodeVersionsCollection })
        .where(({ versions }) => and(eq(versions.userId, userId), eq(versions.nodeId, noteId))),
    [noteId, userId],
  );

  return [...data]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      contentHash: row.contentHash,
      createdAt: row.createdAt,
      reason: row.reason ?? null,
    }));
}

export function useVersionMutations() {
  const userId = useCurrentUserId();

  const createNoteVersion = async (
    noteId: string,
    title: string,
    content: string,
    reason?: string,
  ) => {
    const hash = hashContent(`${title}\n${content}`);
    const state = await nodeVersionsCollection.stateWhenReady();
    const existing = Array.from(state.values()).some(
      (version) =>
        version.userId === userId && version.nodeId === noteId && version.contentHash === hash,
    );
    if (existing) return false;

    const now = new Date();
    const tx = nodeVersionsCollection.insert({
      id: ulid(),
      userId,
      nodeId: noteId,
      title,
      content,
      contentHash: hash,
      createdAt: now,
      createdBy: userId,
      reason: reason ?? null,
    });
    await tx.isPersisted.promise;
    return true;
  };

  return { createNoteVersion };
}

export type TaskItem = {
  id: string;
  noteId: string;
  content: string;
  isDone: boolean;
  position: number | null;
  noteTitle: string;
};

export function useTasks(options: { showDone?: boolean } = {}): TaskItem[] {
  const userId = useCurrentUserId();
  const { showDone = true } = options;
  const tasksResult = useLiveQuery(
    (q) => q.from({ tasks: tasksCollection }).where(({ tasks }) => eq(tasks.userId, userId)),
    [userId],
  );
  const nodesResult = useLiveQuery(
    (q) => q.from({ nodes: nodesCollection }).where(({ nodes }) => eq(nodes.userId, userId)),
    [userId],
  );

  const tasksData = tasksResult.data ?? [];
  const nodesData = nodesResult.data ?? [];
  const nodesById = new Map(nodesData.map((node) => [node.id, node]));

  return tasksData
    .filter((task) => (showDone ? true : !task.isDone))
    .map((task) => ({
      id: task.id,
      noteId: task.noteId,
      content: task.content,
      isDone: task.isDone,
      position: task.position ?? null,
      noteTitle: nodesById.get(task.noteId)?.title ?? "",
    }))
    .sort((left, right) => {
      if (left.isDone !== right.isDone) {
        return left.isDone ? 1 : -1;
      }
      const leftDue = left.isDone ? null : (tasksData.find((t) => t.id === left.id)?.dueAt ?? null);
      const rightDue = right.isDone
        ? null
        : (tasksData.find((t) => t.id === right.id)?.dueAt ?? null);
      const leftDueValue = leftDue ? leftDue.getTime() : Number.POSITIVE_INFINITY;
      const rightDueValue = rightDue ? rightDue.getTime() : Number.POSITIVE_INFINITY;
      if (leftDueValue !== rightDueValue) {
        return leftDueValue - rightDueValue;
      }
      return (left.position ?? 0) - (right.position ?? 0);
    });
}

export function useTaskMutations() {
  const userId = useCurrentUserId();

  const toggleTask = async (taskId: string, nextDone?: boolean) => {
    const tasksState = await tasksCollection.stateWhenReady();
    const task = tasksState.get(taskId);
    if (!task || task.userId !== userId) return;

    const nodesState = await nodesCollection.stateWhenReady();
    const note = nodesState.get(task.noteId);
    if (!note) return;

    const content = note.content ?? "";
    const lines = content.split(/\r?\n/);
    const index = task.position ?? -1;
    if (index < 0 || index >= lines.length) return;

    const desiredDone = nextDone ?? !task.isDone;
    const line = lines[index] ?? "";
    const updatedLine = line.replace(/\[[ xX]\]/, desiredDone ? "[x]" : "[ ]");
    lines[index] = updatedLine;
    const nextContent = lines.join("\n");
    const now = new Date();

    const noteTx = nodesCollection.update(note.id, (draft) => {
      draft.content = nextContent;
      draft.excerpt = buildNoteExcerpt(nextContent);
      draft.updatedAt = now;
    });

    const taskTx = tasksCollection.update(taskId, (draft) => {
      draft.isDone = desiredDone;
      draft.checkedAt = desiredDone ? now : null;
      draft.updatedAt = now;
    });

    await Promise.all([noteTx.isPersisted.promise, taskTx.isPersisted.promise]);
  };

  return { toggleTask };
}

export function usePreferenceMutations() {
  const userId = useCurrentUserId();

  const setFavorite = async (nodeId: string, isFavorite: boolean) => {
    const now = new Date();
    const state = await userNodePrefsCollection.stateWhenReady();
    const existing = Array.from(state.values()).find(
      (pref) => pref.userId === userId && pref.nodeId === nodeId,
    );

    const tx = existing
      ? userNodePrefsCollection.update(existing.id, (draft) => {
          draft.isFavorite = isFavorite;
          draft.updatedAt = now;
        })
      : userNodePrefsCollection.insert({
          id: ulid(),
          userId,
          nodeId,
          isFavorite,
          pinnedRank: null,
          createdAt: now,
          updatedAt: now,
        });

    await tx.isPersisted.promise;
  };

  const pinNode = async (nodeId: string) => {
    const now = new Date();
    const state = await userNodePrefsCollection.stateWhenReady();
    const prefs = Array.from(state.values()).filter((pref) => pref.userId === userId);
    const existing = prefs.find((pref) => pref.nodeId === nodeId);
    const maxRank = prefs.reduce((max, pref) => Math.max(max, pref.pinnedRank ?? 0), 0);
    const nextRank = maxRank + 1;

    const tx = existing
      ? userNodePrefsCollection.update(existing.id, (draft) => {
          draft.pinnedRank = nextRank;
          draft.updatedAt = now;
        })
      : userNodePrefsCollection.insert({
          id: ulid(),
          userId,
          nodeId,
          isFavorite: false,
          pinnedRank: nextRank,
          createdAt: now,
          updatedAt: now,
        });

    await tx.isPersisted.promise;
  };

  const unpinNode = async (nodeId: string) => {
    const now = new Date();
    const state = await userNodePrefsCollection.stateWhenReady();
    const existing = Array.from(state.values()).find(
      (pref) => pref.userId === userId && pref.nodeId === nodeId,
    );
    if (!existing) return;

    const tx = userNodePrefsCollection.update(existing.id, (draft) => {
      draft.pinnedRank = null;
      draft.updatedAt = now;
    });

    await tx.isPersisted.promise;
  };

  return { setFavorite, pinNode, unpinNode };
}

export function useNodeMutations() {
  const userId = useCurrentUserId();

  const ensureEdge = async (sourceId: string, targetId: string, type: EdgeType) => {
    const state = await edgesCollection.stateWhenReady();
    const exists = Array.from(state.values()).some(
      (edge) =>
        edge.userId === userId &&
        edge.sourceId === sourceId &&
        edge.targetId === targetId &&
        edge.type === type,
    );

    if (exists) return;

    const tx = edgesCollection.insert({
      id: ulid(),
      userId,
      sourceId,
      targetId,
      type,
      createdAt: new Date(),
    });
    await tx.isPersisted.promise;
  };

  const createNote = async (title: string, tagId?: string) => {
    const id = ulid();
    const content = `# ${title}\n\n`;
    const now = new Date();
    const node: Node = {
      id,
      userId,
      type: "note",
      title,
      content,
      excerpt: buildNoteExcerpt(content),
      color: null,
      createdAt: now,
      updatedAt: now,
    };

    const tx = nodesCollection.insert(node);
    await tx.isPersisted.promise;

    if (tagId) {
      await ensureEdge(id, tagId, "tagged_with");
    }

    return node;
  };

  const createTag = async (title: string, parentTagId: string) => {
    const id = ulid();
    const now = new Date();
    const node: Node = {
      id,
      userId,
      type: "tag",
      title,
      content: null,
      excerpt: null,
      color: null,
      createdAt: now,
      updatedAt: now,
    };

    const tx = nodesCollection.insert(node);
    await tx.isPersisted.promise;

    await ensureEdge(id, parentTagId, "part_of");

    return node;
  };

  const createTemplate = async (title: string) => {
    const id = ulid();
    const content = `# ${title}\n\n`;
    const now = new Date();
    const node: Node = {
      id,
      userId,
      type: "template",
      title,
      content,
      excerpt: buildNoteExcerpt(content),
      color: null,
      createdAt: now,
      updatedAt: now,
    };

    const tx = nodesCollection.insert(node);
    await tx.isPersisted.promise;

    return node;
  };

  const createCanvas = async (title: string, tagId?: string) => {
    const id = ulid();
    const now = new Date();
    const node: Node = {
      id,
      userId,
      type: "canvas",
      title,
      content: null,
      excerpt: null,
      color: null,
      createdAt: now,
      updatedAt: now,
    };

    const nodeTx = nodesCollection.insert(node);
    await nodeTx.isPersisted.promise;

    const sceneTx = canvasScenesCollection.insert({
      canvasId: id,
      userId,
      elementsJson: [],
      appStateJson: {},
      filesJson: {},
      createdAt: now,
      updatedAt: now,
    });
    await sceneTx.isPersisted.promise;

    if (tagId) {
      await ensureEdge(id, tagId, "tagged_with");
    }

    return node;
  };

  const createNoteFromTemplate = async (templateId: string, noteTitle?: string, tagId?: string) => {
    const nodesState = await nodesCollection.stateWhenReady();
    const template = nodesState.get(templateId);
    if (!template || template.userId !== userId || template.type !== "template") {
      return null;
    }

    const title = noteTitle?.trim() || template.title;
    const baseContent = template.content ?? `# ${title}\n\n`;
    const content = applyTemplatePlaceholders(baseContent, title);
    const excerpt = buildNoteExcerpt(content);
    const now = new Date();
    const noteId = ulid();
    const node: Node = {
      id: noteId,
      userId,
      type: "note",
      title,
      content,
      excerpt,
      color: null,
      createdAt: now,
      updatedAt: now,
    };

    const nodeTx = nodesCollection.insert(node);
    await nodeTx.isPersisted.promise;

    await ensureEdge(noteId, templateId, "derived_from");
    if (tagId) {
      await ensureEdge(noteId, tagId, "tagged_with");
    }

    const metaState = await templatesMetaCollection.stateWhenReady();
    const existingMeta = metaState.get(templateId);
    const metaTx = existingMeta
      ? templatesMetaCollection.update(templateId, (draft) => {
          draft.lastUsedAt = now;
        })
      : templatesMetaCollection.insert({
          nodeId: templateId,
          userId,
          defaultTags: null,
          lastUsedAt: now,
          fields: null,
        });
    await metaTx.isPersisted.promise;

    return node;
  };

  const updateNode = async (id: string, updates: Partial<Node>) => {
    const shouldUpdateUpdatedAt = updates.updatedAt === undefined;
    const hasChanges =
      updates.title !== undefined ||
      updates.content !== undefined ||
      updates.excerpt !== undefined ||
      updates.color !== undefined ||
      updates.type !== undefined ||
      updates.updatedAt !== undefined;

    if (!hasChanges) return;

    const tx = nodesCollection.update(id, (draft) => {
      if (updates.title !== undefined) {
        draft.title = updates.title;
      }
      if (updates.content !== undefined) {
        draft.content = updates.content;
      }
      if (updates.excerpt !== undefined) {
        draft.excerpt = updates.excerpt;
      }
      if (updates.color !== undefined) {
        draft.color = updates.color;
      }
      if (updates.type !== undefined) {
        draft.type = updates.type;
      }
      if (shouldUpdateUpdatedAt) {
        draft.updatedAt = new Date();
      } else if (updates.updatedAt !== undefined) {
        draft.updatedAt = updates.updatedAt;
      }
    });

    await tx.isPersisted.promise;
  };

  const deleteNode = async (id: string) => {
    const edgesState = await edgesCollection.stateWhenReady();
    const edgesToDelete = Array.from(edgesState.values())
      .filter((edge) => edge.sourceId === id || edge.targetId === id)
      .map((edge) => edge.id);

    if (edgesToDelete.length > 0) {
      const edgeMetaState = await edgeMetadataCollection.stateWhenReady();
      const edgeMetaIds = Array.from(edgeMetaState.values())
        .filter((meta) => edgesToDelete.includes(meta.edgeId))
        .map((meta) => meta.edgeId);

      if (edgeMetaIds.length > 0) {
        const metaTx = edgeMetadataCollection.delete(edgeMetaIds);
        await metaTx.isPersisted.promise;
      }

      const edgesTx = edgesCollection.delete(edgesToDelete);
      await edgesTx.isPersisted.promise;
    }

    const prefsState = await userNodePrefsCollection.stateWhenReady();
    const prefsToDelete = Array.from(prefsState.values())
      .filter((pref) => pref.nodeId === id)
      .map((pref) => pref.id);
    if (prefsToDelete.length > 0) {
      const prefsTx = userNodePrefsCollection.delete(prefsToDelete);
      await prefsTx.isPersisted.promise;
    }

    const tasksState = await tasksCollection.stateWhenReady();
    const tasksToDelete = Array.from(tasksState.values())
      .filter((task) => task.noteId === id)
      .map((task) => task.id);
    if (tasksToDelete.length > 0) {
      const tasksTx = tasksCollection.delete(tasksToDelete);
      await tasksTx.isPersisted.promise;
    }

    const canvasScenesState = await canvasScenesCollection.stateWhenReady();
    if (canvasScenesState.get(id)) {
      const sceneTx = canvasScenesCollection.delete(id);
      await sceneTx.isPersisted.promise;
    }

    const canvasLinksState = await canvasLinksCollection.stateWhenReady();
    const canvasLinksToDelete = Array.from(canvasLinksState.values())
      .filter((link) => link.canvasId === id || link.nodeId === id)
      .map((link) => link.id);
    if (canvasLinksToDelete.length > 0) {
      const linksTx = canvasLinksCollection.delete(canvasLinksToDelete);
      await linksTx.isPersisted.promise;
    }

    const nodeTx = nodesCollection.delete(id);
    await nodeTx.isPersisted.promise;
  };

  const addTag = async (noteId: string, tagId: string) => {
    await ensureEdge(noteId, tagId, "tagged_with");
  };

  const removeTag = async (noteId: string, tagId: string) => {
    const state = await edgesCollection.stateWhenReady();
    const edgesToDelete = Array.from(state.values())
      .filter(
        (edge) =>
          edge.sourceId === noteId && edge.targetId === tagId && edge.type === "tagged_with",
      )
      .map((edge) => edge.id);
    if (edgesToDelete.length === 0) return;

    const tx = edgesCollection.delete(edgesToDelete);
    await tx.isPersisted.promise;
  };

  const moveTaggedNode = async (nodeId: string, fromTagId: string, toTagId: string) => {
    if (fromTagId === toTagId) return;

    const state = await edgesCollection.stateWhenReady();
    const taggedEdges = Array.from(state.values()).filter(
      (edge) => edge.userId === userId && edge.sourceId === nodeId && edge.type === "tagged_with",
    );
    const sourceEdge = taggedEdges.find((edge) => edge.targetId === fromTagId);
    if (!sourceEdge) {
      await ensureEdge(nodeId, toTagId, "tagged_with");
      return;
    }

    const targetExists = taggedEdges.some((edge) => edge.targetId === toTagId);
    if (targetExists) {
      const tx = edgesCollection.delete(sourceEdge.id);
      await tx.isPersisted.promise;
      return;
    }

    const tx = edgesCollection.update(sourceEdge.id, (draft) => {
      draft.targetId = toTagId;
    });
    await tx.isPersisted.promise;
  };

  const moveTag = async (tagId: string, newParentTagId: string) => {
    const state = await edgesCollection.stateWhenReady();
    const partOfEdges = Array.from(state.values())
      .filter((edge) => edge.sourceId === tagId && edge.type === "part_of")
      .map((edge) => edge.id);

    if (partOfEdges.length > 0) {
      const deleteTx = edgesCollection.delete(partOfEdges);
      await deleteTx.isPersisted.promise;
    }

    await ensureEdge(tagId, newParentTagId, "part_of");
  };

  return {
    createNote,
    createTag,
    createTemplate,
    createCanvas,
    createNoteFromTemplate,
    updateNode,
    deleteNode,
    addTag,
    removeTag,
    moveTaggedNode,
    moveTag,
  };
}

export function useEdgeMutations() {
  const userId = useCurrentUserId();

  const createEdge = async (sourceId: string, targetId: string, type: EdgeType) => {
    const state = await edgesCollection.stateWhenReady();
    const exists = Array.from(state.values()).some(
      (edge) =>
        edge.userId === userId &&
        edge.sourceId === sourceId &&
        edge.targetId === targetId &&
        edge.type === type,
    );
    if (exists) {
      throw new Error("Edge already exists");
    }

    const edge: Edge = {
      id: ulid(),
      userId,
      sourceId,
      targetId,
      type,
      createdAt: new Date(),
    };

    const tx = edgesCollection.insert(edge);
    await tx.isPersisted.promise;
    return edge;
  };

  const deleteEdge = async (edgeId: string) => {
    const metaState = await edgeMetadataCollection.stateWhenReady();
    if (metaState.get(edgeId)) {
      const metaTx = edgeMetadataCollection.delete(edgeId);
      await metaTx.isPersisted.promise;
    }

    const tx = edgesCollection.delete(edgeId);
    await tx.isPersisted.promise;
  };

  const changeEdgeType = async (edgeId: string, newType: EdgeType) => {
    const tx = edgesCollection.update(edgeId, (draft) => {
      draft.type = newType;
    });
    await tx.isPersisted.promise;
  };

  return {
    createEdge,
    deleteEdge,
    changeEdgeType,
  };
}

export type CanvasScene = {
  elements: ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export type CanvasLink = {
  id: string;
  canvasId: string;
  elementId: string;
  nodeId: string;
};

export function useCanvasScene(canvasId: string): CanvasScene | null {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ scenes: canvasScenesCollection })
        .where(({ scenes }) => and(eq(scenes.canvasId, canvasId), eq(scenes.userId, userId))),
    [canvasId, userId],
  );

  const row = data[0];
  if (!row) return null;

  return {
    elements: parseJson<ExcalidrawElement[]>(row.elementsJson, []),
    appState: normalizeCanvasAppState(parseJson<AppState>(row.appStateJson, {} as AppState)),
    files: parseJson<BinaryFiles>(row.filesJson, {} as BinaryFiles),
  };
}

export function useCanvasLinks(canvasId: string): CanvasLink[] {
  const userId = useCurrentUserId();
  const { data = [] } = useLiveQuery(
    (q) =>
      q
        .from({ links: canvasLinksCollection })
        .where(({ links }) => and(eq(links.canvasId, canvasId), eq(links.userId, userId))),
    [canvasId, userId],
  );

  return data.map((row) => ({
    id: row.id,
    canvasId: row.canvasId,
    elementId: row.elementId,
    nodeId: row.nodeId,
  }));
}

export function useCanvasMutations() {
  const userId = useCurrentUserId();

  const upsertCanvasScene = async (canvasId: string, scene: CanvasScene) => {
    const now = new Date();
    const state = await canvasScenesCollection.stateWhenReady();
    const existing = state.get(canvasId);

    const payload = {
      canvasId,
      userId,
      elementsJson: scene.elements ?? [],
      appStateJson: stripCanvasAppStateForStorage(scene.appState),
      filesJson: scene.files ?? {},
      updatedAt: now,
    };

    const tx = existing
      ? canvasScenesCollection.update(canvasId, (draft) => {
          draft.elementsJson = payload.elementsJson;
          draft.appStateJson = payload.appStateJson;
          draft.filesJson = payload.filesJson;
          draft.updatedAt = now;
        })
      : canvasScenesCollection.insert({
          ...payload,
          createdAt: now,
        });

    await tx.isPersisted.promise;
  };

  const setCanvasLink = async (canvasId: string, elementId: string, nodeId: string) => {
    const state = await canvasLinksCollection.stateWhenReady();
    const existingLinks = Array.from(state.values()).filter(
      (link) =>
        link.userId === userId && link.canvasId === canvasId && link.elementId === elementId,
    );
    if (existingLinks.length > 0) {
      const tx = canvasLinksCollection.delete(existingLinks.map((link) => link.id));
      await tx.isPersisted.promise;
    }

    const now = new Date();
    const insertTx = canvasLinksCollection.insert({
      id: ulid(),
      userId,
      canvasId,
      elementId,
      nodeId,
      createdAt: now,
    });
    await insertTx.isPersisted.promise;
  };

  const removeCanvasLink = async (canvasId: string, elementId: string) => {
    const state = await canvasLinksCollection.stateWhenReady();
    const toDelete = Array.from(state.values())
      .filter(
        (link) =>
          link.userId === userId && link.canvasId === canvasId && link.elementId === elementId,
      )
      .map((link) => link.id);
    if (toDelete.length === 0) return;

    const tx = canvasLinksCollection.delete(toDelete);
    await tx.isPersisted.promise;
  };

  const pruneCanvasLinks = async (canvasId: string, elementIds: string[]) => {
    const state = await canvasLinksCollection.stateWhenReady();
    const toDelete = Array.from(state.values())
      .filter((link) => link.userId === userId && link.canvasId === canvasId)
      .filter((link) => !elementIds.includes(link.elementId))
      .map((link) => link.id);

    if (toDelete.length === 0) return;
    const tx = canvasLinksCollection.delete(toDelete);
    await tx.isPersisted.promise;
  };

  return {
    upsertCanvasScene,
    setCanvasLink,
    removeCanvasLink,
    pruneCanvasLinks,
  };
}
