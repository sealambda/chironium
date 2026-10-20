import { format, parseISO } from "date-fns";
import { Clock, MailCheck, ShieldAlert } from "lucide-react";

import type { InvitationLink } from "@/features/org/api/org-api";
import * as m from "@/paraglide/messages";
import type { OrganizationUserRole } from "@/shared/types/schema-enums";
import { CopyField, ShareLinkResult } from "@/shared/ui/share-link-result";
import { getDateLocale } from "@/shared/utils/date-locale";
import { isEmailEnabled } from "@/shared/utils/email-enabled";

interface InvitationLinkResultProps {
  link: InvitationLink;
  email: string;
  role: OrganizationUserRole;
  organizationName: string;
}

/** An invitation's link and code to share, with its expiry and delivery notes. */
export function InvitationLinkResult({
  link,
  email,
  role,
  organizationName,
}: Readonly<InvitationLinkResultProps>) {
  const shareText = m.settings_invite_link_share_text({ organization: organizationName });

  return (
    <div className="ph-no-capture flex flex-col gap-4">
      <ShareLinkResult
        url={link.url}
        label={m.settings_invite_link_label()}
        shareTitle={shareText}
        shareText={shareText}
        data-testid="invitation-link-input"
      >
        <li className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {m.settings_invite_link_expires({
              date: format(parseISO(link.expiresAt), "PPp", { locale: getDateLocale() }),
            })}
          </span>
        </li>
        {isEmailEnabled() ? (
          <li className="flex items-start gap-2">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span>{m.settings_invite_link_emailed({ email })}</span>
          </li>
        ) : null}
        {role === "POWER_USER" ? (
          <li className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{m.settings_invite_link_manager_note({ email })}</span>
          </li>
        ) : null}
      </ShareLinkResult>

      <CopyField
        value={link.code}
        label={m.settings_invite_code_label()}
        copiedMessage={m.settings_invite_code_copied()}
        copyErrorMessage={m.settings_invite_code_copy_error()}
        data-testid="invitation-code-value"
      />
    </div>
  );
}
