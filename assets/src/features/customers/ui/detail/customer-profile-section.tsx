import { SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Globe, Mail } from "lucide-react";
import { useMemo } from "react";

import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  formatInstagramDisplay,
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "@/shared/utils/contact-utils";
import { analyzePhoneNumber, formatPhoneDisplay, getCountryFlag } from "@/shared/utils/phone-utils";

import type { Customer } from "../customer-card";

/**
 * Mobile customer profile section with centered avatar and contact links.
 */
export function CustomerProfileSection({ customer }: Readonly<{ customer: Customer }>) {
  const { email, phone, instagram } = customer.contact;

  const phoneAnalysis = useMemo(() => (phone ? analyzePhoneNumber(phone) : null), [phone]);
  const formattedPhone = phone ? formatPhoneDisplay(phone) : null;
  const FlagComponent = useMemo(
    () => getCountryFlag(phoneAnalysis?.country),
    [phoneAnalysis?.country],
  );

  const instagramHandle = instagram ? formatInstagramDisplay(instagram) : null;

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Avatar className="size-24">
        <AvatarFallback className="bg-primary font-semibold text-2xl text-primary-foreground">
          {customer.initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-center gap-1">
        <h1 className="font-semibold text-foreground text-xl">{customer.name}</h1>

        {email ? (
          <a
            href={getEmailUrl(email)}
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <Mail className="size-4" />
            <span>{email}</span>
          </a>
        ) : null}

        {phone && formattedPhone ? (
          <a
            href={getWhatsAppUrl(phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-emerald-500"
          >
            <SiWhatsapp size={14} />
            <span>{formattedPhone}</span>
            {FlagComponent ? (
              <FlagComponent
                className="h-3 w-4.5 overflow-hidden rounded-sm"
                aria-label={`Flag of ${phoneAnalysis?.country}`}
              />
            ) : (
              <Globe className="size-4 text-muted-foreground/50" />
            )}
          </a>
        ) : null}

        {instagram && instagramHandle ? (
          <a
            href={getInstagramUrl(instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-pink-500"
          >
            <SiInstagram size={14} />
            <span>{instagramHandle}</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
