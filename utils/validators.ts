export function isValidIndianMobile(phone: string): boolean {
  const digits = phone.replace(/[^\d]/g, "");
  // accepts 10 digits (optionally starting with 0 or 91 in raw input)
  if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
  if (digits.length === 11 && digits.startsWith("0"))
    return /^[6-9]\d{9}$/.test(digits.slice(1));
  if (digits.length === 12 && digits.startsWith("91"))
    return /^[6-9]\d{9}$/.test(digits.slice(2));
  return false;
}

export function isValidOtp(otp: string): boolean {
  return /^\d{4,6}$/.test(otp.trim());
}

export function isNonEmpty(s: string): boolean {
  return s.trim().length > 0;
}

export function isValidEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  // simple pragmatic email check (not RFC-perfect)
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export function isStrongPassword(pw: string): boolean {
  // at least 6 chars; adjust to your policy
  return pw.trim().length >= 6;
}