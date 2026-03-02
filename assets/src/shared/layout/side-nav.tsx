import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";

import * as m from "@/paraglide/messages";
import { useOrg } from "@/features/org/hooks/use-org";
import { OrgSelector } from "@/features/org/ui/org-selector";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent } from "@/shared/ui/sheet";
import { getUserInitials } from "@/shared/utils/name-utils";
import { cn } from "@/shared/utils/utils";

import { navItems } from "./nav-config";

type NavItem = (typeof navItems)[number];
type NavVariant = "desktop" | "mobile";

/**
 * Side navigation for tablet and desktop layouts.
 */
export function SideNav({
  onCreateOrgClick,
}: Readonly<{ onCreateOrgClick: () => void }>) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { selectedOrg, availableOrgs, selectOrg } = useOrg();
  const { user } = useCurrentUser();
  const initials = getUserInitials(user?.name, user?.email);

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
          <NavItemLink
            key={item.to}
            item={item}
            currentPath={currentPath}
            variant="desktop"
          />
        ))}
      </div>

      <div className="mt-auto border-border/40 border-t p-2 md:p-4">
        <ProfileLink
          currentPath={currentPath}
          initials={initials}
          name={user?.name}
          email={user?.email}
          picture={user?.picture}
          variant="desktop"
        />
      </div>

    </nav>
  );
}

/**
 * Mobile foldable sidebar opened by the top-left burger button.
 */
export function MobileSideNav({
  onCreateOrgClick,
}: Readonly<{ onCreateOrgClick: () => void }>) {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { selectedOrg, availableOrgs, selectOrg } = useOrg();
  const { user } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const initials = getUserInitials(user?.name, user?.email);

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
        <SheetContent
          side="left"
          className="w-[calc(100vw-3rem)] max-w-xs p-0 sm:hidden"
        >
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
              <ProfileLink
                currentPath={currentPath}
                initials={initials}
                name={user?.name}
                email={user?.email}
                picture={user?.picture}
                onClick={closeMenu}
                variant="mobile"
              />
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

function ProfileLink({
  currentPath,
  initials,
  name,
  email,
  picture,
  onClick,
  variant,
}: Readonly<{
  currentPath: string;
  initials: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  onClick?: () => void;
  variant: NavVariant;
}>) {
  const isDesktop = variant === "desktop";

  return (
    <Link
      to="/profile"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDesktop && "justify-center md:justify-start",
      )}
      aria-current={currentPath.startsWith("/profile") ? "page" : undefined}
    >
      <Avatar className="h-10 w-10 border border-border/60">
        <AvatarImage
          src={picture ?? undefined}
          alt={name || email || m.nav_profile()}
          referrerPolicy="no-referrer"
        />
        <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className={cn("min-w-0 flex-1", isDesktop && "hidden md:block")}>
        <p className="truncate font-semibold text-sm text-foreground">
          {name || m.nav_profile()}
        </p>
        <p className="truncate text-muted-foreground text-xs">{email || "-"}</p>
      </div>
    </Link>
  );
}
