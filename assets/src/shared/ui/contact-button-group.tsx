import { SiGmail, SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";

import { Button } from "@/shared/ui/button";
import {
  formatInstagramDisplay,
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "@/shared/utils/contact-utils";
import { formatPhoneDisplay } from "@/shared/utils/phone-utils";

import { cn } from "../utils/utils";

interface ContactButtonGroupProps {
  email?: string;
  phone?: string;
  instagram?: string;
  personName: string;
  stopPropagation?: boolean;
  className?: string;
}

/**
 * Reusable group of contact action buttons (Email, WhatsApp, Instagram).
 */
export function ContactButtonGroup({
  email,
  phone,
  instagram,
  personName,
  stopPropagation = false,
  className,
}: Readonly<ContactButtonGroupProps>) {
  const phoneDisplay = phone ? formatPhoneDisplay(phone) : undefined;
  const instagramDisplay = instagram ? formatInstagramDisplay(instagram) : undefined;

  const handleClick = (url: string) => (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.open(url, "_blank");
  };

  return (
    <div className={cn("flex shrink-0 items-center gap-5", className)}>
      <Button
        variant="ghost"
        size="icon"
        className="size-auto text-muted-foreground hover:text-red-500 disabled:opacity-30"
        disabled={!email}
        onClick={email ? handleClick(getEmailUrl(email)) : undefined}
        aria-label={`Email ${personName}`}
        title={email}
      >
        <SiGmail size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-auto text-muted-foreground hover:text-emerald-500 disabled:opacity-30"
        disabled={!phone}
        onClick={phone ? handleClick(getWhatsAppUrl(phone)) : undefined}
        aria-label={`WhatsApp ${personName}`}
        title={phoneDisplay}
      >
        <SiWhatsapp size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-auto text-muted-foreground hover:text-pink-500 disabled:opacity-30"
        disabled={!instagram}
        onClick={instagram ? handleClick(getInstagramUrl(instagram)) : undefined}
        aria-label={`Instagram ${personName}`}
        title={instagramDisplay}
      >
        <SiInstagram size={20} />
      </Button>
    </div>
  );
}
