import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { blocksToText, extractBlocks } from "./extractor";

describe("extractBlocks", () => {
  it("extracts headings with correct prefix", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Main Title" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Subtitle" }],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Section" }],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(3);
    expect(blocks[0].text).toBe("# Main Title");
    expect(blocks[1].text).toBe("## Subtitle");
    expect(blocks[2].text).toBe("### Section");
  });

  it("extracts paragraphs with collapsed whitespace", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello   world,  " },
            { type: "text", text: " how are you?" },
          ],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toBe("Hello world, how are you?");
  });

  it("preserves links in text", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Check out " },
            {
              type: "text",
              text: "this link",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
            { type: "text", text: " for more info." },
          ],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks[0].text).toContain("(link: https://example.com)");
  });

  it("extracts bullet lists", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First item" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second item" }],
                },
              ],
            },
          ],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe("- First item");
    expect(blocks[1].text).toBe("- Second item");
  });

  it("extracts ordered lists with numbers", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 1 },
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Step one" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Step two" }],
                },
              ],
            },
          ],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe("1. Step one");
    expect(blocks[1].text).toBe("2. Step two");
  });

  it("extracts code blocks with language", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "typescript" },
          content: [{ type: "text", text: "const x = 1;\nconst y = 2;" }],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("codeBlock");
    expect(blocks[0].text).toContain("[code: typescript]");
    expect(blocks[0].text).toContain("const x = 1;");
    expect(blocks[0].text).toContain("[/code]");
  });

  it("extracts mermaid diagrams", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "mermaid",
          attrs: { code: "graph TD\n  A --> B" },
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("mermaid");
    expect(blocks[0].text).toContain("[diagram: mermaid]");
    expect(blocks[0].text).toContain("graph TD");
  });

  it("extracts math blocks", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "blockMath",
          attrs: { latex: "E = mc^2" },
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("mathBlock");
    expect(blocks[0].text).toContain("[math]");
    expect(blocks[0].text).toContain("E = mc^2");
  });

  it("extracts tables as row sentences", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Name" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Age" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Alice" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "30" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("table");
    expect(blocks[0].text).toContain("[table]");
    expect(blocks[0].text).toContain("Name=Alice");
    expect(blocks[0].text).toContain("Age=30");
  });

  it("extracts blockquotes with > prefix", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "This is a quote." }],
            },
          ],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("blockquote");
    expect(blocks[0].text).toBe("> This is a quote.");
  });

  it("handles wiki links", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "See " },
            {
              type: "wikiLink",
              attrs: { noteId: "abc123", title: "Related Note" },
            },
            { type: "text", text: " for more." },
          ],
        },
      ],
    };

    const blocks = extractBlocks(doc);
    expect(blocks[0].text).toContain("[[Related Note]]");
  });

  it("returns empty array for null content", () => {
    const blocks = extractBlocks(null);
    expect(blocks).toHaveLength(0);
  });
});

describe("blocksToText", () => {
  it("joins blocks with double newlines", () => {
    const blocks = [
      { type: "heading", text: "# Title" },
      { type: "paragraph", text: "Some content here." },
      { type: "paragraph", text: "More content." },
    ];

    const text = blocksToText(blocks);
    expect(text).toBe("# Title\n\nSome content here.\n\nMore content.");
  });
});
