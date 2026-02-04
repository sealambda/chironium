import { LayoutDashboard, Users } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    disabled: true,
  },
  {
    to: "/customers",
    label: "Customers",
    icon: Users,
    disabled: false,
  },
];
