import "@excalidraw/excalidraw/index.css";
import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import type {
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, Link2, PanelLeft, PenTool } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NodeSearch } from "@/components/edges/node-search";
import { useAppSettings } from "@/components/providers/app-settings";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import type { Node } from "@/db/schema/graph";
import { canvasScenesCollection } from "@/lib/collections";
import {
  buildCanvasSceneStoragePayload,
  type CanvasScene,
  useCanvasLinks,
  useCanvasMutations,
  useCanvasScene,
  useNodeById,
} from "@/lib/graph-hooks";
import { cn } from "@/lib/utils";
import { useDebouncer } from "@tanstack/react-pacer";

const NOTE_LINK_PREFIX = "note:";

const DEFAULT_SCENE: CanvasScene = {
  elements: [],
  appState: {} as AppState,
  files: {} as BinaryFiles,
};

type ScenePayload = {
  elements: ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
  fingerprint: string;
};

export function CanvasEditor({ canvasId }: { canvasId: string }) {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { toggleSidebar, isSidebarCollapsed } = useAppSettings();
  const canvasNode = useNodeById(canvasId);
  const scene = useCanvasScene(canvasId);
  const links = useCanvasLinks(canvasId);
  const { upsertCanvasScene, setCanvasLink, removeCanvasLink, pruneCanvasLinks } =
    useCanvasMutations();
  const excalidrawRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const elementsRef = useRef<ExcalidrawElement[]>([]);
  const appStateRef = useRef<AppState | null>(null);
  const filesRef = useRef<BinaryFiles | null>(null);
  const sceneBootstrappedRef = useRef(false);
  const sceneAppliedRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const queuedFingerprintRef = useRef<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [apiReady, setApiReady] = useState(false);

  const debouncer = useDebouncer(
    (next: ScenePayload) => {
      upsertCanvasScene(canvasId, {
        elements: next.elements,
        appState: next.appState,
        files: next.files,
      });
      const elementIds = next.elements.map((element) => element.id);
      pruneCanvasLinks(canvasId, elementIds);
      lastSavedFingerprintRef.current = next.fingerprint;
      queuedFingerprintRef.current = null;
    },
    {
      wait: 300,
    },
  );

  const queueSceneSave = (elements: ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
    const { fingerprint } = buildCanvasSceneStoragePayload({ elements, appState, files });
    if (fingerprint === lastSavedFingerprintRef.current) return;
    if (fingerprint === queuedFingerprintRef.current) return;
    queuedFingerprintRef.current = fingerprint;
    debouncer.maybeExecute({ elements, appState, files, fingerprint });
  };

  const handleExcalidrawApi = (api: ExcalidrawImperativeAPI) => {
    excalidrawRef.current = api;
    setApiReady(true);
  };

  useEffect(() => {
    if (sceneBootstrappedRef.current) return;
    if (!canvasNode) return;
    if (scene) {
      sceneBootstrappedRef.current = true;
      return;
    }

    let isCancelled = false;
    const ensureScene = async () => {
      const state = await canvasScenesCollection.stateWhenReady();
      if (isCancelled) return;
      if (state.get(canvasId)) {
        sceneBootstrappedRef.current = true;
        return;
      }
      sceneBootstrappedRef.current = true;
      upsertCanvasScene(canvasId, DEFAULT_SCENE);
    };
    void ensureScene();

    return () => {
      isCancelled = true;
    };
  }, [canvasId, canvasNode, scene, upsertCanvasScene]);

  useEffect(() => {
    if (!scene || !apiReady || !excalidrawRef.current) return;
    if (sceneAppliedRef.current) return;
    sceneAppliedRef.current = true;

    const nextElements = scene.elements;
    const nextAppState = scene.appState;
    const nextFiles = scene.files;
    const { fingerprint } = buildCanvasSceneStoragePayload(scene);

    elementsRef.current = nextElements;
    appStateRef.current = nextAppState;
    filesRef.current = nextFiles;
    lastSavedFingerprintRef.current = fingerprint;
    queuedFingerprintRef.current = null;
    excalidrawRef.current.updateScene({
      elements: nextElements,
      appState: nextAppState,
    });
    if (Object.keys(nextFiles).length > 0) {
      excalidrawRef.current.addFiles(Object.values(nextFiles));
    }
  }, [apiReady, scene]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleBeforeUnload = () => {
      debouncer.flush();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      debouncer.flush();
    };
  }, [debouncer]);

  const linksByElement = new Map<string, string>();
  for (const link of links) {
    linksByElement.set(link.elementId, link.nodeId);
  }

  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;
  const linkedNodeId = selectedElementId ? (linksByElement.get(selectedElementId) ?? null) : null;
  const linkedNode = useNodeById(linkedNodeId ?? "");

  const handleChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    const nextElements = Array.from(elements);
    elementsRef.current = nextElements;
    appStateRef.current = appState;
    filesRef.current = files;

    const selectedIds = Object.entries(appState.selectedElementIds ?? {})
      .filter(([, selected]) => Boolean(selected))
      .map(([id]) => id);

    // Only update state if selection actually changed to prevent infinite loops
    setSelectedElementIds((prev) => {
      if (prev.length !== selectedIds.length) return selectedIds;
      if (prev.every((id, i) => id === selectedIds[i])) return prev;
      return selectedIds;
    });

    queueSceneSave(nextElements, appState, files);
  };

  const updateElementLink = (elementId: string, linkValue?: string | null) => {
    const elements = elementsRef.current ?? [];
    const nextLink = linkValue ?? null;
    const updatedElements = elements.map((element) =>
      element.id === elementId ? { ...element, link: nextLink } : element,
    );

    elementsRef.current = updatedElements;
    excalidrawRef.current?.updateScene({ elements: updatedElements });

    const appState = appStateRef.current ?? scene?.appState ?? ({} as AppState);
    const files = filesRef.current ?? scene?.files ?? ({} as BinaryFiles);
    queueSceneSave(updatedElements, appState, files);
  };

  const handleLinkToNode = async (node: Node) => {
    if (!selectedElementId) return;
    await setCanvasLink(canvasId, selectedElementId, node.id);
    updateElementLink(selectedElementId, `${NOTE_LINK_PREFIX}${node.id}`);
  };

  const handleClearLink = async () => {
    if (!selectedElementId) return;
    await removeCanvasLink(canvasId, selectedElementId);
    updateElementLink(selectedElementId, null);
  };

  const handleLinkOpen = (element: ExcalidrawElement) => {
    const link = element.link ?? "";
    if (!link) return;
    if (link.startsWith(NOTE_LINK_PREFIX)) {
      const noteId = link.slice(NOTE_LINK_PREFIX.length);
      navigate({ to: "/notes/$noteId", params: { noteId } });
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const initialDataRef = useRef<{
    elements: ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
  } | null>(null);
  if (!initialDataRef.current && scene) {
    initialDataRef.current = {
      elements: scene.elements ?? [],
      appState: scene.appState ?? ({} as AppState),
      files: scene.files ?? ({} as BinaryFiles),
    };
  }
  const initialData = initialDataRef.current ?? {
    elements: [],
    appState: {} as AppState,
    files: {} as BinaryFiles,
  };

  if (!canvasNode) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/10 p-8 text-center animate-in fade-in-50">
        <div className="rounded-full bg-muted p-4 mb-4">
          <PenTool className="size-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Canvas not found</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          The canvas could not be loaded. Try selecting it from the sidebar again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="relative flex-1 min-h-0">
        <Excalidraw
          excalidrawAPI={handleExcalidrawApi}
          initialData={initialData}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          onChange={handleChange}
          onLinkOpen={handleLinkOpen}
        >
          <MainMenu>
            <MainMenu.Item
              onSelect={toggleSidebar}
              icon={<PanelLeft className="size-4" />}
            >
              {isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
            </MainMenu.Item>
            <MainMenu.Separator />
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>
        {selectedElementIds.length > 0 && (
          <div className="absolute right-4 top-4 z-10 w-72 rounded-md border bg-popover p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Link2 className="size-3.5" />
                Element Link
              </div>
              <span className="text-[10px] text-muted-foreground">
                {selectedElementIds.length} selected
              </span>
            </div>

            {selectedElementIds.length === 1 ? (
              <div className="mt-3 space-y-3">
                {linkedNode ? (
                  <div className="flex items-center gap-2 text-xs">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <Link
                      to="/notes/$noteId"
                      params={{ noteId: linkedNode.id }}
                      className="font-medium hover:underline truncate"
                    >
                      {linkedNode.title}
                    </Link>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No note linked yet.</div>
                )}

                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Link to note
                  </div>
                  <NodeSearch
                    selectedId={linkedNodeId ?? undefined}
                    onSelect={handleLinkToNode}
                    placeholder="Search notes..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn(!linkedNodeId && "opacity-50 pointer-events-none")}
                    onClick={handleClearLink}
                  >
                    Clear link
                  </Button>
                  {linkedNodeId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate({
                          to: "/notes/$noteId",
                          params: { noteId: linkedNodeId },
                        })
                      }
                    >
                      Open note
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Select a single element to link it to a note.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
