import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Building2, Plus, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  fetchSubscriptionsWithPerson,
  type SubscriptionWithPerson,
} from "@/features/customers/api/subscriptions-api";
import { OnboardingDialog } from "@/features/customers/ui/onboarding/onboarding-dialog";
import { PersonCard } from "@/features/customers/ui/person-card";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/ui/input-group";
import { useDetailMode } from "@/shared/layout/detail-context";
import { formatPersonName } from "@/shared/utils/person-utils";

/**
 * Customers page displaying a scrollable list of customer cards.
 */
export function CustomersPage() {
  const { selectedOrg, loading: orgsLoading } = useOrg();
  const { setHeaderContent } = useDetailMode();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [search, setSearch] = useState("");

  const {
    data: customers = [],
    isLoading,
    error,
  } = useQuery<SubscriptionWithPerson[]>({
    queryKey: ["customers", "list", selectedOrg?.id],
    queryFn: () => fetchSubscriptionsWithPerson(selectedOrg?.id ?? ""),
    enabled: Boolean(selectedOrg),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return customers;
    }
    return customers.filter((sub) =>
      formatPersonName(sub.subscriber.name).toLowerCase().includes(q),
    );
  }, [customers, search]);

  useEffect(() => {
    if (!selectedOrg) {
      setHeaderContent(null);
      return;
    }

    setHeaderContent(
      <div className="ml-auto flex w-full items-center justify-end gap-3">
        {customers.length > 0 ? (
          <div className="hidden w-72 sm:block">
            <CustomerSearchInput value={search} onChange={setSearch} />
          </div>
        ) : null}
        <Button onClick={() => setOnboardingOpen(true)}>
          <Plus className="size-4" data-icon="inline-start" />
          <span className="hidden md:inline">{m.customer_add()}</span>
        </Button>
      </div>,
    );

    return () => {
      setHeaderContent(null);
    };
  }, [customers.length, search, selectedOrg, setHeaderContent]);

  if (orgsLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">
            {m.common_loading()}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedOrg) {
    return (
      <EmptyState
        icon={Building2}
        title={m.customers_no_org()}
        description={m.customers_no_org_desc()}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-muted-foreground">
            {m.common_loading()}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch customers";
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 font-medium text-destructive">
            {m.customers_error()}
          </div>
          <div className="text-muted-foreground text-sm">{message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-7">
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-bold text-2xl text-foreground uppercase tracking-wide">
            {m.customers_title()}
          </h1>
          <span className="text-muted-foreground text-sm">
            ({customers.length})
          </span>
        </div>
      </header>

      {customers.length > 0 ? (
        <div className="sm:hidden">
          <CustomerSearchInput value={search} onChange={setSearch} />
        </div>
      ) : null}

      <CustomerList
        items={filtered}
        isEmpty={customers.length === 0}
        onAdd={() => setOnboardingOpen(true)}
      />

      <OnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
      />
    </div>
  );
}

function CustomerSearchInput({
  value,
  onChange,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={m.customers_search_placeholder()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </InputGroup>
  );
}

function CustomerList({
  items,
  isEmpty,
  onAdd,
}: Readonly<{
  items: SubscriptionWithPerson[];
  isEmpty: boolean;
  onAdd: () => void;
}>) {
  if (isEmpty) {
    return (
      <EmptyState
        icon={Users}
        title={m.customers_empty()}
        description={m.customers_empty_desc()}
        actionLabel={m.customer_add()}
        onAction={onAdd}
      />
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={Search} title={m.customers_no_results()} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.subscriber.id}
          to="/customers/$customerId"
          params={{ customerId: item.subscriber.id }}
          className="block"
        >
          <PersonCard item={item} />
        </Link>
      ))}
    </div>
  );
}
