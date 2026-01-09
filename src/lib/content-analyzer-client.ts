import type { JSONContent } from "@tiptap/core";
import { analyzeContent as analyzeContentSync } from "./content-analyzer";
import type {
  AnalyzeRequest,
  ContentAnalysis,
  WorkerResponse,
} from "./content-analyzer.types";

type PendingRequest = {
  resolve: (result: ContentAnalysis) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<number, PendingRequest>();
let workerSupported: boolean | null = null;

function getWorker(): Worker | null {
  if (workerSupported === false) return null;

  if (worker) return worker;

  try {
    worker = new Worker(new URL("./content-analyzer.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      if (response.type === "analyze") {
        const pending = pendingRequests.get(response.id);
        if (pending) {
          pendingRequests.delete(response.id);
          pending.resolve(response.result);
        }
      }
    };

    worker.onerror = (error) => {
      console.error("Content analyzer worker error:", error);
      for (const pending of pendingRequests.values()) {
        pending.reject(new Error("Worker error"));
      }
      pendingRequests.clear();
      worker?.terminate();
      worker = null;
      workerSupported = false;
    };

    workerSupported = true;
    return worker;
  } catch {
    workerSupported = false;
    return null;
  }
}

export function analyzeContentAsync(
  content: JSONContent | null,
  noteId: string,
  excerptMaxLength = 180
): Promise<ContentAnalysis> {
  const w = getWorker();

  if (!w) {
    return Promise.resolve(analyzeContentSync(content, noteId, excerptMaxLength));
  }

  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });

    const request: AnalyzeRequest = {
      type: "analyze",
      id,
      content,
      noteId,
      excerptMaxLength,
    };

    w.postMessage(request);
  });
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pendingRequests.clear();
}
