import { describe, expect, it } from "vitest";
import { edgesCollection } from "@/lib/collections";
import { createTestDb, insertTestEdge, insertTestNode, TEST_USER_ID } from "@/test/helpers";
import {
  extractEmbeds,
  extractWikiLinks,
  renderWikiLinks,
  syncEmbeds,
  syncWikiLinks,
} from "./wiki-link-plugin";

describe("extractWikiLinks", () => {
  it("returns unique trimmed titles", () => {
    const result = extractWikiLinks("See [[ Alpha ]] and [[Beta]] and [[alpha]].");
    expect(result).toEqual(["Alpha", "Beta"]);
  });

  it("ignores embed syntax", () => {
    const result = extractWikiLinks("Embed ![[Alpha]] and link [[Beta]].");
    expect(result).toEqual(["Beta"]);
  });
});

describe("extractEmbeds", () => {
  it("returns unique trimmed titles", () => {
    const result = extractEmbeds("Embed ![[ Alpha ]] and ![[Beta]] and ![[alpha]].");
    expect(result).toEqual(["Alpha", "Beta"]);
  });
});

describe("renderWikiLinks", () => {
  it("renders resolved and unresolved wiki-links with markers", () => {
    const result = renderWikiLinks("Check [[Alpha]] and [[Beta]].", {
      alpha: "note-1",
    });

    expect(result).toContain('href="/notes/note-1"');
    expect(result).toContain("wiki-link-unresolved");
  });

  it("leaves embed syntax untouched", () => {
    const result = renderWikiLinks("Embed ![[Alpha]] and link [[Beta]].", {
      alpha: "note-1",
      beta: "note-2",
    });

    expect(result).toContain("![[Alpha]]");
    expect(result).toContain('href="/notes/note-2"');
  });
});

describe("syncWikiLinks", () => {
  it("creates references edges for resolved wiki-links", async () => {
    await createTestDb();

    insertTestNode({ id: "note-1", type: "note", title: "Source Note" });
    insertTestNode({ id: "note-2", type: "note", title: "Target Note" });

    await syncWikiLinks({
      noteId: "note-1",
      userId: TEST_USER_ID,
      content: "Links to [[Target Note]].",
    });

    const edges = Array.from(edgesCollection.state.values()).filter(
      (e) => e.sourceId === "note-1" && e.type === "references",
    );

    expect(edges).toHaveLength(1);
    expect(edges[0]?.targetId).toBe("note-2");
  });

  it("removes references edges for deleted wiki-links", async () => {
    await createTestDb();

    insertTestNode({ id: "note-1", type: "note", title: "Source Note" });
    insertTestNode({ id: "note-2", type: "note", title: "Target Note" });
    insertTestEdge({
      id: "edge-1",
      sourceId: "note-1",
      targetId: "note-2",
      type: "references",
    });

    await syncWikiLinks({ noteId: "note-1", userId: TEST_USER_ID, content: "No links here." });

    const edges = Array.from(edgesCollection.state.values()).filter(
      (e) => e.sourceId === "note-1" && e.type === "references",
    );

    expect(edges).toHaveLength(0);
  });

  it("does not create reference edges for embeds", async () => {
    await createTestDb();

    insertTestNode({ id: "note-1", type: "note", title: "Source Note" });
    insertTestNode({ id: "note-2", type: "note", title: "Target Note" });

    await syncWikiLinks({
      noteId: "note-1",
      userId: TEST_USER_ID,
      content: "Embed ![[Target Note]].",
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

    await syncEmbeds({
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
