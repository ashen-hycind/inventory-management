/**
 * Verification Code Generator
 *
 * Generates unambiguous 6-8 character alphanumeric codes.
 * Excludes visually confusing characters: '0', 'O', '1', 'I', 'L'.
 */

const SAFE_CHARSET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateVerificationCode(length = 7) {
  let result = "";
  const charactersLength = SAFE_CHARSET.length;
  for (let i = 0; i < length; i++) {
    result += SAFE_CHARSET.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function formatVerificationCode(code) {
  if (!code) return "";
  const clean = String(code).toUpperCase().trim();
  // If 6 or 7 chars, e.g. "ABC-123X" or clean string
  return clean;
}
