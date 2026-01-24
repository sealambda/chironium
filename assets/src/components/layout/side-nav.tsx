import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Users } from 'lucide-react';

import { AppName } from '@/components/ui/app-name';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    disabled: true, // Dashboard is disabled for now.
  },
  {
    to: '/customers',
    label: 'Customers',
    icon: Users,
    disabled: false,
  },
];

/**
 * Side navigation for tablet and desktop layouts.
 * Follows Material Design 3 navigation rail/drawer patterns:
 * - Medium (600-839px): Navigation rail (72px wide, icons only).
 * - Expanded+ (840px+): Navigation drawer (256px wide, icons + labels).
 *
 * Touch targets meet Apple HIG minimum of 44x44pt.
 * Hidden on mobile (compact) - uses BottomNav instead.
 */
export function SideNav() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <aside
      className={[
        // Hidden on mobile, visible on tablet+.
        'hidden md:flex',
        // Fixed position on left edge.
        'fixed inset-y-0 left-0 z-40',
        // Width changes by breakpoint: 72px (rail) on tablet, 256px (drawer) on desktop.
        'w-18 lg:w-[256px]',
        // Styling.
        'flex-col border-r border-border/40 bg-card',
        // Safe area inset for landscape notched devices.
        'pl-safe pt-safe pb-safe',
      ].join(' ')}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo/brand area. */}
      <div
        className={[
          'flex h-16 items-center',
          // Center on rail, left-align on drawer.
          'justify-center lg:justify-start lg:px-6',
          'border-b border-border/40',
        ].join(' ')}
      >
        {/* Rail: Icon only. */}
        <span className="text-xl font-bold text-primary lg:hidden">C</span>
        {/* Drawer: Full logo text. */}
        <AppName className="hidden text-xl text-foreground lg:block" />
      </div>

      {/* Navigation items. */}
      <nav className="flex flex-1 flex-col gap-1 p-2 lg:p-4">
        {navItems.map((item) => {
          const isActive = currentPath.startsWith(item.to);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <div
                key={item.to}
                className={[
                  // Touch target: minimum 44px.
                  'flex h-12 min-h-11 items-center gap-3 rounded-lg px-3',
                  // Rail: center icon.
                  'justify-center lg:justify-start',
                  // Disabled styling.
                  'opacity-40 cursor-not-allowed',
                ].join(' ')}
                aria-label={`${item.label} (disabled)`}
                aria-disabled="true"
              >
                <Icon className="h-6 w-6 shrink-0 text-muted-foreground" />
                {/* Label visible only on drawer. */}
                <span className="hidden text-sm font-medium text-muted-foreground lg:block">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                // Touch target: minimum 44px.
                'flex h-12 min-h-11 items-center gap-3 rounded-lg px-3',
                // Rail: center icon.
                'justify-center lg:justify-start',
                // Transitions and focus.
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                // Active/inactive states.
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'h-6 w-6 shrink-0 transition-transform duration-200',
                  isActive && 'scale-110'
                )}
              />
              {/* Label visible only on drawer. */}
              <span
                className={cn(
                  'hidden text-sm transition-all lg:block',
                  isActive ? 'font-semibold' : 'font-medium'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
