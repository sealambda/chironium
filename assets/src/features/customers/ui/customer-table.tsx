import { useNavigate } from "@tanstack/react-router";
import { addMonths, formatISO } from "date-fns";

import type { SubscriptionWithPerson } from "@/features/customers/api/subscriptions-api";
import * as m from "@/paraglide/messages";
import { ContactButtonGroup } from "@/shared/ui/contact-button-group";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { extractContactInfo } from "@/shared/utils/contact-utils";
import { durationToMonths } from "@/shared/utils/duration-utils";
import { formatPersonName } from "@/shared/utils/person-utils";

interface CustomerTableProps {
  items: SubscriptionWithPerson[];
}

/**
 * Desktop table view of customer subscriptions, including contact actions and progress bars.
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
          {items.map((item) => {
            const name = formatPersonName(item.subscriber.name);
            const contact = extractContactInfo(item.subscriber.telecom);
            const planDurationMonths = durationToMonths(item.plan.duration);
            const endDate = formatISO(addMonths(new Date(item.startDate), planDurationMonths), {
              representation: "date",
            });

            return (
              <TableRow
                key={item.subscriber.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/customers/$customerId",
                    params: { customerId: item.subscriber.id },
                  })
                }
              >
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>
                  <ContactButtonGroup {...contact} personName={name} stopPropagation />
                </TableCell>
                <TableCell className="text-muted-foreground">{planDurationMonths} mo.</TableCell>
                <TableCell className="min-w-56">
                  <SubscriptionProgress
                    startDate={item.startDate}
                    endDate={endDate}
                    planDurationMonths={planDurationMonths}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
