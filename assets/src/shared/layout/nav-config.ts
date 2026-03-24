import { CreditCard, Settings, Users } from "lucide-react";
import type { ComponentType } from "react";

import * as m from "@/paraglide/messages";

export interface NavItem {
  to: string;
  label: () => string;
  icon: ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  {
    to: "/customers",
    label: m.nav_customers,
    icon: Users,
  },
  {
    to: "/subscriptions",
    label: m.nav_subscriptions,
    icon: CreditCard,
  },
  {
    to: "/settings",
    label: m.nav_settings,
    icon: Settings,
  },
];
