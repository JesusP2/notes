// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { EdgeTypeSelect } from "./edge-type-select";

describe("EdgeTypeSelect", () => {
  it("calls onValueChange when a new edge type is selected", () => {
    const handleChange = vi.fn();

    render(
      <EdgeTypeSelect
        value="references"
        onValueChange={handleChange}
        open
        onOpenChange={() => undefined}
      />,
    );

    const option = screen.getByText("supports");
    fireEvent.pointerDown(option);
    fireEvent.pointerUp(option);
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith("supports");
  });
});
