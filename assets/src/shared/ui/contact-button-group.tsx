import {
  SiGmail,
  SiInstagram,
  SiWhatsapp,
} from "@icons-pack/react-simple-icons";
import { Button } from "@/shared/ui/button";
import { getEmailUrl, getInstagramUrl, getWhatsAppUrl } from "@/shared/utils";

interface ContactButtonGroupProps {
  email?: string;
  phone?: string;
  instagram?: string;
  /** Customer name for aria-labels */
  customerName: string;
  /** Whether clicks should stop propagation (for nested buttons) */
  stopPropagation?: boolean;
}

/**
 * Reusable group of contact action buttons (Email, WhatsApp, Instagram).
 */
export function ContactButtonGroup({
  email,
  phone,
  instagram,
  customerName,
  stopPropagation = false,
}: Readonly<ContactButtonGroupProps>) {
  const handleClick = (url: string) => (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    window.open(url, "_blank");
  };

  return (
    <div className="flex shrink-0 items-center">
      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground hover:text-red-500 disabled:opacity-30"
        disabled={!email}
        onClick={email ? handleClick(getEmailUrl(email)) : undefined}
        aria-label={`Email ${customerName}`}
      >
        <SiGmail size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground hover:text-emerald-500 disabled:opacity-30"
        disabled={!phone}
        onClick={phone ? handleClick(getWhatsAppUrl(phone)) : undefined}
        aria-label={`WhatsApp ${customerName}`}
      >
        <SiWhatsapp size={20} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground hover:text-pink-500 disabled:opacity-30"
        disabled={!instagram}
        onClick={
          instagram ? handleClick(getInstagramUrl(instagram)) : undefined
        }
        aria-label={`Instagram ${customerName}`}
      >
        <SiInstagram size={20} />
      </Button>
    </div>
  );
}
