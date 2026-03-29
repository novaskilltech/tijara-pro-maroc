/**
 * Email validation utilities for TIJARAPRO.
 * Validates, normalizes and provides French error messages.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns null if valid, or a French error message */
export function validateEmail(email: string | null | undefined): string | null {
  if (!email || email.trim() === "") return null; // empty = not required
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Adresse email invalide. Exemple : nom@domaine.com";
  }
  return null;
}

/** Returns null if valid, or error. Use when email is required. */
export function validateEmailRequired(email: string | null | undefined): string | null {
  if (!email || email.trim() === "") {
    return "L'adresse email est obligatoire.";
  }
  return validateEmail(email);
}

/** Normalize: trim + lowercase */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
