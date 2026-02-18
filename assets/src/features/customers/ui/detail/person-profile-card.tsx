import { SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Globe, Mail } from "lucide-react";
import { useMemo } from "react";

import type { SubscriptionWithPerson } from "@/features/customers/api/subscriptions-api";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  extractContactInfo,
  formatInstagramDisplay,
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "@/shared/utils/contact-utils";
import { getInitials } from "@/shared/utils/name-utils";
import { formatPersonName } from "@/shared/utils/person-utils";
import { analyzePhoneNumber, formatPhoneDisplay, getCountryFlag } from "@/shared/utils/phone-utils";

interface PersonProfileCardProps {
  item: SubscriptionWithPerson;
}

export function PersonProfileCard({ item }: Readonly<PersonProfileCardProps>) {
  const name = formatPersonName(item.subscriber.name);
  const initials = getInitials(name);
  const { email, phone, instagram } = extractContactInfo(item.subscriber.telecom);

  const phoneAnalysis = useMemo(() => (phone ? analyzePhoneNumber(phone) : null), [phone]);
  const formattedPhone = phone ? formatPhoneDisplay(phone) : null;
  const FlagComponent = useMemo(
    () => getCountryFlag(phoneAnalysis?.country),
    [phoneAnalysis?.country],
  );
  const instagramHandle = instagram ? formatInstagramDisplay(instagram) : null;

  return (
    <div className="flex flex-col items-center gap-3 py-4 lg:rounded-2xl lg:p-6 lg:py-0">
      <Avatar className="size-24">
        <AvatarFallback className="bg-primary font-semibold text-2xl text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      <h1 className="font-semibold text-foreground text-xl">{name}</h1>

      <div className="flex flex-col items-center gap-1 lg:flex-row lg:gap-1.5">
        {email ? (
          <a
            href={getEmailUrl(email)}
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground lg:whitespace-nowrap lg:rounded-lg lg:border lg:px-3 lg:py-2 lg:hover:border-red-500/50 lg:hover:bg-red-500/10 lg:hover:text-red-500"
          >
            <Mail className="size-4 shrink-0" />
            <span>{email}</span>
          </a>
        ) : null}

        {phone && formattedPhone ? (
          <a
            href={getWhatsAppUrl(phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-emerald-500 lg:whitespace-nowrap lg:rounded-lg lg:border lg:px-3 lg:py-2 lg:hover:border-emerald-500/50 lg:hover:bg-emerald-500/10 lg:hover:text-emerald-500"
          >
            <SiWhatsapp className="size-4 shrink-0" />
            <span>{formattedPhone}</span>
            {FlagComponent ? (
              <FlagComponent
                className="h-3 w-4.5 shrink-0 overflow-hidden rounded-sm"
                aria-label={`Flag of ${phoneAnalysis?.country}`}
              />
            ) : (
              <Globe className="size-4 shrink-0 text-muted-foreground/50" />
            )}
          </a>
        ) : null}

        {instagram && instagramHandle ? (
          <a
            href={getInstagramUrl(instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-pink-500 lg:whitespace-nowrap lg:rounded-lg lg:border lg:px-3 lg:py-2 lg:hover:border-pink-500/50 lg:hover:bg-pink-500/10 lg:hover:text-pink-500"
          >
            <SiInstagram className="size-4 shrink-0" />
            <span>{instagramHandle}</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
