import type { JSONContent } from "@tiptap/core";
import type {
  AnalyzeResponse,
  ContentAnalysis,
  EmbedData,
  TaskData,
  WikiLinkData,
  WorkerRequest,
} from "./content-analyzer.types";

function hashContent(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

interface TraversalState {
  textParts: string[];
  wikiLinks: WikiLinkData[];
  wikiLinksSeen: Set<string>;
  embeds: EmbedData[];
  embedsSeen: Set<string>;
  tasks: TaskData[];
  taskPosition: number;
  noteId: string;
}

function extractTextFromNode(node: JSONContent): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(extractTextFromNode).join("");
}

function traverseNode(node: JSONContent, state: TraversalState): void {
  if (node.text) {
    state.textParts.push(node.text);
  }

  if (node.type === "wikiLink") {
    const attrs = node.attrs ?? {};
    const noteId = (attrs.noteId as string) || null;
    const title = (attrs.title as string) || "";

    if (title.trim()) {
      state.textParts.push(title);

      const key = title.toLowerCase();
      if (!state.wikiLinksSeen.has(key)) {
        state.wikiLinksSeen.add(key);
        state.wikiLinks.push({ noteId, title: title.trim() });
      }
    }
    return;
  }

  if (node.type === "image" && node.attrs?.alt) {
    const embedMatch = String(node.attrs.alt).match(/^!\[\[([^\]]+)\]\]$/);
    if (embedMatch) {
      const title = embedMatch[1]?.trim();
      if (title) {
        const key = title.toLowerCase();
        if (!state.embedsSeen.has(key)) {
          state.embedsSeen.add(key);
          state.embeds.push({ title });
        }
      }
    }
  }

  if (node.type === "taskItem") {
    const checked = node.attrs?.checked === true;
    const taskContent = node.content ? extractTextFromNode({ content: node.content }) : "";

    if (taskContent.trim()) {
      const blockId = hashContent(`${state.noteId}:${state.taskPosition}:${taskContent.trim()}`);
      state.tasks.push({
        blockId,
        content: taskContent.trim(),
        isDone: checked,
        position: state.taskPosition,
      });
    }
    state.taskPosition += 1;

    if (node.content) {
      for (const child of node.content) {
        traverseNode(child, state);
      }
    }
    return;
  }

  if (node.content) {
    for (const child of node.content) {
      traverseNode(child, state);
    }
  }
}

function analyzeContent(
  content: JSONContent | null,
  noteId: string,
  excerptMaxLength = 180
): ContentAnalysis {
  if (!content) {
    return {
      excerpt: "",
      wikiLinks: [],
      embeds: [],
      tasks: [],
    };
  }

  const state: TraversalState = {
    textParts: [],
    wikiLinks: [],
    wikiLinksSeen: new Set(),
    embeds: [],
    embedsSeen: new Set(),
    tasks: [],
    taskPosition: 0,
    noteId,
  };

  traverseNode(content, state);

  const fullText = state.textParts.join(" ").replace(/\s+/g, " ").trim();
  const excerpt =
    fullText.length <= excerptMaxLength
      ? fullText
      : `${fullText.slice(0, excerptMaxLength).trimEnd()}...`;

  return {
    excerpt,
    wikiLinks: state.wikiLinks,
    embeds: state.embeds,
    tasks: state.tasks,
  };
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  if (request.type === "analyze") {
    const result = analyzeContent(request.content, request.noteId, request.excerptMaxLength);
    const response: AnalyzeResponse = {
      type: "analyze",
      id: request.id,
      result,
    };
    self.postMessage(response);
  }
};
