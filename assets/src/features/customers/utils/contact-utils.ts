/**
 * URL helper functions for customer contact actions.
 */

/**
 * Generate mailto: URL for email.
 */
export function getEmailUrl(email: string): string {
  return `mailto:${encodeURIComponent(email)}`;
}

/**
 * Generate WhatsApp URL from phone number.
 * Strips all non-digit characters.
 */
export function getWhatsAppUrl(phone: string): string {
  const cleanPhone = phone.replaceAll(/\D/g, "");
  return `https://wa.me/${cleanPhone}`;
}

/**
 * Generate Instagram profile URL from username.
 * Strips leading @ if present.
 */
export function getInstagramUrl(instagram: string): string {
  const username = instagram.startsWith("@") ? instagram.slice(1) : instagram;
  return `https://www.instagram.com/${username}`;
}
