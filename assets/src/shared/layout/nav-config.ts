import { BellRing, ClipboardList, CreditCard, Settings, Users } from "lucide-react";
import type { ComponentType } from "react";

import * as m from "@/paraglide/messages";

export interface NavItem {
  to: string;
  label: () => string;
  icon: ComponentType<{ className?: string }>;
  /** Shows the number of pending items next to the label. */
  showsPendingCount?: boolean;
}

export const navItems: NavItem[] = [
  {
    to: "/customers",
    label: m.nav_customers,
    icon: Users,
  },
  {
    to: "/pending",
    label: m.nav_pending,
    icon: BellRing,
    showsPendingCount: true,
  },
  {
    to: "/questionnaires",
    label: m.nav_questionnaires,
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
