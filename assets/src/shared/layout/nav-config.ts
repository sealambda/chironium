import { Users } from "lucide-react";
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
];
