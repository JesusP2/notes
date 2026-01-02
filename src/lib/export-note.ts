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

export function exportAsMarkdown(title: string, content: string): void {
  const filename = generateFilename(title, "md");
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAsPdf(title: string, content: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return;
  }

  const escapedContent = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

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
          @media print {
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: inherit; background: none; padding: 0;">${escapedContent}</pre>
      </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.print();
  };
}
