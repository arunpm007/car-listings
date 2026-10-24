/**
 * Normalises an Indian mobile number to +91XXXXXXXXXX, or null if it isn't one.
 * Accepts spaces, dashes, a leading 0, 91 or +91.
 */
export function normalizeIndianPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

/** wa.me wants digits only, with the country code. */
export function waNumber(phone: string) {
  return phone.replace(/\D/g, "");
}

/** +919876543210 → "+91 98765 43210", the way people read it. Anything else comes back as typed. */
export function prettyPhone(phone: string) {
  const n = normalizeIndianPhone(phone);
  return n ? `+91 ${n.slice(3, 8)} ${n.slice(8)}` : phone.trim();
}
