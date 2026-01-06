import type { TextBlock } from "./extractor";

export interface ChunkOptions {
  targetWords?: number;
  maxWords?: number;
  overlapWords?: number;
}

export interface Chunk {
  chunkIndex: number;
  text: string;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  targetWords: 200,
  maxWords: 260,
  overlapWords: 50,
};

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function splitByLines(text: string): string[] {
  return text.split("\n").filter((line) => line.trim().length > 0);
}

function splitBySentences(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

function splitByWords(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/);
  const parts: string[] = [];

  for (let i = 0; i < words.length; i += maxWords) {
    parts.push(words.slice(i, i + maxWords).join(" "));
  }

  return parts;
}

function isStructuredBlock(block: TextBlock): boolean {
  return ["codeBlock", "mermaid", "mathBlock", "table"].includes(block.type);
}

function splitOversizedBlock(block: TextBlock, maxWords: number): TextBlock[] {
  const wordCount = countWords(block.text);
  if (wordCount <= maxWords) {
    return [block];
  }

  if (isStructuredBlock(block)) {
    const lines = splitByLines(block.text);
    if (lines.length <= 1) {
      return [block];
    }

    const subBlocks: TextBlock[] = [];
    let currentLines: string[] = [];
    let currentWords = 0;

    for (const line of lines) {
      const lineWords = countWords(line);
      if (currentWords + lineWords > maxWords && currentLines.length > 0) {
        subBlocks.push({
          type: block.type,
          text: currentLines.join("\n"),
        });
        currentLines = [line];
        currentWords = lineWords;
      } else {
        currentLines.push(line);
        currentWords += lineWords;
      }
    }

    if (currentLines.length > 0) {
      subBlocks.push({
        type: block.type,
        text: currentLines.join("\n"),
      });
    }

    return subBlocks;
  }

  const sentences = splitBySentences(block.text);
  if (sentences.length > 1) {
    const subBlocks: TextBlock[] = [];
    let currentSentences: string[] = [];
    let currentWords = 0;

    for (const sentence of sentences) {
      const sentenceWords = countWords(sentence);
      if (currentWords + sentenceWords > maxWords && currentSentences.length > 0) {
        subBlocks.push({
          type: block.type,
          text: currentSentences.join(" "),
        });
        currentSentences = [sentence];
        currentWords = sentenceWords;
      } else {
        currentSentences.push(sentence);
        currentWords += sentenceWords;
      }
    }

    if (currentSentences.length > 0) {
      subBlocks.push({
        type: block.type,
        text: currentSentences.join(" "),
      });
    }

    return subBlocks;
  }

  const wordParts = splitByWords(block.text, maxWords);
  return wordParts.map((text) => ({ type: block.type, text }));
}

function normalizeBlocks(blocks: TextBlock[], maxWords: number): TextBlock[] {
  const normalized: TextBlock[] = [];

  for (const block of blocks) {
    const splitBlocks = splitOversizedBlock(block, maxWords);
    normalized.push(...splitBlocks);
  }

  return normalized;
}

function getOverlapText(prevChunkBlocks: TextBlock[], overlapWords: number): string {
  if (prevChunkBlocks.length === 0) return "";

  const reversedBlocks = [...prevChunkBlocks].reverse();
  const overlapParts: string[] = [];
  let wordCount = 0;

  for (const block of reversedBlocks) {
    const blockWords = countWords(block.text);
    if (wordCount + blockWords <= overlapWords) {
      overlapParts.unshift(block.text);
      wordCount += blockWords;
    } else {
      const words = block.text.split(/\s+/);
      const neededWords = overlapWords - wordCount;
      if (neededWords > 0 && words.length > 0) {
        const partialText = words.slice(-neededWords).join(" ");
        overlapParts.unshift(partialText);
      }
      break;
    }
  }

  return overlapParts.join("\n\n");
}

export function chunkBlocks(blocks: TextBlock[], options: ChunkOptions = {}): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const normalizedBlocks = normalizeBlocks(blocks, opts.maxWords);

  if (normalizedBlocks.length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];
  let currentChunkBlocks: TextBlock[] = [];
  let currentWordCount = 0;
  let prevChunkBlocks: TextBlock[] = [];

  for (let i = 0; i < normalizedBlocks.length; i++) {
    const block = normalizedBlocks[i];
    const blockWords = countWords(block.text);

    if (currentWordCount + blockWords > opts.maxWords && currentChunkBlocks.length > 0) {
      const chunkText = currentChunkBlocks.map((b) => b.text).join("\n\n");
      chunks.push({
        chunkIndex: chunks.length,
        text: chunkText,
      });

      prevChunkBlocks = [...currentChunkBlocks];
      currentChunkBlocks = [];
      currentWordCount = 0;

      const overlapText = getOverlapText(prevChunkBlocks, opts.overlapWords);
      if (overlapText) {
        currentChunkBlocks.push({ type: "overlap", text: overlapText });
        currentWordCount = countWords(overlapText);
      }
    }

    currentChunkBlocks.push(block);
    currentWordCount += blockWords;
  }

  if (currentChunkBlocks.length > 0) {
    const chunkText = currentChunkBlocks.map((b) => b.text).join("\n\n");
    chunks.push({
      chunkIndex: chunks.length,
      text: chunkText,
    });
  }

  return chunks;
}
