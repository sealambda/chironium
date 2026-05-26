import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownContent } from "./markdown-content";

describe("MarkdownContent", () => {
  it("renders markdown with the shared TipTap schema", () => {
    const { container } = render(
      <MarkdownContent content={"## Visit note\n\n- First item\n- Second item\n\n**Important**"} />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Visit note" })).toBeInTheDocument();
    expect(screen.getByText("Important", { selector: "strong" })).toBeInTheDocument();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("preserves single-line breaks", () => {
    const { container } = render(<MarkdownContent content={"Line one\nLine two"} />);

    expect(container.querySelector("br")).toBeInTheDocument();
  });

  it("returns nothing for empty content", () => {
    const { container } = render(<MarkdownContent content={"   "} />);

    expect(container).toBeEmptyDOMElement();
  });
});
