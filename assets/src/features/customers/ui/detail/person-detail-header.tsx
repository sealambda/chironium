import { Pencil } from "lucide-react";
import { useState } from "react";

import type { Person } from "@/features/customers/api/persons-api";
import { EditPersonDialog } from "@/features/customers/ui/detail/edit-person-dialog";
import * as m from "@/paraglide/messages";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { BackButton } from "@/shared/ui/back-button";
import { Button } from "@/shared/ui/button";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { getInitials } from "@/shared/utils/name-utils";
import { formatPersonName } from "@/shared/utils/person-utils";

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
          <ContactButtonGroup
            email={email ?? undefined}
            phone={phone ?? undefined}
            instagram={instagram ?? undefined}
            personName={name ?? ""}
            className="gap-2"
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
