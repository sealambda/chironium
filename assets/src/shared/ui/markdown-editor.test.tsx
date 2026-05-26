import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarkdownEditor } from "./markdown-editor";

describe("MarkdownEditor", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders controlled markdown values with the shared TipTap schema", async () => {
    const { container, rerender } = render(
      <MarkdownEditor value={"## Visit note\n\n- First item\n- Second item"} onChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: "Visit note" })).toBeInTheDocument();
    });
    expect(container.querySelectorAll("li")).toHaveLength(2);

    rerender(<MarkdownEditor value={"Updated body"} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Updated body")).toBeInTheDocument();
    });
  });

  it("disables formatting actions when disabled", () => {
    render(<MarkdownEditor value="Body" onChange={vi.fn()} disabled />);

    expect(screen.getByRole("button", { name: "Bold" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Italic" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Heading" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bullet list" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Numbered list" })).toBeDisabled();
  });

  it("updates editor accessibility attributes without recreating the editor", async () => {
    const { container, rerender } = render(
      <MarkdownEditor value="Body" onChange={vi.fn()} ariaLabelledBy="body-label" />,
    );

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror")).toHaveAttribute(
        "aria-labelledby",
        "body-label",
      );
    });

    rerender(<MarkdownEditor value="Body" onChange={vi.fn()} ariaLabelledBy="updated-label" />);

    await waitFor(() => {
      expect(container.querySelector(".ProseMirror")).toHaveAttribute(
        "aria-labelledby",
        "updated-label",
      );
    });
  });
});
