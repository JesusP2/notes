import { describe, expect, it } from "vitest";
import {
  SLASH_COMMANDS,
  filterCommands,
  getCommandsByCategory,
  CATEGORY_LABELS,
} from "./slash-commands";

describe("SLASH_COMMANDS", () => {
  it("has all required basic commands", () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    expect(ids).toContain("paragraph");
    expect(ids).toContain("heading1");
    expect(ids).toContain("heading2");
    expect(ids).toContain("heading3");
    expect(ids).toContain("bulletList");
    expect(ids).toContain("numberedList");
    expect(ids).toContain("taskList");
    expect(ids).toContain("quote");
    expect(ids).toContain("codeBlock");
    expect(ids).toContain("divider");
  });

  it("has all callout commands", () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    expect(ids).toContain("callout-info");
    expect(ids).toContain("callout-warning");
    expect(ids).toContain("callout-tip");
    expect(ids).toContain("callout-danger");
  });

  it("has advanced commands", () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    expect(ids).toContain("table");
    expect(ids).toContain("math-inline");
    expect(ids).toContain("math-block");
    expect(ids).toContain("mermaid");
  });

  it("all commands have required properties", () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.id).toBeTruthy();
      expect(cmd.label).toBeTruthy();
      expect(cmd.description).toBeTruthy();
      expect(cmd.icon).toBeTruthy();
      expect(cmd.category).toBeTruthy();
      expect(Array.isArray(cmd.keywords)).toBe(true);
      expect(typeof cmd.action).toBe("function");
    }
  });

  it("all commands have at least one keyword", () => {
    for (const cmd of SLASH_COMMANDS) {
      expect(cmd.keywords.length).toBeGreaterThan(0);
    }
  });
});

describe("CATEGORY_LABELS", () => {
  it("has labels for all categories", () => {
    expect(CATEGORY_LABELS.basic).toBe("Basic Blocks");
    expect(CATEGORY_LABELS.formatting).toBe("Formatting");
    expect(CATEGORY_LABELS.media).toBe("Media");
    expect(CATEGORY_LABELS.advanced).toBe("Advanced");
  });
});

describe("filterCommands", () => {
  it("returns all commands when query is empty", () => {
    const results = filterCommands("");
    expect(results).toEqual(SLASH_COMMANDS);
  });

  it("filters by label", () => {
    const results = filterCommands("heading");
    expect(results.some((c) => c.id === "heading1")).toBe(true);
    expect(results.some((c) => c.id === "heading2")).toBe(true);
    expect(results.some((c) => c.id === "heading3")).toBe(true);
  });

  it("filters by keyword", () => {
    const results = filterCommands("h1");
    expect(results.some((c) => c.id === "heading1")).toBe(true);
  });

  it("is case insensitive for label", () => {
    const results = filterCommands("HEADING");
    expect(results.some((c) => c.id === "heading1")).toBe(true);
  });

  it("is case insensitive for keywords", () => {
    const results = filterCommands("TODO");
    expect(results.some((c) => c.id === "taskList")).toBe(true);
  });

  it("returns empty for no matches", () => {
    const results = filterCommands("xyznotfound123");
    expect(results).toHaveLength(0);
  });

  it("filters callouts by keyword", () => {
    const results = filterCommands("callout");
    expect(results.length).toBeGreaterThanOrEqual(4);
    expect(results.every((c) => c.id.startsWith("callout-"))).toBe(true);
  });
});

describe("getCommandsByCategory", () => {
  it("groups commands by category", () => {
    const grouped = getCommandsByCategory();
    expect(grouped.basic).toBeDefined();
    expect(grouped.formatting).toBeDefined();
    expect(grouped.media).toBeDefined();
    expect(grouped.advanced).toBeDefined();
  });

  it("puts basic commands in basic category", () => {
    const grouped = getCommandsByCategory();
    const basicIds = grouped.basic.map((c) => c.id);
    expect(basicIds).toContain("paragraph");
    expect(basicIds).toContain("heading1");
  });

  it("puts callouts in formatting category", () => {
    const grouped = getCommandsByCategory();
    const formattingIds = grouped.formatting.map((c) => c.id);
    expect(formattingIds).toContain("callout-info");
    expect(formattingIds).toContain("callout-warning");
  });

  it("puts table and math in advanced category", () => {
    const grouped = getCommandsByCategory();
    const advancedIds = grouped.advanced.map((c) => c.id);
    expect(advancedIds).toContain("table");
    expect(advancedIds).toContain("math-inline");
    expect(advancedIds).toContain("mermaid");
  });

  it("total commands equals SLASH_COMMANDS length", () => {
    const grouped = getCommandsByCategory();
    const total =
      grouped.basic.length +
      grouped.formatting.length +
      grouped.media.length +
      grouped.advanced.length;
    expect(total).toBe(SLASH_COMMANDS.length);
  });
});
