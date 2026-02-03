import { LayoutDashboard } from "lucide-react";

import { Empty } from "@/shared/ui/empty";

/**
 * Dashboard page placeholder.
 * Currently disabled in navigation.
 */
export function DashboardPage() {
  return (
    <Empty
      icon={<LayoutDashboard className="size-8 text-muted-foreground" />}
      title="Dashboard Coming Soon"
      description="The dashboard is currently under development. Check back later for analytics and insights."
      className="py-20"
    />
  );
}
