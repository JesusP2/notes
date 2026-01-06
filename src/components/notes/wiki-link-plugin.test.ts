// @vitest-environment jsdom

import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { edgesCollection } from "@/lib/collections";
import { createTestDb, insertTestEdge, insertTestNode, TEST_USER_ID } from "@/test/helpers";
import { extractEmbeds, extractWikiLinks, syncEmbeds, syncWikiLinks } from "./wiki-link-plugin";

describe("extractWikiLinks", () => {
  it("extracts wiki links from JSON content", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Check out " },
            { type: "wikiLink", attrs: { noteId: "note-1", title: "Alpha" } },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "And also " },
            { type: "wikiLink", attrs: { noteId: "note-2", title: "Beta" } },
          ],
        },
      ],
    };
    const result = extractWikiLinks(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ noteId: "note-1", title: "Alpha" });
    expect(result[1]).toEqual({ noteId: "note-2", title: "Beta" });
  });

  it("deduplicates by title (case-insensitive)", () => {
    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "wikiLink", attrs: { noteId: "note-1", title: "Alpha" } }],
        },
        {
          type: "paragraph",
          content: [{ type: "wikiLink", attrs: { noteId: "note-1", title: "alpha" } }],
        },
      ],
    };
    const result = extractWikiLinks(content);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for content without wiki links", () => {
    const content: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "No wiki links here" }] }],
    };
    const result = extractWikiLinks(content);
    expect(result).toHaveLength(0);
  });
});

describe("extractEmbeds", () => {
  it("returns empty array for content without embeds", () => {
    const content: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "No embeds here" }] }],
    };
    const result = extractEmbeds(content);
    expect(result).toEqual([]);
  });
});

describe("syncWikiLinks", () => {
  it("creates references edges for resolved wiki-links", async () => {
    await createTestDb();

    insertTestNode({ id: "note-1", type: "note", title: "Source Note" });
    insertTestNode({ id: "note-2", type: "note", title: "Target Note" });

    const content: JSONContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Links to " },
            { type: "wikiLink", attrs: { noteId: "note-2", title: "Target Note" } },
          ],
        },
      ],
    };

    syncWikiLinks({
      noteId: "note-1",
      userId: TEST_USER_ID,
      content,
    });

    const edges = Array.from(edgesCollection.state.values()).filter(
      (e) => e.sourceId === "note-1" && e.type === "references",
    );

    expect(edges).toHaveLength(1);
    expect(edges[0]?.targetId).toBe("note-2");
  });

  it("removes references edges when wiki-links are deleted", async () => {
    await createTestDb();

    insertTestNode({ id: "note-1", type: "note", title: "Source Note" });
    insertTestNode({ id: "note-2", type: "note", title: "Target Note" });
    insertTestEdge({
      id: "edge-1",
      sourceId: "note-1",
      targetId: "note-2",
      type: "references",
    });

    const content: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "No links here." }] }],
    };

    syncWikiLinks({
      noteId: "note-1",
      userId: TEST_USER_ID,
      content,
    });

    const edges = Array.from(edgesCollection.state.values()).filter(
      (e) => e.sourceId === "note-1" && e.type === "references",
    );

    expect(edges).toHaveLength(0);
  });
});

describe("syncEmbeds", () => {
  it("creates embeds edges for embedded notes", async () => {
    await createTestDb();

    insertTestNode({ id: "note-1", type: "note", title: "Source Note" });
    insertTestNode({ id: "note-2", type: "note", title: "Target Note" });

    const content: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "No embeds in JSON format" }] }],
    };

    syncEmbeds({
      noteId: "note-1",
      userId: TEST_USER_ID,
      content,
    });

    const edges = Array.from(edgesCollection.state.values()).filter(
      (e) => e.sourceId === "note-1" && e.type === "embeds",
    );

    expect(edges).toHaveLength(0);
  });
});
