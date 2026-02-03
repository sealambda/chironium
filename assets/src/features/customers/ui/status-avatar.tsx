import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { cn } from "@/shared/utils";
import type { Customer, CustomerStatus } from "../model/customer-types";

interface StatusAvatarProps {
  customer: Customer;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
} as const;

const ringClasses: Record<CustomerStatus, string> = {
  "up-to-date": "ring-emerald-500",
  "needs-attention": "ring-orange-500",
  overdue: "ring-red-500",
} as const;

/**
 * Avatar component with colored status ring.
 * Ring color indicates customer status:
 * - Green: Up to date
 * - Orange: Needs attention
 * - Red: Overdue
 */
export function StatusAvatar({
  customer,
  size = "md",
  className,
}: StatusAvatarProps) {
  const ringColor = ringClasses[customer.status];

  return (
    <Avatar
      className={cn(
        sizeClasses[size],
        "ring-2 ring-offset-2 ring-offset-background",
        ringColor,
        className,
      )}
    >
      <AvatarFallback className="bg-muted font-medium text-foreground">
        {customer.initials}
      </AvatarFallback>
    </Avatar>
  );
}
