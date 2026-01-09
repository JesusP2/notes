import type { JSONContent } from "@tiptap/core";

export interface WikiLinkData {
  noteId: string | null;
  title: string;
}

export interface EmbedData {
  title: string;
}

export interface TaskData {
  blockId: string;
  content: string;
  isDone: boolean;
  position: number;
}

export interface ContentAnalysis {
  excerpt: string;
  wikiLinks: WikiLinkData[];
  embeds: EmbedData[];
  tasks: TaskData[];
}

export interface AnalyzeRequest {
  type: "analyze";
  id: number;
  content: JSONContent | null;
  noteId: string;
  excerptMaxLength?: number;
}

export interface AnalyzeResponse {
  type: "analyze";
  id: number;
  result: ContentAnalysis;
}

export type WorkerRequest = AnalyzeRequest;
export type WorkerResponse = AnalyzeResponse;
