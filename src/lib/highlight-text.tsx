import type { ReactNode } from "react";

/**
 * Highlight matched portions of text based on Fuse.js match indices.
 *
 * @param text - The full text to render
 * @param indices - Array of [start, end] tuples from Fuse.js (end is inclusive)
 * @param highlightClassName - CSS class for highlighted portions
 * @returns Array of React nodes with highlighted spans
 */
export function highlightText(
  text: string,
  indices: ReadonlyArray<readonly [number, number]>,
  highlightClassName = "text-orange-400 font-medium",
): ReactNode[] {
  if (!indices.length) {
    return [text];
  }

  // Sort indices by start position
  const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);

  const parts: ReactNode[] = [];
  let lastEnd = 0;

  for (const [start, end] of sortedIndices) {
    // Skip if this range overlaps with previous (Fuse.js shouldn't produce this, but be safe)
    if (start < lastEnd) {
      continue;
    }

    // Add text before match
    if (start > lastEnd) {
      parts.push(text.slice(lastEnd, start));
    }

    // Add highlighted match (end is inclusive in Fuse.js)
    parts.push(
      <span key={`${start}-${end}`} className={highlightClassName}>
        {text.slice(start, end + 1)}
      </span>,
    );

    lastEnd = end + 1;
  }

  // Add remaining text after last match
  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return parts;
}

/**
 * Get title match indices from FuzzyNoteResult matches array.
 */
export function getTitleMatchIndices(
  matches: ReadonlyArray<{ key: string; indices: ReadonlyArray<readonly [number, number]> }>,
): ReadonlyArray<readonly [number, number]> {
  const titleMatch = matches.find((m) => m.key === "title");
  return titleMatch?.indices ?? [];
}

/**
 * Get content/cleanText match indices from FuzzyNoteResult matches array.
 */
export function getContentMatchIndices(
  matches: ReadonlyArray<{ key: string; indices: ReadonlyArray<readonly [number, number]> }>,
): ReadonlyArray<readonly [number, number]> {
  const contentMatch = matches.find((m) => m.key === "cleanText" || m.key === "excerpt");
  return contentMatch?.indices ?? [];
}
