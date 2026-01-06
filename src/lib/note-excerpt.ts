import type { JSONContent } from "@tiptap/core";

function extractTextFromJson(node: JSONContent): string {
  const parts: string[] = [];

  if (node.text) {
    parts.push(node.text);
  }

  if (node.type === "wikiLink") {
    const title = (node.attrs?.title as string) || "";
    if (title) parts.push(title);
  }

  if (node.content) {
    for (const child of node.content) {
      parts.push(extractTextFromJson(child));
    }
  }

  return parts.join(" ");
}

export function buildNoteExcerpt(content: JSONContent | null | undefined, maxLength = 180): string {
  if (!content) return "";

  const cleaned = extractTextFromJson(content).replace(/\s+/g, " ").trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength).trimEnd()}...`;
}
