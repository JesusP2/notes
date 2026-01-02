import { describe, expect, it } from "vitest";
import { createTestDb } from "@/test/helpers";
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
    const db = await createTestDb();

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Source Note"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-2", "note", "Target Note"],
    );

    await syncWikiLinks({
      db,
      noteId: "note-1",
      userId: "local",
      content: "Links to [[Target Note]].",
    });

    const edges = await db.query<{ target_id: string }>(
      "SELECT target_id FROM edges WHERE source_id = $1 AND type = 'references'",
      ["note-1"],
    );

    expect(edges.rows).toHaveLength(1);
    expect(edges.rows[0]?.target_id).toBe("note-2");
  });

  it("removes references edges for deleted wiki-links", async () => {
    const db = await createTestDb();

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Source Note"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-2", "note", "Target Note"],
    );
    await db.query(
      "INSERT INTO edges (id, source_id, target_id, type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      ["edge-1", "note-1", "note-2", "references"],
    );

    await syncWikiLinks({ db, noteId: "note-1", userId: "local", content: "No links here." });

    const edges = await db.query(
      "SELECT id FROM edges WHERE source_id = $1 AND type = 'references'",
      ["note-1"],
    );

    expect(edges.rows).toHaveLength(0);
  });

  it("does not create reference edges for embeds", async () => {
    const db = await createTestDb();

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Source Note"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-2", "note", "Target Note"],
    );

    await syncWikiLinks({
      db,
      noteId: "note-1",
      userId: "local",
      content: "Embed ![[Target Note]].",
    });

    const edges = await db.query<{ target_id: string }>(
      "SELECT target_id FROM edges WHERE source_id = $1 AND type = 'references'",
      ["note-1"],
    );

    expect(edges.rows).toHaveLength(0);
  });
});

describe("syncEmbeds", () => {
  it("creates embeds edges for embedded notes", async () => {
    const db = await createTestDb();

    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-1", "note", "Source Note"],
    );
    await db.query(
      "INSERT INTO nodes (id, type, title, created_at, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ["note-2", "note", "Target Note"],
    );

    await syncEmbeds({
      db,
      noteId: "note-1",
      userId: "local",
      content: "Embed ![[Target Note]].",
    });

    const edges = await db.query<{ target_id: string }>(
      "SELECT target_id FROM edges WHERE source_id = $1 AND type = 'embeds'",
      ["note-1"],
    );

    expect(edges.rows).toHaveLength(1);
    expect(edges.rows[0]?.target_id).toBe("note-2");
  });
});
