import { ClipboardList, CreditCard, Settings, Stethoscope, Users } from "lucide-react";
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
    to: "/practitioners",
    label: m.nav_practitioners,
    icon: Stethoscope,
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
  },
  {
    to: "/settings",
    label: m.nav_settings,
    icon: Settings,
  },
];
