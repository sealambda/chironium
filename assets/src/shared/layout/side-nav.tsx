import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import { OrgSelector } from "@/features/org/ui/org-selector";
import { usePendingTasks } from "@/features/tasks/hooks/use-pending-tasks";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { LanguageToggle } from "@/shared/ui/language-toggle";
import { Sheet, SheetContent } from "@/shared/ui/sheet";
import { cn } from "@/shared/utils/utils";

import { navItems } from "./nav-config";
import { NavUser } from "./nav-user";
import { ThemeSwitcher } from "./theme-switcher";

type NavItem = (typeof navItems)[number];
type NavVariant = "desktop" | "mobile";

function getVisibleNavItems(hasSelectedOrg: boolean) {
  if (!hasSelectedOrg) {
    return [];
  }
  return navItems;
}

/**
 * Side navigation for tablet and desktop layouts.
 */
export function SideNav({
  onCreateOrgClick,
  onJoinOrgClick,
}: Readonly<{ onCreateOrgClick: () => void; onJoinOrgClick: () => void }>) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { selectedOrg, availableOrgs, selectOrg } = useOrg();
  const pendingCount = usePendingTasks().data?.length ?? 0;

  const visibleNavItems = getVisibleNavItems(Boolean(selectedOrg));

  return (
    <nav
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden w-18 shrink-0 flex-col border-border/40 border-r bg-card sm:flex md:w-64",
        "pt-safe pb-safe pl-safe",
      )}
      aria-label={m.nav_main_navigation()}
    >
      <div className="px-2 pt-3 pb-2 md:px-4">
        <div className="pb-2">
          <OrgSelector
            selectedOrg={selectedOrg}
            availableOrgs={availableOrgs}
            onSelectOrg={selectOrg}
            onCreateClick={onCreateOrgClick}
            onJoinClick={onJoinOrgClick}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 pt-4 md:px-4">
        {visibleNavItems.map((item) => (
          <NavItemLink
            key={item.to}
            item={item}
            currentPath={currentPath}
            pendingCount={pendingCount}
            variant="desktop"
          />
        ))}
      </div>

      <div className="mt-auto border-border/40 border-t p-2 md:p-4">
        <SidebarPreferences variant="desktop" />
        <div className="mt-3 border-border/40 border-t pt-2 md:pt-3">
          <NavUser />
        </div>
      </div>
    </nav>
  );
}

/**
 * Mobile foldable sidebar opened by the top-left burger button.
 */
export function MobileSideNav({
  onCreateOrgClick,
  onJoinOrgClick,
}: Readonly<{ onCreateOrgClick: () => void; onJoinOrgClick: () => void }>) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { selectedOrg, availableOrgs, selectOrg } = useOrg();
  const pendingCount = usePendingTasks().data?.length ?? 0;
  const [isOpen, setIsOpen] = useState(false);

  const visibleNavItems = getVisibleNavItems(Boolean(selectedOrg));

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleSelectOrg = (orgId: string) => {
    selectOrg(orgId);
    closeMenu();
  };

  const handleCreateOrgClick = () => {
    closeMenu();
    onCreateOrgClick();
  };

  const handleJoinOrgClick = () => {
    closeMenu();
    onJoinOrgClick();
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={m.nav_open_menu()}
        onClick={() => setIsOpen(true)}
      >
        <Menu aria-hidden />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[calc(100vw-3rem)] max-w-xs p-0 sm:hidden">
          <div className="flex h-full min-h-svh flex-col pt-safe pb-safe">
            <div className="px-4 pt-4 pb-3">
              <p className="px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {m.nav_organization()}
              </p>
              <div className="pt-2">
                <OrgSelector
                  selectedOrg={selectedOrg}
                  availableOrgs={availableOrgs}
                  onSelectOrg={handleSelectOrg}
                  onCreateClick={handleCreateOrgClick}
                  onJoinClick={handleJoinOrgClick}
                  showNameOnMobile
                />
              </div>
            </div>

            <div className="border-border/40 border-t px-4 pt-5 pb-2">
              <p className="px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {m.nav_menu()}
              </p>
            </div>

            <div className="flex flex-1 flex-col gap-1 px-3 pt-0">
              {visibleNavItems.map((item) => (
                <NavItemLink
                  key={item.to}
                  item={item}
                  currentPath={currentPath}
                  pendingCount={pendingCount}
                  onClick={closeMenu}
                  variant="mobile"
                />
              ))}
            </div>

            <div className="mt-auto border-border/40 border-t p-3">
              <SidebarPreferences variant="mobile" />
              <div className="mt-4 border-border/40 border-t pt-3">
                <NavUser showLabelsOnMobile onAction={closeMenu} />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarPreferences({ variant }: Readonly<{ variant: NavVariant }>) {
  const isDesktop = variant === "desktop";

  return (
    <div className="flex flex-col gap-2">
      <p
        className={cn(
          "px-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide",
          isDesktop && "hidden md:block",
        )}
      >
        {m.nav_settings()}
      </p>
      <div className="flex flex-col gap-2">
        <LanguageToggle
          className={cn(
            "h-9 min-w-0",
            isDesktop && "justify-center gap-1 px-1 md:justify-between md:gap-2 md:px-3",
          )}
          triggerLabelClassName={isDesktop ? "hidden md:inline" : undefined}
        />
        <ThemeSwitcher
          className={cn(
            isDesktop &&
              "h-auto flex-col gap-1 bg-transparent p-0 md:h-9 md:flex-row md:bg-muted md:p-1",
          )}
          itemClassName={cn(
            isDesktop && "size-9 min-h-9 flex-none px-0 md:size-auto md:flex-1 md:px-3",
          )}
        />
      </div>
    </div>
  );
}

export function NavItemLink({
  item,
  currentPath,
  pendingCount,
  onClick,
  variant,
}: Readonly<{
  item: NavItem;
  currentPath: string;
  pendingCount: number;
  onClick?: () => void;
  variant: NavVariant;
}>) {
  const isActive = currentPath.startsWith(item.to);
  const Icon = item.icon;
  const isDesktop = variant === "desktop";
  const count = item.showsPendingCount ? pendingCount : 0;

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDesktop && "justify-center md:justify-start",
        isActive
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={count > 0 ? m.nav_pending_count({ count }) : undefined}
    >
      <span className="relative shrink-0">
        <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
        {count > 0 && isDesktop ? (
          // The collapsed sidebar has no room for the number.
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary md:hidden" />
        ) : null}
      </span>
      <span
        className={cn(
          "text-sm",
          isDesktop ? "hidden md:block" : "block",
          isActive ? "font-semibold" : "font-medium",
        )}
      >
        {item.label()}
      </span>
      {count > 0 ? (
        <span
          className={cn(
            "ml-auto rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground text-xs tabular-nums",
            isDesktop ? "hidden md:inline" : "inline",
          )}
          data-testid="nav-pending-count"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
