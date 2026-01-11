import type { JSONContent } from "@tiptap/core";

function applyPlaceholdersToNode(node: JSONContent, replacements: Record<string, string>): JSONContent {
  const result: JSONContent = { ...node };

  if (result.text) {
    let text = result.text;
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.replaceAll(placeholder, value);
    }
    result.text = text;
  }

  if (result.content) {
    result.content = result.content.map((child) => applyPlaceholdersToNode(child, replacements));
  }

  return result;
}

export function applyTemplatePlaceholders(content: JSONContent, title: string): JSONContent {
  const now = new Date();
  const date = now.toLocaleDateString();
  const datetime = now.toLocaleString();

  const replacements: Record<string, string> = {
    "{{title}}": title,
    "{{date}}": date,
    "{{datetime}}": datetime,
  };

  // Apply placeholders like {{title}}, {{date}}, {{datetime}}
  return applyPlaceholdersToNode(content, replacements);
}
