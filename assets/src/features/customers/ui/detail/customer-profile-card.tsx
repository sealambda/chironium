import { SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import * as Flags from "country-flag-icons/react/3x2";
import type { CountryCode } from "libphonenumber-js";
import { Globe, Mail } from "lucide-react";
import { type FC, type SVGProps, useMemo } from "react";

import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  formatInstagramDisplay,
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "@/shared/utils/contact-utils";
import { analyzePhoneNumber, formatPhoneDisplay } from "@/shared/utils/phone-utils";

import type { Customer } from "../customer-card";

function getFlag(countryCode: CountryCode | undefined): FC<SVGProps<SVGSVGElement>> | undefined {
  if (!countryCode) {
    return undefined;
  }
  return (Flags as Record<string, FC<SVGProps<SVGSVGElement>>>)[countryCode];
}

interface CustomerProfileCardProps {
  customer: Customer;
}

/**
 * Desktop left-sidebar profile card.
 * Displays avatar, name, and contact buttons with icon + value.
 */
export function CustomerProfileCard({ customer }: Readonly<CustomerProfileCardProps>) {
  const { email, phone, instagram } = customer.contact;

  const phoneAnalysis = useMemo(() => (phone ? analyzePhoneNumber(phone) : null), [phone]);
  const formattedPhone = phone ? formatPhoneDisplay(phone) : null;
  const FlagComponent = useMemo(() => getFlag(phoneAnalysis?.country), [phoneAnalysis?.country]);
  const instagramHandle = instagram ? formatInstagramDisplay(instagram) : null;

  return (
    <div className="rounded-2xl p-6">
      <div className="flex flex-col items-center gap-3">
        <Avatar className="size-24">
          <AvatarFallback className="bg-primary font-semibold text-2xl text-primary-foreground">
            {customer.initials}
          </AvatarFallback>
        </Avatar>

        <h1 className="font-semibold text-foreground text-xl">{customer.name}</h1>

        <div className="flex justify-center gap-1.5">
          {email ? (
            <a
              href={getEmailUrl(email)}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-muted-foreground text-sm transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500"
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
              className="flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-muted-foreground text-sm transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500"
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
              className="flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-muted-foreground text-sm transition-colors hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-500"
            >
              <SiInstagram className="size-4 shrink-0" />
              <span>{instagramHandle}</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
