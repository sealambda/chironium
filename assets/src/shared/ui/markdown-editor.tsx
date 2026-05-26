import { EditorContent, useEditor } from "@tiptap/react";
import { Bold, Heading, Italic, List, ListOrdered } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils/utils";

import { createMarkdownExtensions } from "./markdown-kit";

interface MarkdownEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly ariaLabelledBy?: string;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly disabled?: boolean;
  readonly className?: string;
}

type Action = "bold" | "italic" | "heading" | "bullet" | "numbered";

const ACTIONS: { action: Action; icon: typeof Bold; label: string }[] = [
  { action: "bold", icon: Bold, label: "Bold" },
  { action: "italic", icon: Italic, label: "Italic" },
  { action: "heading", icon: Heading, label: "Heading" },
  { action: "bullet", icon: List, label: "Bullet list" },
  { action: "numbered", icon: ListOrdered, label: "Numbered list" },
];

function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/\n$/, "");
}

export function MarkdownEditor({
  value,
  onChange,
  ariaLabelledBy,
  placeholder,
  rows = 3,
  disabled = false,
  className,
}: MarkdownEditorProps) {
  const onChangeRef = useRef(onChange);
  const initialValueRef = useRef(value);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;

  const editorAttributes = useMemo<Record<string, string>>(() => {
    const attributes: Record<string, string> = {};

    if (ariaLabelledBy) {
      attributes["aria-labelledby"] = ariaLabelledBy;
    }

    return attributes;
  }, [ariaLabelledBy]);
  const extensions = useMemo(() => createMarkdownExtensions(), []);
  const editorProps = useMemo(
    () => ({
      attributes: editorAttributes,
    }),
    [editorAttributes],
  );

  const editor = useEditor({
    immediatelyRender: typeof window !== "undefined",
    editable: !disabled,
    content: initialValueRef.current,
    contentType: "markdown",
    editorProps,
    extensions,
    onUpdate: ({ editor: currentEditor }) => {
      const markdown = normalizeMarkdown(currentEditor.getMarkdown());
      if (markdown === valueRef.current) {
        return;
      }

      valueRef.current = markdown;
      onChangeRef.current(markdown);
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    valueRef.current = value;
    const current = normalizeMarkdown(editor.getMarkdown());
    if (current !== value) {
      editor.commands.setContent(value, { contentType: "markdown" });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }

    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const runAction = (action: Action) => {
    if (!editor || disabled) {
      return;
    }
    const chain = editor.chain().focus();
    if (action === "heading") {
      chain.toggleHeading({ level: 2 }).run();
      return;
    }
    if (action === "bullet") {
      chain.toggleBulletList().run();
      return;
    }
    if (action === "numbered") {
      chain.toggleOrderedList().run();
      return;
    }
    if (action === "bold") {
      chain.toggleBold().run();
      return;
    }
    chain.toggleItalic().run();
  };

  return (
    <div className={cn(className)}>
      <div className="flex gap-0.5 rounded-t-md border border-input border-b-0 bg-muted/30 px-1.5 py-1">
        {ACTIONS.map(({ action, icon: Icon, label }) => (
          <Button
            key={action}
            variant="ghost"
            size="icon-xs"
            onClick={() => runAction(action)}
            aria-label={label}
            type="button"
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon className="size-3.5" />
          </Button>
        ))}
      </div>
      <div
        className={cn(
          "relative rounded-b-md border border-input border-t-0 bg-background px-3 py-2 text-sm",
          disabled ? "cursor-not-allowed opacity-60" : "",
        )}
      >
        {placeholder && !value.trim() ? (
          <span className="pointer-events-none absolute top-2 left-3 text-muted-foreground">
            {placeholder}
          </span>
        ) : null}
        <EditorContent
          editor={editor}
          className="min-h-0 [&_.ProseMirror]:outline-none [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:text-base [&_.ProseMirror_li]:my-0.5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5"
          style={{ minHeight: `${rows * 1.5}rem` }}
        />
      </div>
    </div>
  );
}
