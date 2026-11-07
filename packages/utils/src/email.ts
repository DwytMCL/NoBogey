/** Normalize an email address for Auth and account lookups. */
export function normalizeEmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Perform a deliberately provider-neutral client-side email check.
 *
 * This accepts multi-label domains such as `globe.com.ph` and does not
 * maintain a provider allow-list. Supabase Auth and the recipient's mail
 * server remain authoritative for deliverability.
 */
export function isValidEmailAddress(value: string): boolean {
  const email = normalizeEmailAddress(value);
  const hasControlCharacter = Array.from(email).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127;
  });
  if (!email || email.length > 254 || /\s/u.test(email) || hasControlCharacter) return false;

  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator !== email.indexOf("@")) return false;

  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  if (local.length > 64 || !domain || domain.length > 253 || !domain.includes(".")) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;

  return domain.split(".").every((label) => label.length > 0
    && label.length <= 63
    && !label.startsWith("-")
    && !label.endsWith("-")
    && /^[\p{L}\p{N}-]+$/u.test(label));
}
