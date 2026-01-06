import type { JSONContent } from "@tiptap/core";

export interface TextBlock {
  type: string;
  text: string;
}

function getInlineText(node: JSONContent): string {
  const parts: string[] = [];

  if (node.text) {
    let text = node.text;
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "link" && mark.attrs?.href) {
          text = `${text} (link: ${mark.attrs.href})`;
        }
      }
    }
    parts.push(text);
  }

  if (node.type === "wikiLink") {
    const title = (node.attrs?.title as string) || "";
    const noteId = (node.attrs?.noteId as string) || "";
    if (title) {
      parts.push(`[[${title}]]`);
    } else if (noteId) {
      parts.push(`[[${noteId}]]`);
    }
  }

  if (node.content) {
    for (const child of node.content) {
      parts.push(getInlineText(child));
    }
  }

  return parts.join("");
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractListItems(
  node: JSONContent,
  prefix: string,
  depth: number,
): TextBlock[] {
  const blocks: TextBlock[] = [];
  const indent = "  ".repeat(depth);

  if (node.type === "listItem" || node.type === "taskItem") {
    const itemContent = node.content || [];
    const textParts: string[] = [];

    for (const child of itemContent) {
      if (child.type === "paragraph") {
        textParts.push(collapseWhitespace(getInlineText(child)));
      } else if (
        child.type === "bulletList" ||
        child.type === "orderedList" ||
        child.type === "taskList"
      ) {
        if (textParts.length > 0) {
          const itemText = textParts.join(" ");
          const finalPrefix =
            node.type === "taskItem"
              ? node.attrs?.checked
                ? "[x]"
                : "[ ]"
              : prefix;
          blocks.push({
            type: "listItem",
            text: `${indent}${finalPrefix} ${itemText}`,
          });
          textParts.length = 0;
        }
        blocks.push(...extractListBlocks(child, depth + 1));
      }
    }

    if (textParts.length > 0) {
      const itemText = textParts.join(" ");
      const finalPrefix =
        node.type === "taskItem"
          ? node.attrs?.checked
            ? "[x]"
            : "[ ]"
          : prefix;
      blocks.push({
        type: "listItem",
        text: `${indent}${finalPrefix} ${itemText}`,
      });
    }
  }

  return blocks;
}

function extractListBlocks(node: JSONContent, depth = 0): TextBlock[] {
  const blocks: TextBlock[] = [];
  const items = node.content || [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let prefix = "-";

    if (node.type === "orderedList") {
      const start = (node.attrs?.start as number) || 1;
      prefix = `${start + i}.`;
    } else if (node.type === "taskList") {
      prefix = "";
    }

    blocks.push(...extractListItems(item, prefix, depth));
  }

  return blocks;
}

function extractCodeBlock(node: JSONContent): TextBlock {
  const language = (node.attrs?.language as string) || "text";
  const code = node.content?.map((c) => c.text || "").join("\n") || "";
  return {
    type: "codeBlock",
    text: `[code: ${language}]\n${code}\n[/code]`,
  };
}

function extractMermaid(node: JSONContent): TextBlock {
  const code =
    (node.attrs?.code as string) ||
    (node.attrs?.text as string) ||
    (node.attrs?.value as string) ||
    "";
  return {
    type: "mermaid",
    text: `[diagram: mermaid]\n${code}\n[/diagram]`,
  };
}

function extractMathBlock(node: JSONContent): TextBlock {
  const latex = (node.attrs?.latex as string) || "";
  return {
    type: "mathBlock",
    text: `[math]\n${latex}\n[/math]`,
  };
}

function extractMathInline(node: JSONContent): string {
  const latex = (node.attrs?.latex as string) || "";
  return `[math]${latex}[/math]`;
}

