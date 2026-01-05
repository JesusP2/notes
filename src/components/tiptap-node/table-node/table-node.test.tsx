// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { tableExtensions } from "./index";

describe("Table Extensions", () => {
  it("exports table extensions array", () => {
    expect(tableExtensions).toBeInstanceOf(Array);
    expect(tableExtensions).toHaveLength(4);
  });

  it("includes Table extension", () => {
    const tableExt = tableExtensions.find((ext) => ext.name === "table");
    expect(tableExt).toBeDefined();
  });

  it("includes TableRow extension", () => {
    const tableRowExt = tableExtensions.find((ext) => ext.name === "tableRow");
    expect(tableRowExt).toBeDefined();
  });

  it("includes TableCell extension", () => {
    const tableCellExt = tableExtensions.find((ext) => ext.name === "tableCell");
    expect(tableCellExt).toBeDefined();
  });

  it("includes TableHeader extension", () => {
    const tableHeaderExt = tableExtensions.find((ext) => ext.name === "tableHeader");
    expect(tableHeaderExt).toBeDefined();
  });
});
