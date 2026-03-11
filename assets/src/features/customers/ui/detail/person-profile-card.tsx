import type { Person } from "@/features/customers/api/persons-api";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { getInitials } from "@/shared/utils/name-utils";
import { formatPersonName } from "@/shared/utils/person-utils";

interface PersonProfileCardProps {
  person: Person;
}

export function PersonProfileCard({ person }: Readonly<PersonProfileCardProps>) {
  const name = formatPersonName(person.name);
  const initials = getInitials(name);
  const contact = extractContactInfo(person.telecom);

  return (
    <div className="flex flex-col items-center gap-3 py-4 lg:rounded-2xl lg:p-6 lg:py-0">
      <Avatar className="size-24">
        <AvatarFallback className="bg-primary font-semibold text-2xl text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      <h1 className="font-semibold text-foreground text-xl">{name}</h1>

      <div className="flex items-center justify-center">
        <ContactButtonGroup {...contact} personName={name} />
      </div>
    </div>
  );
}
