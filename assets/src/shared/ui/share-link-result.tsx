import { Copy, Share2 } from "lucide-react";
import { type ReactNode, useId } from "react";
import { toast } from "sonner";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

interface CopyFieldProps {
  value: string;
  label: string;
  copiedMessage?: string;
  copyErrorMessage?: string;
  "data-testid"?: string;
}

/** A read-only value with a Copy button. The value never goes in the toast. */
export function CopyField({
  value,
  label,
  copiedMessage = m.share_link_copied(),
  copyErrorMessage = m.share_link_copy_error(),
  "data-testid": testId,
}: Readonly<CopyFieldProps>) {
  const inputId = useId();

  const copy = async () => {
    try {
      // `navigator.clipboard` is missing outside secure contexts, which throws here too.
      await navigator.clipboard.writeText(value);
      toast.success(copiedMessage);
    } catch {
      toast.error(copyErrorMessage);
    }
  };

  return (
    <Field>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="flex gap-2">
        <Input
          data-testid={testId}
          id={inputId}
          readOnly
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          onClick={copy}
          aria-label={`${m.share_link_copy()} ${label}`}
        >
          <Copy data-icon="inline-start" aria-hidden />
          {m.share_link_copy()}
        </Button>
      </div>
    </Field>
  );
}

interface ShareLinkResultProps {
  url: string;
  label: string;
  shareTitle: string;
  shareText: string;
  "data-testid"?: string;
  /** Notes shown under the link, as `<li>` items. */
  children?: ReactNode;
}

/**
 * A freshly issued link with copy and share actions. The link is a credential: it is
 * never logged or put in a toast, and `ph-no-capture` keeps it out of analytics.
 */
export function ShareLinkResult({
  url,
  label,
  shareTitle,
  shareText,
  "data-testid": testId,
  children,
}: Readonly<ShareLinkResultProps>) {
  const shareLink = async () => {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url });
    } catch (error) {
      // Closing the share sheet rejects with AbortError; that is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      toast.error(m.share_link_share_error());
    }
  };

  return (
    <div className="ph-no-capture flex flex-col gap-4">
      <CopyField value={url} label={label} data-testid={testId} />

      {canShare() ? (
        <Button type="button" onClick={shareLink} className="w-full lg:w-fit">
          <Share2 data-icon="inline-start" aria-hidden />
          {m.share_link_share()}
        </Button>
      ) : null}

      {children ? (
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">{children}</ul>
      ) : null}
    </div>
  );
}
