import { LayoutDashboard, Users } from "lucide-react";
import type { ComponentType } from "react";
import * as m from "@/paraglide/messages";

export interface NavItem {
  to: string;
  label: () => string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: m.nav_dashboard,
    icon: LayoutDashboard,
    disabled: true,
  },
  {
    to: "/customers",
    label: m.nav_customers,
    icon: Users,
    disabled: false,
  },
];
