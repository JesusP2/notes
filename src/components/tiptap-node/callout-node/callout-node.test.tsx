// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CalloutNodeComponent } from "./callout-node";
import type { NodeViewProps } from "@tiptap/react";

const createMockProps = (attrs: any = {}): NodeViewProps =>
  ({
    node: { attrs },
    updateAttributes: () => {},
    decorations: [],
    selected: false,
    deleteNode: () => {},
    view: {} as never,
    getPos: () => 0,
    extension: {} as never,
    editor: {} as never,
  }) as unknown as NodeViewProps;

describe("CalloutNodeComponent - minimal", () => {
  it("renders basic component", () => {
    const mockProps = createMockProps({ type: "info" });
    const { container } = render(<CalloutNodeComponent {...mockProps} />);
    expect(container).not.toBeNull();
    expect(container.querySelector('[data-callout-type="info"]')).not.toBeNull();
  });

  it("renders warning type", () => {
    const mockProps = createMockProps({ type: "warning" });
    const { container } = render(<CalloutNodeComponent {...mockProps} />);
    expect(container.querySelector('[data-callout-type="warning"]')).not.toBeNull();
  });

  it("renders tip type", () => {
    const mockProps = createMockProps({ type: "tip" });
    const { container } = render(<CalloutNodeComponent {...mockProps} />);
    expect(container.querySelector('[data-callout-type="tip"]')).not.toBeNull();
  });

  it("renders danger type", () => {
    const mockProps = createMockProps({ type: "danger" });
    const { container } = render(<CalloutNodeComponent {...mockProps} />);
    expect(container.querySelector('[data-callout-type="danger"]')).not.toBeNull();
  });
});
