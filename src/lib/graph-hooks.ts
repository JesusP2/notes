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
    nodeVersionsCollection.insert({
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

  const toggleTask = (taskId: string, nextDone?: boolean) => {
    const task = tasksCollection.state.get(taskId);
    if (!task || task.userId !== userId) return;

    const note = nodesCollection.state.get(task.noteId);
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

    nodesCollection.update(note.id, (draft) => {
      draft.content = nextContent;
      draft.excerpt = buildNoteExcerpt(nextContent);
      draft.updatedAt = now;
    });

    tasksCollection.update(taskId, (draft) => {
      draft.isDone = desiredDone;
      draft.checkedAt = desiredDone ? now : null;
      draft.updatedAt = now;
    });
  };

  return { toggleTask };
}

export function usePreferenceMutations() {
  const userId = useCurrentUserId();

  const setFavorite = (nodeId: string, isFavorite: boolean) => {
    const now = new Date();
    const existing = Array.from(userNodePrefsCollection.state.values()).find(
      (pref) => pref.userId === userId && pref.nodeId === nodeId,
    );

    if (existing) {
      userNodePrefsCollection.update(existing.id, (draft) => {
        draft.isFavorite = isFavorite;
        draft.updatedAt = now;
      });
    } else {
      userNodePrefsCollection.insert({
        id: ulid(),
        userId,
        nodeId,
        isFavorite,
        pinnedRank: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  const pinNode = (nodeId: string) => {
    const now = new Date();
    const prefs = Array.from(userNodePrefsCollection.state.values()).filter(
      (pref) => pref.userId === userId,
    );
    const existing = prefs.find((pref) => pref.nodeId === nodeId);
    const maxRank = prefs.reduce((max, pref) => Math.max(max, pref.pinnedRank ?? 0), 0);
    const nextRank = maxRank + 1;

    if (existing) {
      userNodePrefsCollection.update(existing.id, (draft) => {
        draft.pinnedRank = nextRank;
        draft.updatedAt = now;
      });
    } else {
      userNodePrefsCollection.insert({
        id: ulid(),
        userId,
        nodeId,
        isFavorite: false,
        pinnedRank: nextRank,
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  const unpinNode = (nodeId: string) => {
    const now = new Date();
    const existing = Array.from(userNodePrefsCollection.state.values()).find(
      (pref) => pref.userId === userId && pref.nodeId === nodeId,
    );
    if (!existing) return;

    userNodePrefsCollection.update(existing.id, (draft) => {
      draft.pinnedRank = null;
      draft.updatedAt = now;
    });
  };

  return { setFavorite, pinNode, unpinNode };
}

export function useNodeMutations() {
  const userId = useCurrentUserId();

  const ensureEdge = (sourceId: string, targetId: string, type: EdgeType) => {
    const exists = Array.from(edgesCollection.state.values()).some(
      (edge) =>
        edge.userId === userId &&
        edge.sourceId === sourceId &&
        edge.targetId === targetId &&
        edge.type === type,
    );

    if (exists) return;

    edgesCollection.insert({
      id: ulid(),
      userId,
      sourceId,
      targetId,
      type,
      createdAt: new Date(),
    });
  };

  const createNote = (title: string, tagId?: string) => {
    const id = ulid();
    const content = `<h1>${title}</h1><p></p>`;
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

    nodesCollection.insert(node);

    if (tagId) {
      ensureEdge(id, tagId, "tagged_with");
    }

    return node;
  };

  const createTag = (title: string, parentTagId: string) => {
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

    nodesCollection.insert(node);
    ensureEdge(id, parentTagId, "part_of");

    return node;
  };

  const createTemplate = (title: string) => {
    const id = ulid();
    const content = `<h1>${title}</h1><p></p>`;
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

    nodesCollection.insert(node);

    return node;
  };

  const createCanvas = (title: string, tagId?: string) => {
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

    nodesCollection.insert(node);

    canvasScenesCollection.insert({
      canvasId: id,
      userId,
      elementsJson: [],
      appStateJson: {},
      filesJson: {},
      createdAt: now,
      updatedAt: now,
    });

    if (tagId) {
      ensureEdge(id, tagId, "tagged_with");
    }

    return node;
  };

  const createNoteFromTemplate = async (templateId: string, noteTitle?: string, tagId?: string) => {
    const template = nodesCollection.state.get(templateId);
    if (!template || template.userId !== userId || template.type !== "template") {
      return null;
    }

    const title = noteTitle?.trim() || template.title;
    const baseContent = template.content ?? `<h1>${title}</h1><p></p>`;
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

    nodesCollection.insert(node);
    ensureEdge(noteId, templateId, "derived_from");
    if (tagId) {
      ensureEdge(noteId, tagId, "tagged_with");
    }

    const metaState = await templatesMetaCollection.stateWhenReady();
    const existingMeta = metaState.get(templateId);
    if (existingMeta) {
      templatesMetaCollection.update(templateId, (draft) => {
        draft.lastUsedAt = now;
      });
    } else {
      templatesMetaCollection.insert({
        nodeId: templateId,
        userId,
        defaultTags: null,
        lastUsedAt: now,
        fields: null,
      });
    }

    return node;
  };

  const updateNode = (id: string, updates: Partial<Node>) => {
    const shouldUpdateUpdatedAt = updates.updatedAt === undefined;
    const hasChanges =
      updates.title !== undefined ||
      updates.content !== undefined ||
      updates.excerpt !== undefined ||
      updates.color !== undefined ||
      updates.type !== undefined ||
      updates.updatedAt !== undefined;

    if (!hasChanges) return;

    nodesCollection.update(id, (draft) => {
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
  };

  const deleteNode = async (id: string) => {
    const edgesToDelete = Array.from(edgesCollection.state.values())
      .filter((edge) => edge.sourceId === id || edge.targetId === id)
      .map((edge) => edge.id);

    if (edgesToDelete.length > 0) {
      const edgeMetaState = await edgeMetadataCollection.stateWhenReady();
      const edgeMetaIds = Array.from(edgeMetaState.values())
        .filter((meta) => edgesToDelete.includes(meta.edgeId))
        .map((meta) => meta.edgeId);

      if (edgeMetaIds.length > 0) {
        edgeMetadataCollection.delete(edgeMetaIds);
      }

      edgesCollection.delete(edgesToDelete);
    }

    const prefsToDelete = Array.from(userNodePrefsCollection.state.values())
      .filter((pref) => pref.nodeId === id)
      .map((pref) => pref.id);
    if (prefsToDelete.length > 0) {
      userNodePrefsCollection.delete(prefsToDelete);
    }

    const tasksToDelete = Array.from(tasksCollection.state.values())
      .filter((task) => task.noteId === id)
      .map((task) => task.id);
    if (tasksToDelete.length > 0) {
      tasksCollection.delete(tasksToDelete);
    }

    const canvasScenesState = await canvasScenesCollection.stateWhenReady();
    if (canvasScenesState.get(id)) {
      canvasScenesCollection.delete(id);
    }

    const canvasLinksState = await canvasLinksCollection.stateWhenReady();
    const canvasLinksToDelete = Array.from(canvasLinksState.values())
      .filter((link) => link.canvasId === id || link.nodeId === id)
      .map((link) => link.id);
    if (canvasLinksToDelete.length > 0) {
      canvasLinksCollection.delete(canvasLinksToDelete);
    }

    nodesCollection.delete(id);
  };

  const addTag = (noteId: string, tagId: string) => {
    ensureEdge(noteId, tagId, "tagged_with");
  };

  const removeTag = (noteId: string, tagId: string) => {
    const edgesToDelete = Array.from(edgesCollection.state.values())
      .filter(
        (edge) =>
          edge.sourceId === noteId && edge.targetId === tagId && edge.type === "tagged_with",
      )
      .map((edge) => edge.id);
    if (edgesToDelete.length === 0) return;

    edgesCollection.delete(edgesToDelete);
  };

  const moveTaggedNode = (nodeId: string, fromTagId: string, toTagId: string) => {
    if (fromTagId === toTagId) return;

    const taggedEdges = Array.from(edgesCollection.state.values()).filter(
      (edge) => edge.userId === userId && edge.sourceId === nodeId && edge.type === "tagged_with",
    );
    const sourceEdge = taggedEdges.find((edge) => edge.targetId === fromTagId);
    if (!sourceEdge) {
      ensureEdge(nodeId, toTagId, "tagged_with");
      return;
    }

    const targetExists = taggedEdges.some((edge) => edge.targetId === toTagId);
    if (targetExists) {
      edgesCollection.delete(sourceEdge.id);
      return;
    }

    edgesCollection.update(sourceEdge.id, (draft) => {
      draft.targetId = toTagId;
    });
  };

  const moveTag = (tagId: string, newParentTagId: string) => {
    const partOfEdges = Array.from(edgesCollection.state.values())
      .filter((edge) => edge.sourceId === tagId && edge.type === "part_of")
      .map((edge) => edge.id);

    if (partOfEdges.length > 0) {
      edgesCollection.delete(partOfEdges);
    }

    ensureEdge(tagId, newParentTagId, "part_of");
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

  const createEdge = (sourceId: string, targetId: string, type: EdgeType) => {
    const exists = Array.from(edgesCollection.state.values()).some(
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

    edgesCollection.insert(edge);
    return edge;
  };

  const deleteEdge = async (edgeId: string) => {
    const metaState = await edgeMetadataCollection.stateWhenReady();
    if (metaState.get(edgeId)) {
      edgeMetadataCollection.delete(edgeId);
    }

    edgesCollection.delete(edgeId);
  };

  const changeEdgeType = (edgeId: string, newType: EdgeType) => {
    edgesCollection.update(edgeId, (draft) => {
      draft.type = newType;
    });
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

    if (existing) {
      canvasScenesCollection.update(canvasId, (draft) => {
        draft.elementsJson = payload.elementsJson;
        draft.appStateJson = payload.appStateJson;
        draft.filesJson = payload.filesJson;
        draft.updatedAt = now;
      });
    } else {
      canvasScenesCollection.insert({
        ...payload,
        createdAt: now,
      });
    }
  };

  const setCanvasLink = async (canvasId: string, elementId: string, nodeId: string) => {
    const state = await canvasLinksCollection.stateWhenReady();
    const existingLinks = Array.from(state.values()).filter(
      (link) =>
        link.userId === userId && link.canvasId === canvasId && link.elementId === elementId,
    );
    if (existingLinks.length > 0) {
      canvasLinksCollection.delete(existingLinks.map((link) => link.id));
    }

    const now = new Date();
    canvasLinksCollection.insert({
      id: ulid(),
      userId,
      canvasId,
      elementId,
      nodeId,
      createdAt: now,
    });
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

    canvasLinksCollection.delete(toDelete);
  };

  const pruneCanvasLinks = async (canvasId: string, elementIds: string[]) => {
    const state = await canvasLinksCollection.stateWhenReady();
    const toDelete = Array.from(state.values())
      .filter((link) => link.userId === userId && link.canvasId === canvasId)
      .filter((link) => !elementIds.includes(link.elementId))
      .map((link) => link.id);

    if (toDelete.length === 0) return;
    canvasLinksCollection.delete(toDelete);
  };

  return {
    upsertCanvasScene,
    setCanvasLink,
    removeCanvasLink,
    pruneCanvasLinks,
  };
}
