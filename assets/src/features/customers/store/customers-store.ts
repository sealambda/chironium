import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Customer } from "../ui/customer-card";

/** Stable empty array to avoid infinite loops in selectors */
const EMPTY_CUSTOMERS: Customer[] = [];

interface CustomersStoreState {
  /** Map of orgId to array of locally-created customers */
  mockCustomers: Map<string, Customer[]>;
  /** Add a new customer to the local store */
  addCustomer: (orgId: string, customer: Customer) => void;
  /** Update an existing customer in the local store */
  updateCustomer: (orgId: string, customer: Customer) => void;
  /** Get all local customers for an organization */
  getCustomers: (orgId: string) => Customer[];
  /** Clear all local customers (useful for testing) */
  clearCustomers: () => void;
}

/**
 * Zustand store for locally-created customers.
 * Persists in memory during session (no localStorage per PRD).
 * Follows pattern from org-store.ts with devtools middleware.
 */
export const useCustomersStore = create<CustomersStoreState>()(
  devtools(
    (set, get) => ({
      mockCustomers: new Map(),

      addCustomer: (orgId, customer) => {
        set(
          (state) => {
            const newMap = new Map(state.mockCustomers);
            const existing = newMap.get(orgId) || [];
            newMap.set(orgId, [...existing, customer]);
            return { mockCustomers: newMap };
          },
          undefined,
          "addCustomer",
        );
      },

      updateCustomer: (orgId, customer) => {
        set(
          (state) => {
            const newMap = new Map(state.mockCustomers);
            const existing = newMap.get(orgId) || [];
            const updated = existing.map((c) =>
              c.id === customer.id ? customer : c,
            );
            newMap.set(orgId, updated);
            return { mockCustomers: newMap };
          },
          undefined,
          "updateCustomer",
        );
      },

      getCustomers: (orgId) => {
        return get().mockCustomers.get(orgId) || EMPTY_CUSTOMERS;
      },

      clearCustomers: () => {
        set({ mockCustomers: new Map() }, undefined, "clearCustomers");
      },
    }),
    {
      enabled: import.meta.env.DEV,
      name: "customers-store",
    },
  ),
);
