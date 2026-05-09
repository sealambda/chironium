import { differenceInYears, parseISO } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { Mars, Venus } from "lucide-react";
import { useState } from "react";

import type { Person } from "@/features/customers/api/persons-api";
import { DetailEditButton } from "@/features/customers/ui/detail/detail-edit-button";
import { EditPersonDialog } from "@/features/customers/ui/detail/edit-person-dialog";
import * as m from "@/paraglide/messages";
import { BackButton } from "@/shared/ui/back-button";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { formatPersonName } from "@/shared/utils/person-utils";
import { cn } from "@/shared/utils/utils";

interface PersonDetailHeaderProps {
  readonly person?: Person | null;
  readonly personId?: string;
}

function HeaderDemographics({
  birthDate,
  gender,
}: Readonly<{ birthDate?: string | null; gender?: string | null }>) {
  const age = birthDate ? differenceInYears(new Date(), parseISO(birthDate)) : null;
  const normalizedGender = gender?.toUpperCase();

  const genderLabel = (() => {
    if (normalizedGender === "MALE" || normalizedGender === "M") {
      return m.gender_male();
    }
    if (normalizedGender === "FEMALE" || normalizedGender === "F") {
      return m.gender_female();
    }
    if (normalizedGender === "OTHER") {
      return m.gender_other();
    }

    return null;
  })();

  let Icon: LucideIcon | undefined;
  let iconClass = "text-muted-foreground";
  if (normalizedGender === "MALE" || normalizedGender === "M") {
    Icon = Mars;
    iconClass = "text-sky-600 dark:text-sky-400";
  } else if (normalizedGender === "FEMALE" || normalizedGender === "F") {
    Icon = Venus;
    iconClass = "text-pink-600 dark:text-pink-400";
  }

  if (age === null && genderLabel === null) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-foreground/65 text-xs">
      {genderLabel === null ? null : (
        <span className="inline-flex items-center gap-1">
          {Icon ? <Icon className={cn("size-3.5", iconClass)} aria-hidden /> : null}
          {genderLabel}
        </span>
      )}
      {age === null ? null : <span>{m.person_age_years({ count: age })}</span>}
    </div>
  );
}

/** Top-nav header for the patient detail page: back button, avatar + name + edit, contact dropdown. */
export function PersonDetailHeader({ person, personId }: PersonDetailHeaderProps) {
  const [editPersonOpen, setEditPersonOpen] = useState(false);

  const name = person ? formatPersonName(person.name) : null;
  const { email, phone, instagram } = extractContactInfo(person?.telecom);
  const hasContact = Boolean(email ?? phone ?? instagram);

  return (
    <div className="flex w-full items-center gap-3">
      <BackButton />

      {name ? (
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold text-foreground">{name}</span>
            {person && personId ? (
              <DetailEditButton
                ariaLabel={m.person_header_edit_profile()}
                onClick={() => setEditPersonOpen(true)}
              />
            ) : null}
          </div>
          <HeaderDemographics birthDate={person?.birthDate} gender={person?.gender} />
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
