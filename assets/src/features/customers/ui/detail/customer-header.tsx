import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { customerStatusConfig } from "../../model/status-config";
import type { Customer } from "../customer-card";

interface CustomerHeaderProps {
  customer: Customer;
}

/**
 * Customer header displaying avatar, name, status, and contact actions.
 */
export function CustomerHeader({ customer }: Readonly<CustomerHeaderProps>) {
  const status = customerStatusConfig[customer.status];

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
        <ContactButtonGroup
          {...customer.contact}
          customerName={customer.name}
        />
      </div>
    </header>
  );
}
