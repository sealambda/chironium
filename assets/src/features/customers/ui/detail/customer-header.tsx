import { SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { Customer } from "../customer-card";

function getEmailUrl(email: string): string {
  return `mailto:${encodeURIComponent(email)}`;
}

function getWhatsAppUrl(phone: string): string {
  const cleanPhone = phone.replaceAll(/\D/g, "");
  return `https://wa.me/${cleanPhone}`;
}

function getInstagramUrl(instagram: string): string {
  const username = instagram.startsWith("@") ? instagram.slice(1) : instagram;
  return `https://www.instagram.com/${username}`;
}

const statusConfig = {
  "up-to-date": {
    label: "Up to date",
    variant: "default" as const,
  },
  "needs-attention": {
    label: "Needs attention",
    variant: "secondary" as const,
  },
  overdue: {
    label: "Overdue",
    variant: "destructive" as const,
  },
};

interface CustomerHeaderProps {
  customer: Customer;
}

/**
 * Customer header displaying avatar, name, status, and contact actions.
 */
export function CustomerHeader({ customer }: Readonly<CustomerHeaderProps>) {
  const { email, phone, instagram } = customer.contact;
  const status = statusConfig[customer.status];

  return (
    <header className="flex flex-col gap-4">
      {/* Back button and title row */}
      <div className="flex items-center gap-3">
        <Link to="/customers">
          <Button variant="ghost" size="icon" className="size-9">
            <ArrowLeft className="size-5" />
            <span className="sr-only">Back to customers</span>
          </Button>
        </Link>
        <h1 className="font-bold text-xl text-foreground">Customer Details</h1>
      </div>

      {/* Customer info card */}
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        {/* Avatar */}
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
            {customer.initials}
          </AvatarFallback>
        </Avatar>

        {/* Name and status */}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-lg text-foreground">
            {customer.name}
          </h2>
          <Badge variant={status.variant} className="mt-1">
            {status.label}
          </Badge>
        </div>

        {/* Contact actions */}
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={!email}
            onClick={() => email && window.open(getEmailUrl(email), "_blank")}
            aria-label={`Email ${customer.name}`}
          >
            <Mail className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 text-muted-foreground hover:text-emerald-500 disabled:opacity-30"
            disabled={!phone}
            onClick={() =>
              phone && window.open(getWhatsAppUrl(phone), "_blank")
            }
            aria-label={`WhatsApp ${customer.name}`}
          >
            <SiWhatsapp size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 text-muted-foreground hover:text-pink-500 disabled:opacity-30"
            disabled={!instagram}
            onClick={() =>
              instagram && window.open(getInstagramUrl(instagram), "_blank")
            }
            aria-label={`Instagram ${customer.name}`}
          >
            <SiInstagram size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
}
