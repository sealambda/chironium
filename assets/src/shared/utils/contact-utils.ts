/**
 * Shared utilities for building contact URLs (email, WhatsApp, Instagram).
 */

import type { ContactPoint } from "@/gql/graphql";

/**
 * Sanitize phone number to digits only for URL building.
 */
export function sanitizePhoneDigits(phone: string): string {
  return phone.replaceAll(/\D/g, "");
}

/**
 * Normalize Instagram handle by removing leading @ symbol.
 */
export function normalizeInstagramHandle(handle: string): string {
  return handle.startsWith("@") ? handle.slice(1) : handle;
}

/**
 * Format Instagram handle with @ prefix for display.
 */
export function formatInstagramDisplay(handle: string): string {
  if (!handle) {
    return "";
  }
  return handle.startsWith("@") ? handle : `@${handle}`;
}

/**
 * Build mailto: URL for email.
 */
export function getEmailUrl(email: string): string {
  return `mailto:${encodeURIComponent(email)}`;
}

/**
 * Build WhatsApp deep link URL.
 */
export function getWhatsAppUrl(phone: string): string {
  const cleanPhone = sanitizePhoneDigits(phone);
  return `https://wa.me/${cleanPhone}`;
}

/**
 * Build Instagram profile URL.
 */
export function getInstagramUrl(instagram: string): string {
  const username = normalizeInstagramHandle(instagram);
  return `https://www.instagram.com/${username}`;
}

/**
 * Contact point from the FHIR-based GraphQL schema.
 * Uses `system` (FHIR ContactPoint.system) to identify the channel.
 */
interface TelecomEntry {
  system?: string | null;
  value?: string | null;
}

/**
 * Extract all contact values (email, phone, instagram) from telecom entries.
 * Instagram is stored as a URL-type contact containing "instagram" in the value.
 */
export function extractContactInfo(telecom: TelecomEntry[] | undefined | null): {
  email?: string;
  phone?: string;
  instagram?: string;
} {
  if (!telecom) {
    return {};
  }

  const findBySystem = (system: string) =>
    telecom.find((t) => t.system === system)?.value ?? undefined;

  // Instagram is stored as a URL or OTHER contact containing "instagram".
  const instagram = telecom.find(
    (t) =>
      (t.system === "URL" || t.system === "OTHER") && t.value?.toLowerCase().includes("instagram"),
  )?.value;

  return {
    email: findBySystem("EMAIL"),
    phone: findBySystem("PHONE"),
    instagram: instagram ?? undefined,
  };
}
