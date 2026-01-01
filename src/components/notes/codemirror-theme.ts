import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

function createBaseTheme(isDark: boolean) {
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: "15px",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      },
      ".cm-content": {
        fontFamily: "var(--font-sans)",
        caretColor: isDark ? "#fff" : "#000",
        padding: "0",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: isDark ? "#fff" : "#000",
        borderLeftWidth: "2px",
      },
      "&.cm-focused .cm-cursor": {
        borderLeftColor: isDark ? "#fff" : "#000",
      },
      ".cm-gutters": {
        backgroundColor: "var(--muted)",
        color: "var(--muted-foreground)",
        border: "none",
        borderRight: "1px solid var(--border)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "var(--accent)",
      },
      ".cm-activeLine": {
        backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
      },
      ".cm-selectionBackground": {
        backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
      },
      "&.cm-focused .cm-selectionBackground": {
        backgroundColor: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
      },
      ".cm-panels": {
        backgroundColor: "var(--muted)",
        color: "var(--foreground)",
      },
      ".cm-panels.cm-panels-top": {
        borderBottom: "1px solid var(--border)",
      },
      ".cm-panels.cm-panels-bottom": {
        borderTop: "1px solid var(--border)",
      },
      ".cm-vim-panel": {
        backgroundColor: "var(--muted)",
        color: "var(--foreground)",
        padding: "4px 8px",
        fontFamily: "monospace",
      },
      ".cm-vim-panel input": {
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "2px 6px",
        outline: "none",
      },
      ".cm-fat-cursor": {
        background: isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
      },
      "&:not(.cm-focused) .cm-fat-cursor": {
        background: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)",
      },
    },
    { dark: isDark },
  );
}

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.8em", fontWeight: "700", color: "#1a1a1a" },
  { tag: tags.heading2, fontSize: "1.5em", fontWeight: "600", color: "#2a2a2a" },
  { tag: tags.heading3, fontSize: "1.25em", fontWeight: "600", color: "#3a3a3a" },
  { tag: tags.heading4, fontSize: "1.1em", fontWeight: "600", color: "#4a4a4a" },
  { tag: tags.heading5, fontSize: "1.05em", fontWeight: "600", color: "#5a5a5a" },
  { tag: tags.heading6, fontSize: "1em", fontWeight: "600", color: "#6a6a6a" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "#0066cc", textDecoration: "underline" },
  { tag: tags.url, color: "#0066cc" },
  {
    tag: tags.monospace,
    fontFamily: "monospace",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: "3px",
  },
  {
    tag: tags.quote,
    color: "#666",
    fontStyle: "italic",
    borderLeft: "3px solid #ccc",
    paddingLeft: "8px",
  },
  { tag: tags.list, color: "#333" },
  { tag: tags.keyword, color: "#d73a49" },
  { tag: tags.function(tags.variableName), color: "#6f42c1" },
  { tag: tags.string, color: "#22863a" },
  { tag: tags.number, color: "#005cc5" },
  { tag: tags.comment, color: "#6a737d", fontStyle: "italic" },
  { tag: tags.operator, color: "#d73a49" },
  { tag: tags.className, color: "#6f42c1" },
  { tag: tags.propertyName, color: "#005cc5" },
  { tag: tags.punctuation, color: "#24292e" },
  { tag: tags.meta, color: "#6a737d" },
  { tag: tags.processingInstruction, color: "#6a737d" },
]);

const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.8em", fontWeight: "700", color: "#f0f0f0" },
  { tag: tags.heading2, fontSize: "1.5em", fontWeight: "600", color: "#e0e0e0" },
  { tag: tags.heading3, fontSize: "1.25em", fontWeight: "600", color: "#d0d0d0" },
  { tag: tags.heading4, fontSize: "1.1em", fontWeight: "600", color: "#c0c0c0" },
  { tag: tags.heading5, fontSize: "1.05em", fontWeight: "600", color: "#b0b0b0" },
  { tag: tags.heading6, fontSize: "1em", fontWeight: "600", color: "#a0a0a0" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "#58a6ff", textDecoration: "underline" },
  { tag: tags.url, color: "#58a6ff" },
  {
    tag: tags.monospace,
    fontFamily: "monospace",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: "3px",
  },
  {
    tag: tags.quote,
    color: "#8b949e",
    fontStyle: "italic",
    borderLeft: "3px solid #3b434b",
    paddingLeft: "8px",
  },
  { tag: tags.list, color: "#c9d1d9" },
  { tag: tags.keyword, color: "#ff7b72" },
  { tag: tags.function(tags.variableName), color: "#d2a8ff" },
  { tag: tags.string, color: "#a5d6ff" },
  { tag: tags.number, color: "#79c0ff" },
  { tag: tags.comment, color: "#8b949e", fontStyle: "italic" },
  { tag: tags.operator, color: "#ff7b72" },
  { tag: tags.className, color: "#d2a8ff" },
  { tag: tags.propertyName, color: "#79c0ff" },
  { tag: tags.punctuation, color: "#c9d1d9" },
  { tag: tags.meta, color: "#8b949e" },
  { tag: tags.processingInstruction, color: "#8b949e" },
]);

export function createAppTheme(isDark: boolean) {
  return [
    createBaseTheme(isDark),
    syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle),
  ];
}
