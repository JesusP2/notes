import type { JSONContent } from "@tiptap/core";
import { format } from "date-fns";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

function generateFilename(title: string, extension: string): string {
  const sanitizedTitle = sanitizeFilename(title);
  const dateStr = format(new Date(), "yyyy-MM-dd");
  return `${sanitizedTitle}-${dateStr}.${extension}`;
}

function jsonToMarkdown(node: JSONContent, depth = 0, orderedIndex?: number): string {
  const parts: string[] = [];

  switch (node.type) {
    case "doc":
      if (node.content) {
        parts.push(node.content.map((child) => jsonToMarkdown(child, depth)).join("\n\n"));
      }
      break;
    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const prefix = "#".repeat(level);
      const text = node.content?.map((child) => jsonToMarkdown(child, depth)).join("") ?? "";
      parts.push(`${prefix} ${text}`);
      break;
    }
    case "paragraph": {
      const text = node.content?.map((child) => jsonToMarkdown(child, depth)).join("") ?? "";
      parts.push(text);
      break;
    }
    case "bulletList":
      if (node.content) {
        parts.push(node.content.map((child) => jsonToMarkdown(child, depth)).join("\n"));
      }
      break;
    case "orderedList":
      if (node.content) {
        parts.push(
          node.content.map((child, index) => jsonToMarkdown(child, depth, index + 1)).join("\n"),
        );
      }
      break;
    case "listItem": {
      const prefix = orderedIndex !== undefined ? `${orderedIndex}. ` : "- ";
      const text = node.content?.map((child) => jsonToMarkdown(child, depth + 1)).join("\n") ?? "";
      parts.push(`${prefix}${text}`);
      break;
    }
    case "taskList":
      if (node.content) {
        parts.push(node.content.map((child) => jsonToMarkdown(child, depth)).join("\n"));
      }
      break;
    case "taskItem": {
      const checked = node.attrs?.checked ? "x" : " ";
      const text = node.content?.map((child) => jsonToMarkdown(child, depth)).join("") ?? "";
      parts.push(`- [${checked}] ${text}`);
      break;
    }
    case "blockquote": {
      const text = node.content?.map((child) => jsonToMarkdown(child, depth)).join("\n") ?? "";
      parts.push(
        text
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n"),
      );
      break;
    }
    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const text = node.content?.map((child) => jsonToMarkdown(child, depth)).join("") ?? "";
      parts.push(`\`\`\`${lang}\n${text}\n\`\`\``);
      break;
    }
    case "horizontalRule":
      parts.push("---");
      break;
    case "wikiLink": {
      const title = (node.attrs?.title as string) || "";
      parts.push(`[[${title}]]`);
      break;
    }
    case "text": {
      let text = node.text ?? "";
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "bold") text = `**${text}**`;
          else if (mark.type === "italic") text = `*${text}*`;
          else if (mark.type === "code") text = `\`${text}\``;
          else if (mark.type === "strike") text = `~~${text}~~`;
          else if (mark.type === "link") {
            const href = (mark.attrs?.href as string) || "";
            text = `[${text}](${href})`;
          }
        }
      }
      parts.push(text);
      break;
    }
    case "hardBreak":
      parts.push("\n");
      break;
    default:
      if (node.content) {
        parts.push(node.content.map((child) => jsonToMarkdown(child, depth)).join(""));
      } else if (node.text) {
        parts.push(node.text);
      }
  }

  return parts.join("");
}

export function exportAsMarkdown(title: string, content: JSONContent): void {
  const filename = generateFilename(title, "md");
  const markdown = jsonToMarkdown(content);

  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function jsonToHtml(node: JSONContent): string {
  const parts: string[] = [];

  switch (node.type) {
    case "doc":
      if (node.content) {
        parts.push(node.content.map(jsonToHtml).join(""));
      }
      break;
    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const text = node.content?.map(jsonToHtml).join("") ?? "";
      parts.push(`<h${level}>${text}</h${level}>`);
      break;
    }
    case "paragraph": {
      const text = node.content?.map(jsonToHtml).join("") ?? "";
      parts.push(`<p>${text}</p>`);
      break;
    }
    case "bulletList":
      if (node.content) {
        parts.push(`<ul>${node.content.map(jsonToHtml).join("")}</ul>`);
      }
      break;
    case "orderedList":
      if (node.content) {
        parts.push(`<ol>${node.content.map(jsonToHtml).join("")}</ol>`);
      }
      break;
    case "listItem": {
      const text = node.content?.map(jsonToHtml).join("") ?? "";
      parts.push(`<li>${text}</li>`);
      break;
    }
    case "taskList":
      if (node.content) {
        parts.push(`<ul class="task-list">${node.content.map(jsonToHtml).join("")}</ul>`);
      }
      break;
    case "taskItem": {
      const checked = node.attrs?.checked ? "checked" : "";
      const text = node.content?.map(jsonToHtml).join("") ?? "";
      parts.push(`<li><input type="checkbox" ${checked} disabled /> ${text}</li>`);
      break;
    }
    case "blockquote": {
      const text = node.content?.map(jsonToHtml).join("") ?? "";
      parts.push(`<blockquote>${text}</blockquote>`);
      break;
    }
    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const text = node.content?.map(jsonToHtml).join("") ?? "";
      const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      parts.push(`<pre><code class="language-${lang}">${escaped}</code></pre>`);
      break;
    }
    case "horizontalRule":
      parts.push("<hr />");
      break;
    case "wikiLink": {
      const title = (node.attrs?.title as string) || "";
      parts.push(`<span class="wiki-link">[[${title}]]</span>`);
      break;
    }
    case "text": {
      let text = (node.text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "bold") text = `<strong>${text}</strong>`;
          else if (mark.type === "italic") text = `<em>${text}</em>`;
          else if (mark.type === "code") text = `<code>${text}</code>`;
          else if (mark.type === "strike") text = `<del>${text}</del>`;
          else if (mark.type === "link") {
            const href = (mark.attrs?.href as string) || "";
            text = `<a href="${href}">${text}</a>`;
          }
        }
      }
      parts.push(text);
      break;
    }
    case "hardBreak":
      parts.push("<br />");
      break;
    default:
      if (node.content) {
        parts.push(node.content.map(jsonToHtml).join(""));
      } else if (node.text) {
        parts.push(node.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
      }
  }

  return parts.join("");
}

export function exportAsPdf(title: string, content: JSONContent): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return;
  }

  const htmlContent = jsonToHtml(content);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          h1 { font-size: 1.8em; margin-bottom: 1em; }
          h2 { font-size: 1.4em; margin-top: 1.5em; }
          h3 { font-size: 1.2em; margin-top: 1.2em; }
          pre, code {
            font-family: 'SF Mono', Menlo, monospace;
            background: #f5f5f5;
            padding: 0.2em 0.4em;
            border-radius: 3px;
          }
          pre { padding: 1em; overflow-x: auto; }
          blockquote {
            border-left: 3px solid #ddd;
            margin-left: 0;
            padding-left: 1em;
            color: #666;
          }
          .wiki-link {
            color: #0066cc;
            text-decoration: underline;
          }
          .task-list { list-style: none; padding-left: 0; }
          .task-list li { margin: 0.5em 0; }
          @media print {
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.print();
  };
}
