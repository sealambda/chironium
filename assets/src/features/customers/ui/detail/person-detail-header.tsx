import { SiGmail, SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Pencil, Phone } from "lucide-react";
import { useState } from "react";

import type { Person } from "@/features/customers/api/persons-api";
import { EditPersonDialog } from "@/features/customers/ui/detail/edit-person-dialog";
import * as m from "@/paraglide/messages";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { BackButton } from "@/shared/ui/back-button";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  extractContactInfo,
  formatInstagramDisplay,
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "@/shared/utils/contact-utils";
import { getInitials } from "@/shared/utils/name-utils";
import { formatPersonName } from "@/shared/utils/person-utils";
import { formatPhoneDisplay } from "@/shared/utils/phone-utils";

// ─── Sub-components ──────────────────────────────────────────────────

interface ContactDropdownProps {
  readonly email?: string;
  readonly phone?: string;
  readonly instagram?: string;
}

function ContactDropdown({ email, phone, instagram }: ContactDropdownProps) {
  // Use noopener,noreferrer to prevent tabnabbing on the opened external page.
  const openUrl = (url: string) => () => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label={m.person_header_contact()}
          />
        }
      >
        <Phone className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {email ? (
          <DropdownMenuItem onClick={openUrl(getEmailUrl(email))}>
            <SiGmail size={16} className="shrink-0 text-red-500" />
            <span className="truncate">{email}</span>
          </DropdownMenuItem>
        ) : null}
        {phone ? (
          <DropdownMenuItem onClick={openUrl(getWhatsAppUrl(phone))}>
            <SiWhatsapp size={16} className="shrink-0 text-emerald-500" />
            <span className="truncate">{formatPhoneDisplay(phone)}</span>
          </DropdownMenuItem>
        ) : null}
        {instagram ? (
          <DropdownMenuItem onClick={openUrl(getInstagramUrl(instagram))}>
            <SiInstagram size={16} className="shrink-0 text-pink-500" />
            <span className="truncate">{formatInstagramDisplay(instagram)}</span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PersonDetailHeaderProps {
  readonly person?: Person | null;
  readonly personId?: string;
}

/** Top-nav header for the patient detail page: back button, avatar + name + edit, contact dropdown. */
export function PersonDetailHeader({ person, personId }: PersonDetailHeaderProps) {
  const [editPersonOpen, setEditPersonOpen] = useState(false);

  const name = person ? formatPersonName(person.name) : null;
  const initials = name ? getInitials(name) : "?";
  const { email, phone, instagram } = extractContactInfo(person?.telecom);
  const hasContact = Boolean(email ?? phone ?? instagram);

  return (
    <div className="flex w-full items-center gap-3">
      <BackButton />

      {name ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar size="sm" className="shrink-0">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="truncate font-semibold text-foreground text-sm">{name}</span>
          {person && personId ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground"
              aria-label={m.person_header_edit_profile()}
              onClick={() => setEditPersonOpen(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {hasContact ? (
          <ContactDropdown
            email={email ?? undefined}
            phone={phone ?? undefined}
            instagram={instagram ?? undefined}
          />
        ) : null}

        {person && personId ? (
          <EditPersonDialog
            person={person}
            open={editPersonOpen}
            onOpenChange={setEditPersonOpen}
          />
        ) : null}
      </div>
    </div>
  );
}
