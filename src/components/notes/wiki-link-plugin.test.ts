// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { edgesCollection } from "@/lib/collections";
import { createTestDb, insertTestEdge, insertTestNode, TEST_USER_ID } from "@/test/helpers";
import {
  extractEmbeds,
  extractWikiLinksFromHtml,
  syncEmbeds,
  syncWikiLinks,
} from "./wiki-link-plugin";

describe("extractWikiLinksFromHtml", () => {
  it("extracts wiki links from HTML content", () => {
    const html = `
      <p>Check out <a data-wiki-link data-note-id="note-1" data-title="Alpha">Alpha</a></p>
      <p>And also <a data-wiki-link data-note-id="note-2" data-title="Beta">Beta</a></p>
    `;
    const result = extractWikiLinksFromHtml(html);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ noteId: "note-1", title: "Alpha" });
    expect(result[1]).toEqual({ noteId: "note-2", title: "Beta" });
  });

  it("deduplicates by title (case-insensitive)", () => {
    const html = `
      <p><a data-wiki-link data-note-id="note-1" data-title="Alpha">Alpha</a></p>
      <p><a data-wiki-link data-note-id="note-1" data-title="alpha">alpha</a></p>
    `;
    const result = extractWikiLinksFromHtml(html);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for content without wiki links", () => {
    const html = `<p>No wiki links here</p>`;
    const result = extractWikiLinksFromHtml(html);
    expect(result).toHaveLength(0);
  });
});

describe("extractEmbeds", () => {
  it("returns unique trimmed titles", () => {
    const result = extractEmbeds("Embed ![[ Alpha ]] and ![[Beta]] and ![[alpha]].");
    expect(result).toEqual(["Alpha", "Beta"]);
  });
});

describe("syncWikiLinks", () => {
  it("creates references edges for resolved wiki-links", async () => {
    await createTestDb();

    insertTestNode({ id: "note-1", type: "note", title: "Source Note" });
    insertTestNode({ id: "note-2", type: "note", title: "Target Note" });

    const html = `<p>Links to <a data-wiki-link data-note-id="note-2" data-title="Target Note">Target Note</a></p>`;

    syncWikiLinks({
      noteId: "note-1",
      userId: TEST_USER_ID,
      content: html,
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

    syncWikiLinks({
      noteId: "note-1",
      userId: TEST_USER_ID,
      content: "<p>No links here.</p>",
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

    syncEmbeds({
      noteId: "note-1",
      userId: TEST_USER_ID,
      content: "Embed ![[Target Note]].",
    });

    const edges = Array.from(edgesCollection.state.values()).filter(
      (e) => e.sourceId === "note-1" && e.type === "embeds",
    );

    expect(edges).toHaveLength(1);
    expect(edges[0]?.targetId).toBe("note-2");
  });
});
