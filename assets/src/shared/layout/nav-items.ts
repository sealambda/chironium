import { LayoutDashboard, Users } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

/**
 * Shared navigation items used by BottomNav and SideNav.
 * Single source of truth for navigation structure.
 */
export const navItems: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    disabled: true, // Dashboard is disabled for now.
  },
  {
    to: "/customers",
    label: "Customers",
    icon: Users,
    disabled: false,
  },
];
