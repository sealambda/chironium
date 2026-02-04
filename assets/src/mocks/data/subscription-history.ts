import type { SubscriptionHistoryRecord } from "@/mocks/types";

export const subscriptionHistory: SubscriptionHistoryRecord[] = [
  // Sara Olea Martín (contact-sara)
  {
    id: "sub-hist-sara-1",
    customerId: "contact-sara",
    startDate: "2025-11-25",
    endDate: "2026-11-25",
    planDurationMonths: 12,
    status: "active",
    notes: "Initial subscription",
  },
  {
    id: "sub-hist-sara-2",
    customerId: "contact-sara",
    startDate: "2025-05-25",
    endDate: "2025-11-25",
    planDurationMonths: 6,
    status: "expired",
    notes: "Previous plan",
  },
  {
    id: "sub-hist-sara-3",
    customerId: "contact-sara",
    startDate: "2024-11-25",
    endDate: "2025-05-25",
    planDurationMonths: 6,
    status: "expired",
  },
  // Berta Guasch (contact-berta)
  {
    id: "sub-hist-berta-1",
    customerId: "contact-berta",
    startDate: "2025-12-09",
    endDate: "2026-06-09",
    planDurationMonths: 6,
    status: "active",
  },
  {
    id: "sub-hist-berta-2",
    customerId: "contact-berta",
    startDate: "2025-06-09",
    endDate: "2025-12-09",
    planDurationMonths: 6,
    status: "expired",
  },
  {
    id: "sub-hist-berta-3",
    customerId: "contact-berta",
    startDate: "2025-03-09",
    endDate: "2025-06-09",
    planDurationMonths: 3,
    status: "cancelled",
    notes: "Cancelled early due to travel",
  },
  // Lorena Alfonso (contact-lorena)
  {
    id: "sub-hist-lorena-1",
    customerId: "contact-lorena",
    startDate: "2025-12-12",
    endDate: "2026-06-12",
    planDurationMonths: 6,
    status: "active",
  },
  {
    id: "sub-hist-lorena-2",
    customerId: "contact-lorena",
    startDate: "2025-06-12",
    endDate: "2025-12-12",
    planDurationMonths: 6,
    status: "expired",
  },
];
