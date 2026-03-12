import type { ReactNode } from "react";

import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { cn } from "@/shared/utils/utils";

interface CardFooterProps {
  readonly children: ReactNode;
  readonly className?: string;
}

function CardFooter({ children, className }: Readonly<CardFooterProps>) {
  return <div className={cn("mt-4 border-t pt-3", className)}>{children}</div>;
}

interface CardHistoryLinkFooterProps {
  readonly customerId: string;
  readonly to: string;
  readonly label: string;
  readonly className?: string;
}

function CardHistoryLinkFooter({
  customerId,
  to,
  label,
  className,
}: Readonly<CardHistoryLinkFooterProps>) {
  return (
    <CardFooter className={className}>
      <Link
        to={to}
        params={{ customerId }}
        className="flex items-center gap-1.5 text-foreground/70 text-sm transition-colors hover:text-foreground"
      >
        <span>{label}</span>
        <ChevronRight className="size-4" />
      </Link>
    </CardFooter>
  );
}

export { CardFooter, CardHistoryLinkFooter };
