export function applyTemplatePlaceholders(content: string, title: string): string {
  const now = new Date();
  const date = now.toLocaleDateString();
  const datetime = now.toLocaleString();

  return content
    .replaceAll("{{title}}", title)
    .replaceAll("{{date}}", date)
    .replaceAll("{{datetime}}", datetime);
}
