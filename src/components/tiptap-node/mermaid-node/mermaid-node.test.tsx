// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { MermaidNode } from "./mermaid-node-extension";

describe("MermaidNode Extension", () => {
  it("exports MermaidNode extension", () => {
    expect(MermaidNode).toBeDefined();
    expect(MermaidNode.name).toBe("mermaid");
  });
});
