// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { MathNode } from "./math-node-extension";

describe("MathNode Extension", () => {
  it("exports MathNode extension", () => {
    expect(MathNode).toBeDefined();
    expect(MathNode.name).toBe("math");
  });
});
