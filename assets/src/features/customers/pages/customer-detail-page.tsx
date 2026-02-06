import { SiInstagram, SiWhatsapp } from "@icons-pack/react-simple-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as Flags from "country-flag-icons/react/3x2";
import type { CountryCode } from "libphonenumber-js";
import { Globe, Mail } from "lucide-react";
import { type FC, type SVGProps, useMemo, useState } from "react";

import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/customers_.$customerId";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  formatInstagramDisplay,
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "@/shared/utils/contact-utils";
import { analyzePhoneNumber, formatPhoneDisplay } from "@/shared/utils/phone-utils";

import { fetchCustomerList } from "../api/customers-api";
import { useCustomerDetail } from "../hooks/use-customer-detail";
import type { Customer } from "../ui/customer-card";
import { CompactBodyMetricsCard } from "../ui/detail/compact-body-metrics-card";
import { CompactCycleCard } from "../ui/detail/compact-cycle-card";
import { CompactNutritionCard } from "../ui/detail/compact-nutrition-card";
import { CompactPathologiesCard } from "../ui/detail/compact-pathologies-card";
import { CompactSubscriptionCard } from "../ui/detail/compact-subscription-card";
import { CustomerDetailHeader } from "../ui/detail/customer-detail-header";
import { BodyMetricsDrawer } from "../ui/drawers/body-metrics-drawer";
import { CycleDrawer } from "../ui/drawers/cycle-drawer";
import { NutritionDrawer } from "../ui/drawers/nutrition-drawer";
import { PathologiesDrawer } from "../ui/drawers/pathologies-drawer";
import { SubscriptionDrawer } from "../ui/drawers/subscription-drawer";

function getFlag(countryCode: CountryCode | undefined): FC<SVGProps<SVGSVGElement>> | undefined {
  if (!countryCode) {
    return undefined;
  }
  return (Flags as Record<string, FC<SVGProps<SVGSVGElement>>>)[countryCode];
}

function CustomerProfileSection({ customer }: { customer: Customer }) {
  const { email, phone, instagram } = customer.contact;

  const phoneAnalysis = useMemo(() => (phone ? analyzePhoneNumber(phone) : null), [phone]);
  const formattedPhone = phone ? formatPhoneDisplay(phone) : null;
  const FlagComponent = useMemo(() => getFlag(phoneAnalysis?.country), [phoneAnalysis?.country]);

  const instagramHandle = instagram ? formatInstagramDisplay(instagram) : null;

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <Avatar className="size-24">
        <AvatarFallback className="bg-primary font-semibold text-2xl text-primary-foreground">
          {customer.initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col items-center gap-1">
        <h1 className="font-semibold text-foreground text-xl">{customer.name}</h1>

        {email ? (
          <a
            href={getEmailUrl(email)}
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            <Mail className="size-4" />
            <span>{email}</span>
          </a>
        ) : null}

        {phone && formattedPhone ? (
          <a
            href={getWhatsAppUrl(phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-emerald-500"
          >
            <SiWhatsapp size={14} />
            <span>{formattedPhone}</span>
            {FlagComponent ? (
              <FlagComponent
                className="h-3 w-4.5 overflow-hidden rounded-sm"
                aria-label={`Flag of ${phoneAnalysis?.country}`}
              />
            ) : (
              <Globe className="size-4 text-muted-foreground/50" />
            )}
          </a>
        ) : null}

        {instagram && instagramHandle ? (
          <a
            href={getInstagramUrl(instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-pink-500"
          >
            <SiInstagram size={14} />
            <span>{instagramHandle}</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

type DrawerType = "subscription" | "bodyMetrics" | "nutrition" | "cycle" | "pathologies" | null;

/**
 * Customer detail page showing compact metrics dashboard and history drawers.
 * Uses detail mode to hide standard navigation and show custom header.
 */
export function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  // Fetch customer basic info from the list (likely cached from customers page)
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "list", selectedOrg?.id],
    queryFn: () => fetchCustomerList(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  // Find the customer by ID
  const customer = customers.find((c) => c.id === customerId);

  // Fetch all detail data
  const {
    subscriptions,
    bodyMetrics,
    nutritionPlans,
    cycleHistory,
    pathologies,
    currentSubscription,
    latestBodyMetrics,
    activeNutritionPlan,
    lastCycle,
    activePathologies,
    hasCycleTracking,
    isLoading,
  } = useCustomerDetail(customerId);

  // Activate detail mode with minimal header (just back button).
  const headerContent = <CustomerDetailHeader />;
  useDetailModeEffect(headerContent, "customer-detail");

  // Loading state
  if (isLoading && !customer) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">{m.common_loading()}</div>
        </div>
      </div>
    );
  }

  // Customer not found
  if (!customer) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">{m.customer_not_found()}</div>
          <div className="text-muted-foreground text-sm">{m.customer_not_found_desc()}</div>
        </div>
        <Link to="/customers">
          <Button variant="outline">{m.customer_back()}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Customer Profile */}
      <CustomerProfileSection customer={customer} />

      {/* Featured: Subscription Progress */}
      <CompactSubscriptionCard
        subscription={currentSubscription}
        onClick={() => setActiveDrawer("subscription")}
        isLoading={subscriptions.isLoading}
      />

      {/* 2-column grid of compact stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <CompactBodyMetricsCard
          metrics={latestBodyMetrics}
          onClick={() => setActiveDrawer("bodyMetrics")}
          isLoading={bodyMetrics.isLoading}
        />
        <CompactNutritionCard
          plan={activeNutritionPlan}
          onClick={() => setActiveDrawer("nutrition")}
          isLoading={nutritionPlans.isLoading}
        />
        <CompactPathologiesCard
          pathologies={pathologies.data ?? []}
          activeCount={activePathologies.length}
          onClick={() => setActiveDrawer("pathologies")}
          isLoading={pathologies.isLoading}
        />
        {hasCycleTracking ? (
          <CompactCycleCard
            cycle={lastCycle}
            onClick={() => setActiveDrawer("cycle")}
            isLoading={cycleHistory.isLoading}
          />
        ) : null}
      </div>

      {/* History drawers - unchanged */}
      <SubscriptionDrawer
        isOpen={activeDrawer === "subscription"}
        onClose={() => setActiveDrawer(null)}
        data={subscriptions.data ?? []}
      />
      <BodyMetricsDrawer
        isOpen={activeDrawer === "bodyMetrics"}
        onClose={() => setActiveDrawer(null)}
        data={bodyMetrics.data ?? []}
      />
      <NutritionDrawer
        isOpen={activeDrawer === "nutrition"}
        onClose={() => setActiveDrawer(null)}
        data={nutritionPlans.data ?? []}
      />
      <CycleDrawer
        isOpen={activeDrawer === "cycle"}
        onClose={() => setActiveDrawer(null)}
        data={cycleHistory.data ?? []}
      />
      <PathologiesDrawer
        isOpen={activeDrawer === "pathologies"}
        onClose={() => setActiveDrawer(null)}
        data={pathologies.data ?? []}
      />
    </div>
  );
}
