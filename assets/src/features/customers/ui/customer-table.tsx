import { useNavigate } from "@tanstack/react-router";
import { addMonths, formatISO } from "date-fns";

import type { CustomerListItem } from "@/features/customers/api/persons-api";
import * as m from "@/paraglide/messages";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { durationToMonths } from "@/shared/utils/duration-utils";
import { formatPersonName } from "@/shared/utils/person-utils";

interface CustomerTableProps {
  items: CustomerListItem[];
}

/**
 * Desktop table view of persons with optional subscription progress.
 */
export function CustomerTable({ items }: Readonly<CustomerTableProps>) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{m.customers_col_name()}</TableHead>
            <TableHead>{m.customers_col_contact()}</TableHead>
            <TableHead>{m.customers_col_plan()}</TableHead>
            <TableHead className="min-w-56">{m.customers_col_progress()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(({ person, subscription }) => {
            const name = formatPersonName(person.name);
            const contact = extractContactInfo(person.telecom);
            const planDurationMonths = subscription
              ? durationToMonths(subscription.plan?.duration)
              : null;
            const endDate =
              subscription && planDurationMonths
                ? formatISO(addMonths(new Date(subscription.startDate), planDurationMonths), {
                    representation: "date",
                  })
                : null;

            return (
              <TableRow
                key={person.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/customers/$customerId",
                    params: { customerId: person.id },
                  })
                }
              >
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>
                  <ContactButtonGroup {...contact} personName={name} stopPropagation />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {planDurationMonths ? `${planDurationMonths} mo.` : "—"}
                </TableCell>
                <TableCell className="min-w-56">
                  {subscription && endDate && planDurationMonths ? (
                    <SubscriptionProgress
                      startDate={subscription.startDate}
                      endDate={endDate}
                      planDurationMonths={planDurationMonths}
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {m.customer_no_subscription()}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
