import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import { OrgSelector } from "@/features/org/ui/org-selector";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent } from "@/shared/ui/sheet";
import { cn } from "@/shared/utils/utils";

import { navItems } from "./nav-config";
import { NavUser } from "./nav-user";

type NavItem = (typeof navItems)[number];
type NavVariant = "desktop" | "mobile";

/**
 * Side navigation for tablet and desktop layouts.
 */
export function SideNav({ onCreateOrgClick }: Readonly<{ onCreateOrgClick: () => void }>) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { selectedOrg, availableOrgs, selectOrg } = useOrg();

  return (
    <nav
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden w-18 shrink-0 flex-col border-border/40 border-r bg-card sm:flex md:w-64",
        "pt-safe pb-safe pl-safe",
      )}
      aria-label="Main navigation"
    >
      <div className="px-2 pt-3 pb-2 md:px-4">
        <div className="pb-2">
          <OrgSelector
            selectedOrg={selectedOrg}
            availableOrgs={availableOrgs}
            onSelectOrg={selectOrg}
            onCreateClick={onCreateOrgClick}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 pt-4 md:px-4">
        {navItems.map((item) => (
          <NavItemLink key={item.to} item={item} currentPath={currentPath} variant="desktop" />
        ))}
      </div>

      <div className="mt-auto border-border/40 border-t p-2 md:p-4">
        <NavUser />
      </div>
    </nav>
  );
}

/**
 * Mobile foldable sidebar opened by the top-left burger button.
 */
export function MobileSideNav({ onCreateOrgClick }: Readonly<{ onCreateOrgClick: () => void }>) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { selectedOrg, availableOrgs, selectOrg } = useOrg();
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="size-5" />
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
              {navItems.map((item) => (
                <NavItemLink
                  key={item.to}
                  item={item}
                  currentPath={currentPath}
                  onClick={closeMenu}
                  variant="mobile"
                />
              ))}
            </div>

            <div className="mt-auto border-border/40 border-t p-3">
              <NavUser showLabelsOnMobile onAction={closeMenu} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavItemLink({
  item,
  currentPath,
  onClick,
  variant,
}: Readonly<{
  item: NavItem;
  currentPath: string;
  onClick?: () => void;
  variant: NavVariant;
}>) {
  const isActive = currentPath.startsWith(item.to);
  const Icon = item.icon;
  const isDesktop = variant === "desktop";

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDesktop && "justify-center md:justify-start",
        isActive
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
      <span
        className={cn(
          "text-sm",
          isDesktop ? "hidden md:block" : "block",
          isActive ? "font-semibold" : "font-medium",
        )}
      >
        {item.label()}
      </span>
    </Link>
  );
}