function extractTableBlock(node: JSONContent): TextBlock {
  const rows: string[][] = [];
  let headerRow: string[] | null = null;

  for (const row of node.content || []) {
    if (row.type !== "tableRow") continue;

    const cells: string[] = [];
    let isHeader = false;

    for (const cell of row.content || []) {
      if (cell.type === "tableHeader") {
        isHeader = true;
      }
      const cellText = collapseWhitespace(getInlineText(cell));
      cells.push(cellText);
    }

    if (isHeader && !headerRow) {
      headerRow = cells;
    } else {
      rows.push(cells);
    }
  }

  const lines: string[] = ["[table]"];
  const headers = headerRow || rows[0]?.map((_, i) => `Col${i + 1}`) || [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowParts: string[] = [];
    for (let j = 0; j < row.length; j++) {
      const colName = headers[j] || `Col${j + 1}`;
      rowParts.push(`${colName}=${row[j]}`);
    }
    lines.push(`Row ${i + 1}: ${rowParts.join("; ")};`);
  }

  lines.push("[/table]");
  return { type: "table", text: lines.join("\n") };
}

function extractBlockquote(node: JSONContent): TextBlock[] {
  const blocks: TextBlock[] = [];
  const innerBlocks = extractBlocksFromContent(node.content || []);

  for (const block of innerBlocks) {
    const quotedLines = block.text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    blocks.push({ type: "blockquote", text: quotedLines });
  }

  return blocks;
}

function extractBlocksFromContent(content: JSONContent[]): TextBlock[] {
  const blocks: TextBlock[] = [];

  for (const node of content) {
    switch (node.type) {
      case "heading": {
        const level = (node.attrs?.level as number) || 1;
        const prefix = "#".repeat(level);
        const text = collapseWhitespace(getInlineText(node));
        blocks.push({ type: "heading", text: `${prefix} ${text}` });
        break;
      }

      case "paragraph": {
        let text = "";
        if (node.content) {
          const parts: string[] = [];
          for (const child of node.content) {
            if (child.type === "inlineMath" || child.type === "mathInline") {
              parts.push(extractMathInline(child));
            } else {
              parts.push(getInlineText(child));
            }
          }
          text = collapseWhitespace(parts.join(""));
        }
        if (text) {
          blocks.push({ type: "paragraph", text });
        }
        break;
      }

      case "bulletList":
      case "orderedList":
      case "taskList":
        blocks.push(...extractListBlocks(node));
        break;

      case "codeBlock":
        blocks.push(extractCodeBlock(node));
        break;

      case "mermaid":
      case "mermaidBlock":
      case "diagram":
        blocks.push(extractMermaid(node));
        break;

      case "blockMath":
      case "mathBlock":
        blocks.push(extractMathBlock(node));
        break;

      case "table":
        blocks.push(extractTableBlock(node));
        break;

      case "blockquote":
        blocks.push(...extractBlockquote(node));
        break;

      case "horizontalRule":
        blocks.push({ type: "horizontalRule", text: "---" });
        break;

      case "image": {
        const alt = (node.attrs?.alt as string) || "";
        const src = (node.attrs?.src as string) || "";
        if (alt || src) {
          blocks.push({
            type: "image",
            text: alt ? `[image: ${alt}]` : `[image: ${src}]`,
          });
        }
        break;
      }

      case "callout": {
        const calloutType = (node.attrs?.type as string) || "info";
        const innerBlocks = extractBlocksFromContent(node.content || []);
        const innerText = innerBlocks.map((b) => b.text).join("\n");
        blocks.push({
          type: "callout",
          text: `[${calloutType}]\n${innerText}\n[/${calloutType}]`,
        });
        break;
      }

      default:
        if (node.content) {
          blocks.push(...extractBlocksFromContent(node.content));
        }
        break;
    }
  }

  return blocks;
}

export function extractBlocks(docJson: JSONContent | null): TextBlock[] {
  if (!docJson) return [];

  if (docJson.type === "doc" && docJson.content) {
    return extractBlocksFromContent(docJson.content);
  }

  return extractBlocksFromContent([docJson]);
}

export function blocksToText(blocks: TextBlock[]): string {
  return blocks.map((b) => b.text).join("\n\n");
}
