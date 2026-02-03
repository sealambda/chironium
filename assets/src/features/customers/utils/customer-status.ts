import type { CustomerStatus } from "../model/customer-types";

/**
 * Get a human-readable label for a customer status.
 *
 * @param status - The customer status
 * @returns A user-friendly label for the status
 */
export function getStatusLabel(status: CustomerStatus): string {
  switch (status) {
    case "green":
      return "On Track";
    case "yellow":
      return "Warning";
    case "red":
      return "Critical";
  }
}

/**
 * Get a description for a customer status.
 *
 * @param status - The customer status
 * @returns A description explaining the status
 */
export function getStatusDescription(status: CustomerStatus): string {
  switch (status) {
    case "green":
      return "Customer is on track with their subscription";
    case "yellow":
      return "Customer needs attention soon";
    case "red":
      return "Customer requires immediate attention";
  }
}
