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
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useDetailModeEffect } from "@/shared/layout/detail-context";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import {
  BarChartSkeleton,
  CircularChartSkeleton,
  LineChartSkeleton,
} from "@/shared/ui/chart-skeleton";
import { DataTable } from "@/shared/ui/data-table";
import {
  formatInstagramDisplay,
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "@/shared/utils/contact-utils";
import { analyzePhoneNumber, formatPhoneDisplay } from "@/shared/utils/phone-utils";

import { fetchCustomerList } from "../api/customers-api";
import { useCustomerDetail } from "../hooks/use-customer-detail";
import {
  renderBodyMetricsExpandedRow,
  renderCycleExpandedRow,
  useBodyMetricsColumns,
  useCycleColumns,
  useNutritionColumns,
  usePathologyColumns,
} from "../hooks/use-detail-columns";
import {
  useCancelSubscription,
  useCreateBodyMetrics,
  useCreateCycle,
  useCreateNutritionPlan,
  useCreatePathology,
  useCreateSubscription,
  usePauseSubscription,
} from "../hooks/use-detail-mutations";
import type { Customer } from "../ui/customer-card";
import { CompactBodyMetricsCard } from "../ui/detail/compact-body-metrics-card";
import { CompactCycleCard } from "../ui/detail/compact-cycle-card";
import { CompactNutritionCard } from "../ui/detail/compact-nutrition-card";
import { CompactPathologiesCard } from "../ui/detail/compact-pathologies-card";
import { CompactSubscriptionCard } from "../ui/detail/compact-subscription-card";
import { CustomerDetailHeader } from "../ui/detail/customer-detail-header";
import { CustomerProfileCard } from "../ui/detail/customer-profile-card";
import { DesktopSubscriptionCard } from "../ui/detail/desktop-subscription-card";
import { DetailSection } from "../ui/detail/detail-section";
import { BodyMetricsDrawer } from "../ui/drawers/body-metrics-drawer";
import { CycleDrawer } from "../ui/drawers/cycle-drawer";
import { NutritionDrawer } from "../ui/drawers/nutrition-drawer";
import { PathologiesDrawer } from "../ui/drawers/pathologies-drawer";
import { SubscriptionDrawer } from "../ui/drawers/subscription-drawer";
import { AddEntrySheet } from "../ui/forms/add-entry-sheet";
import { BodyMetricsForm } from "../ui/forms/body-metrics-form";
import { CycleForm } from "../ui/forms/cycle-form";
import { NutritionForm } from "../ui/forms/nutrition-form";
import { PathologyForm } from "../ui/forms/pathology-form";
import { SubscriptionForm } from "../ui/forms/subscription-form";

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
type SheetType = "subscription" | "bodyMetrics" | "nutrition" | "cycle" | "pathologies" | null;

const ENTRY_FORM_ID = "add-entry-form";

/**
 * Customer detail page showing compact metrics dashboard and history drawers.
 * Uses detail mode to hide standard navigation and show custom header.
 *
 * - SM/MD: Compact cards + bottom drawers with data tables
 * - LG/XL: Exposed data tables in DetailSection components with chart placeholders
 *
 * Both layouts share the same AddEntrySheet forms for creating new records.
 */
export function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const { selectedOrg } = useOrg();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

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

  // Column definitions (shared between drawers and desktop sections)
  const bodyMetricsColumns = useBodyMetricsColumns();
  const nutritionColumns = useNutritionColumns();
  const pathologyColumns = usePathologyColumns();
  const cycleColumns = useCycleColumns();

  // Mutations
  const createBodyMetrics = useCreateBodyMetrics(customerId);
  const createNutritionPlan = useCreateNutritionPlan(customerId);
  const createSubscription = useCreateSubscription(customerId);
  const createPathology = useCreatePathology(customerId);
  const createCycle = useCreateCycle(customerId);
  const pauseSubscription = usePauseSubscription(customerId);
  const cancelSubscription = useCancelSubscription(customerId);

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

  const emptyState = (
    <div className="py-8 text-center text-muted-foreground text-sm">{m.empty_no_data()}</div>
  );

  return (
    <div className="space-y-4 pt-4 lg:pt-6">
      {isDesktop ? (
        /* ── DESKTOP: Profile + Subscription top row, data sections below ── */
        <div className="space-y-6">
          <CustomerProfileCard customer={customer} />
          <DesktopSubscriptionCard
            subscription={currentSubscription}
            isLoading={subscriptions.isLoading}
            onAdd={() => setActiveSheet("subscription")}
            onPauseToggle={() => {
              if (currentSubscription) {
                pauseSubscription.mutate(currentSubscription.id);
              }
            }}
            onCancel={() => {
              if (currentSubscription) {
                cancelSubscription.mutate(currentSubscription.id);
              }
            }}
            isPauseToggling={pauseSubscription.isPending}
            isCancelling={cancelSubscription.isPending}
          />

          {/* Body Metrics + Nutrition (50/50) */}
          <div className="grid grid-cols-2 gap-6">
            <DetailSection
              title={m.section_body_metrics()}
              chartPlaceholder={<LineChartSkeleton />}
              onAdd={() => setActiveSheet("bodyMetrics")}
              addButtonLabel={m.sheet_add_body_metrics_title()}
              isLoading={bodyMetrics.isLoading}
              className="border-border/30 bg-blue-50/50"
              addButtonClassName="border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white"
            >
              <DataTable
                columns={bodyMetricsColumns}
                data={bodyMetrics.data ?? []}
                getRowId={(row) => row.id}
                renderExpandedRow={renderBodyMetricsExpandedRow}
                emptyState={emptyState}
              />
            </DetailSection>

            <DetailSection
              title={m.section_nutrition()}
              chartPlaceholder={<BarChartSkeleton />}
              onAdd={() => setActiveSheet("nutrition")}
              addButtonLabel={m.sheet_add_nutrition_title()}
              isLoading={nutritionPlans.isLoading}
              className="border-border/30 bg-emerald-50/50"
              addButtonClassName="border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white"
            >
              <DataTable
                columns={nutritionColumns}
                data={nutritionPlans.data ?? []}
                getRowId={(row) => row.id}
                emptyState={emptyState}
              />
            </DetailSection>
          </div>

          {/* Pathologies + Cycle (50/50) */}
          <div className="grid grid-cols-2 gap-6">
            <DetailSection
              title={m.section_pathologies()}
              chartPlaceholder={<CircularChartSkeleton />}
              onAdd={() => setActiveSheet("pathologies")}
              addButtonLabel={m.sheet_add_pathology_title()}
              isLoading={pathologies.isLoading}
              className="border-border/30 bg-amber-50/50"
              addButtonClassName="border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white"
            >
              <DataTable
                columns={pathologyColumns}
                data={pathologies.data ?? []}
                getRowId={(row) => row.id}
                emptyState={emptyState}
              />
            </DetailSection>

            {hasCycleTracking ? (
              <DetailSection
                title={m.section_cycle()}
                chartPlaceholder={<LineChartSkeleton />}
                onAdd={() => setActiveSheet("cycle")}
                addButtonLabel={m.sheet_add_cycle_title()}
                isLoading={cycleHistory.isLoading}
                className="border-border/30 bg-pink-50/50"
                addButtonClassName="border-pink-500 text-pink-600 hover:bg-pink-500 hover:text-white"
              >
                <DataTable
                  columns={cycleColumns}
                  data={cycleHistory.data ?? []}
                  getRowId={(row) => row.id}
                  renderExpandedRow={renderCycleExpandedRow}
                  emptyState={emptyState}
                />
              </DetailSection>
            ) : null}
          </div>
        </div>
      ) : (
        /* ── MOBILE: Centered profile + compact cards + bottom drawers ── */
        <>
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

          {/* History drawers with onAdd wired to open sheets */}
          <SubscriptionDrawer
            isOpen={activeDrawer === "subscription"}
            onClose={() => setActiveDrawer(null)}
            data={subscriptions.data ?? []}
            onAdd={() => setActiveSheet("subscription")}
          />
          <BodyMetricsDrawer
            isOpen={activeDrawer === "bodyMetrics"}
            onClose={() => setActiveDrawer(null)}
            data={bodyMetrics.data ?? []}
            onAdd={() => setActiveSheet("bodyMetrics")}
          />
          <NutritionDrawer
            isOpen={activeDrawer === "nutrition"}
            onClose={() => setActiveDrawer(null)}
            data={nutritionPlans.data ?? []}
            onAdd={() => setActiveSheet("nutrition")}
          />
          <CycleDrawer
            isOpen={activeDrawer === "cycle"}
            onClose={() => setActiveDrawer(null)}
            data={cycleHistory.data ?? []}
            onAdd={() => setActiveSheet("cycle")}
          />
          <PathologiesDrawer
            isOpen={activeDrawer === "pathologies"}
            onClose={() => setActiveDrawer(null)}
            data={pathologies.data ?? []}
            onAdd={() => setActiveSheet("pathologies")}
          />
        </>
      )}

      {/* ── Add entry sheets (shared between mobile & desktop) ── */}
      <AddEntrySheet
        title={m.sheet_add_subscription_title()}
        description={m.sheet_add_subscription_desc()}
        open={activeSheet === "subscription"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createSubscription.isPending}
      >
        <SubscriptionForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createSubscription.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={m.sheet_add_body_metrics_title()}
        description={m.sheet_add_body_metrics_desc()}
        open={activeSheet === "bodyMetrics"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createBodyMetrics.isPending}
      >
        <BodyMetricsForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createBodyMetrics.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={m.sheet_add_nutrition_title()}
        description={m.sheet_add_nutrition_desc()}
        open={activeSheet === "nutrition"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createNutritionPlan.isPending}
      >
        <NutritionForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createNutritionPlan.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={m.sheet_add_pathology_title()}
        description={m.sheet_add_pathology_desc()}
        open={activeSheet === "pathologies"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createPathology.isPending}
      >
        <PathologyForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createPathology.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>

      <AddEntrySheet
        title={m.sheet_add_cycle_title()}
        description={m.sheet_add_cycle_desc()}
        open={activeSheet === "cycle"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
        formId={ENTRY_FORM_ID}
        isPending={createCycle.isPending}
      >
        <CycleForm
          id={ENTRY_FORM_ID}
          onSubmit={(data) => {
            createCycle.mutate(data, { onSuccess: () => setActiveSheet(null) });
          }}
        />
      </AddEntrySheet>
    </div>
  );
}
