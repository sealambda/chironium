import { format, parseISO } from "date-fns";
import { Clock, Copy, MailCheck, Share2 } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";

import type { QuestionnaireLink } from "@/features/questionnaires/api/questionnaire-requests-api";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { getDateLocale } from "@/shared/utils/date-locale";

interface QuestionnaireLinkResultProps {
  link: QuestionnaireLink;
  /** Set when the link replaced an earlier one, which no longer works. */
  replaced?: boolean;
}

function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * A freshly issued link with copy and share actions. The link is a credential: it is
 * never logged or put in a toast, and `ph-no-capture` keeps it out of analytics.
 */
export function QuestionnaireLinkResult({ link, replaced = false }: QuestionnaireLinkResultProps) {
  const inputId = useId();
  const title = link.questionnaireTitle || m.questionnaire_untitled();

  const copyLink = async () => {
    try {
      // `navigator.clipboard` is missing outside secure contexts, which throws here too.
      await navigator.clipboard.writeText(link.url);
      toast.success(m.questionnaire_link_copied());
    } catch {
      toast.error(m.questionnaire_link_copy_error());
    }
  };

  const shareLink = async () => {
    try {
      await navigator.share({
        title,
        text: m.questionnaire_link_share_text({ title }),
        url: link.url,
      });
    } catch (error) {
      // Closing the share sheet rejects with AbortError; that is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      toast.error(m.questionnaire_link_share_error());
    }
  };

  return (
    <div className="ph-no-capture flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor={inputId}>{m.questionnaire_link_label()}</FieldLabel>
        <div className="flex gap-2">
          <Input
            data-testid="questionnaire-link-input"
            id={inputId}
            readOnly
            value={link.url}
            onFocus={(event) => event.currentTarget.select()}
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={copyLink}>
            <Copy data-icon="inline-start" aria-hidden />
            {m.questionnaire_link_copy()}
          </Button>
        </div>
      </Field>

      {canShare() ? (
        <Button type="button" onClick={shareLink} className="w-full lg:w-fit">
          <Share2 data-icon="inline-start" aria-hidden />
          {m.questionnaire_link_share()}
        </Button>
      ) : null}

      <ul className="flex flex-col gap-2 text-muted-foreground text-sm">
        {link.emailSent ? (
          <li className="flex items-start gap-2">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span>{m.questionnaire_link_email_sent()}</span>
          </li>
        ) : null}
        {link.expiresAt ? (
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {m.questionnaire_link_expires({
                date: format(parseISO(link.expiresAt), "PPp", { locale: getDateLocale() }),
              })}
            </span>
          </li>
        ) : null}
        {replaced ? (
          <li className="flex items-start gap-2">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{m.questionnaire_link_replaced()}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
