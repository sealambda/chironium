/**
 * Shared utilities for building contact URLs (email, WhatsApp, Instagram).
 */

interface ContactPoint {
  system?: string | null;
  value?: string | null;
}

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
 * Extract all contact values (email, phone, instagram) from telecom entries.
 * Instagram is the only URL-type contact, stored as a plain username.
 */
export function extractContactInfo(telecom: ContactPoint[] | undefined | null): {
  email?: string;
  phone?: string;
  instagram?: string;
} {
  if (!telecom) {
    return {};
  }

  const findBySystem = (system: string) =>
    telecom.find((t) => t.system === system)?.value ?? undefined;

  const instagram = telecom.find((t) => t.system === "URL")?.value;

  return {
    email: findBySystem("EMAIL"),
    phone: findBySystem("PHONE"),
    instagram: instagram ?? undefined,
  };
}
