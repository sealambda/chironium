import { Bold, Heading2, Italic, List, ListOrdered } from "lucide-react";
import type { RefObject } from "react";

import { Button } from "@/shared/ui/button";

interface MarkdownToolbarProps {
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

type MarkdownAction = "bold" | "italic" | "heading" | "bullet" | "numbered";

interface InsertResult {
  replacement: string;
  cursorOffset: number;
}

function wrapInline(selected: string, wrapper: string, placeholder: string): InsertResult {
  const replacement = selected
    ? `${wrapper}${selected}${wrapper}`
    : `${wrapper}${placeholder}${wrapper}`;
  return { replacement, cursorOffset: selected ? replacement.length : wrapper.length };
}

function insertHeading(selected: string, atLineStart: boolean): InsertResult {
  const prefix = atLineStart ? "" : "\n";
  const replacement = `${prefix}## ${selected || "Heading"}`;
  return { replacement, cursorOffset: selected ? replacement.length : prefix.length + 3 };
}

function insertList(selected: string, atLineStart: boolean, numbered: boolean): InsertResult {
  const lines = (selected || "Item").split("\n");
  const formatted = numbered
    ? lines.map((line, i) => `${i + 1}. ${line}`).join("\n")
    : lines.map((line) => `- ${line}`).join("\n");
  const prefix = atLineStart ? "" : "\n";
  const replacement = `${prefix}${formatted}`;
  return { replacement, cursorOffset: replacement.length };
}

function insertMarkdown(
  textarea: HTMLTextAreaElement,
  value: string,
  action: MarkdownAction,
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);
  const atLineStart = before.endsWith("\n") || before === "";

  const handlers: Record<MarkdownAction, () => InsertResult> = {
    bold: () => wrapInline(selected, "**", "text"),
    italic: () => wrapInline(selected, "*", "text"),
    heading: () => insertHeading(selected, atLineStart),
    bullet: () => insertList(selected, atLineStart, false),
    numbered: () => insertList(selected, atLineStart, true),
  };

  const { replacement, cursorOffset } = handlers[action]();
  const newCursorPos = start + cursorOffset;

  // Restore focus and cursor position after React re-render.
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  });

  return before + replacement + after;
}

const ACTIONS: { action: MarkdownAction; icon: typeof Bold; label: string }[] = [
  { action: "bold", icon: Bold, label: "Bold" },
  { action: "italic", icon: Italic, label: "Italic" },
  { action: "heading", icon: Heading2, label: "Heading" },
  { action: "bullet", icon: List, label: "Bullet list" },
  { action: "numbered", icon: ListOrdered, label: "Numbered list" },
];

export function MarkdownToolbar({ textareaRef, value, onChange }: MarkdownToolbarProps) {
  const handleAction = (action: MarkdownAction) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const newValue = insertMarkdown(textarea, value, action);
    onChange(newValue);
  };

  return (
    <div className="flex gap-0.5 rounded-t-md border border-input border-b-0 bg-muted/30 px-1.5 py-1">
      {ACTIONS.map(({ action, icon: Icon, label }) => (
        <Button
          key={action}
          variant="ghost"
          size="icon-xs"
          onClick={() => handleAction(action)}
          aria-label={label}
          type="button"
          className="text-muted-foreground hover:text-foreground"
        >
          <Icon className="size-3.5" />
        </Button>
      ))}
    </div>
  );
}
