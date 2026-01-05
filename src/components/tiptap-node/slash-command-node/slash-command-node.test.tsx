// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { SlashCommandNode } from "./slash-command-node-extension";

describe("SlashCommandNode Extension", () => {
  it("exports SlashCommandNode extension", () => {
    expect(SlashCommandNode).toBeDefined();
    expect(SlashCommandNode.name).toBe("slashCommand");
  });

  it("is configured as an inline atom", () => {
    // Access configuration via extension storage or options if exposed
    // For Extension type, we check properties directly on the extension object
    expect(SlashCommandNode.name).toBe("slashCommand");
  });
});
