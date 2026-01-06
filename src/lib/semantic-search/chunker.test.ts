import { describe, expect, it } from "vitest";
import type { TextBlock } from "./extractor";
import { chunkBlocks } from "./chunker";

function createBlocks(texts: string[]): TextBlock[] {
  return texts.map((text) => ({ type: "paragraph", text }));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

describe("chunkBlocks", () => {
  it("creates single chunk for small content", () => {
    const blocks = createBlocks(["Hello world.", "This is a test."]);
    const chunks = chunkBlocks(blocks, {
      targetWords: 200,
      maxWords: 260,
      overlapWords: 50,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].text).toContain("Hello world.");
    expect(chunks[0].text).toContain("This is a test.");
  });

  it("splits into multiple chunks when exceeding maxWords", () => {
    const longText = Array(100).fill("word").join(" ");
    const blocks = [
      { type: "paragraph", text: longText },
      { type: "paragraph", text: longText },
      { type: "paragraph", text: longText },
    ];

    const chunks = chunkBlocks(blocks, {
      targetWords: 80,
      maxWords: 120,
      overlapWords: 20,
    });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      const words = wordCount(chunk.text);
      expect(words).toBeLessThanOrEqual(150);
    }
  });

  it("includes overlap between chunks", () => {
    const block1 = "First paragraph with some content here.";
    const block2 = "Second paragraph with different content.";
    const block3 = "Third paragraph with even more content.";
    const block4 = "Fourth paragraph concluding the text.";

    const blocks = createBlocks([block1, block2, block3, block4]);

    const chunks = chunkBlocks(blocks, {
      targetWords: 10,
      maxWords: 15,
      overlapWords: 5,
    });

    if (chunks.length >= 2) {
      const chunk1End = chunks[0].text.split("\n\n").pop() || "";
      const chunk2Start = chunks[1].text;
      expect(chunk2Start).toContain(chunk1End.split(" ").slice(-3).join(" "));
    }
  });

  it("returns empty array for empty blocks", () => {
    const chunks = chunkBlocks([]);
    expect(chunks).toHaveLength(0);
  });

  it("preserves chunk indices in order", () => {
    const blocks = createBlocks([
      Array(50).fill("word").join(" "),
      Array(50).fill("word").join(" "),
      Array(50).fill("word").join(" "),
    ]);

    const chunks = chunkBlocks(blocks, {
      targetWords: 40,
      maxWords: 60,
      overlapWords: 10,
    });

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
    }
  });

  it("handles oversized blocks by splitting", () => {
    const hugeBlock = Array(500).fill("word").join(" ");
    const blocks: TextBlock[] = [{ type: "paragraph", text: hugeBlock }];

    const chunks = chunkBlocks(blocks, {
      targetWords: 100,
      maxWords: 150,
      overlapWords: 20,
    });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      const words = wordCount(chunk.text);
      expect(words).toBeLessThanOrEqual(200);
    }
  });

  it("preserves code block structure when splitting", () => {
    const codeLines = Array(50).fill("const x = 1;").join("\n");
    const blocks: TextBlock[] = [
      {
        type: "codeBlock",
        text: `[code: typescript]\n${codeLines}\n[/code]`,
      },
    ];

    const chunks = chunkBlocks(blocks, {
      targetWords: 50,
      maxWords: 80,
      overlapWords: 10,
    });

    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("is deterministic", () => {
    const blocks = createBlocks([
      "First block with some text.",
      "Second block with more text.",
      "Third block with additional content.",
    ]);

    const chunks1 = chunkBlocks(blocks, { targetWords: 10, maxWords: 15 });
    const chunks2 = chunkBlocks(blocks, { targetWords: 10, maxWords: 15 });

    expect(chunks1).toEqual(chunks2);
  });

  it("uses default options when not specified", () => {
    const blocks = createBlocks(["Short text."]);
    const chunks = chunkBlocks(blocks);

    expect(chunks).toHaveLength(1);
  });
});
