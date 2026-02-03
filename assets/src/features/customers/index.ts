// API

export type { CreateCustomerInput } from "./api/customers-api";
export { createCustomer, fetchCustomerList } from "./api/customers-api";
export { customerFormSchema } from "./model/customer-schema";
// Model
export type {
  Customer,
  CustomerAction,
  CustomerActionType,
  CustomerStatus,
} from "./model/customer-types";

// Store
export { useCustomersStore } from "./store/customers-store";

// UI (only exports commonly reused components)
export { CustomerSheet } from "./ui/create-customer-sheet";
export { CustomerCard } from "./ui/customer-card";
export { CustomerTable } from "./ui/customer-table";
export {
  getEmailUrl,
  getInstagramUrl,
  getWhatsAppUrl,
} from "./utils/contact-utils";
// Utils
export {
  calculateProgressPercent,
  formatPlanDuration,
  getProgressColor,
} from "./utils/progress-utils";
