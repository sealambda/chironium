import { ClipboardList, CreditCard, Settings, Users } from "lucide-react";
import type { ComponentType } from "react";

import * as m from "@/paraglide/messages";

export interface NavItem {
  to: string;
  label: () => string;
  icon: ComponentType<{ className?: string }>;
  requiresOrgOwner?: boolean;
}

export const navItems: NavItem[] = [
  {
    to: "/customers",
    label: m.nav_customers,
    icon: Users,
  },
  {
    to: "/tasks",
    label: m.nav_tasks,
    icon: ClipboardList,
  },
  {
    to: "/subscriptions",
    label: m.nav_subscriptions,
    icon: CreditCard,
    requiresOrgOwner: true,
  },
  {
    to: "/settings",
    label: m.nav_settings,
    icon: Settings,
    requiresOrgOwner: true,
  },
];
