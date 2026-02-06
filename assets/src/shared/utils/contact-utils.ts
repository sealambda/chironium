/**
 * Shared utilities for building contact URLs (email, WhatsApp, Instagram).
 */

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
 * Contact point from GraphQL schema.
 */
interface ContactPoint {
  type?: string | null;
  value?: string | null;
}

/**
 * Extract all contact values (email, phone, instagram) from contact points.
 */
export function extractContactInfo(contactPoints: ContactPoint[] | undefined | null): {
  email?: string;
  phone?: string;
  instagram?: string;
} {
  const find = (type: string) => contactPoints?.find((p) => p.type === type)?.value ?? undefined;
  return {
    email: find("EMAIL"),
    phone: find("PHONE"),
    instagram: find("INSTAGRAM"),
  };
}
