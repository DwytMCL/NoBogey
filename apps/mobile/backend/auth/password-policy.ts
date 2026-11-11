export const PASSWORD_REQUIREMENTS = 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol such as ! @ # $ % or -.';

// Same symbol set Supabase Auth accepts for "lower_upper_letters_digits_symbols".
const SUPABASE_PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

export function getPasswordPolicyError(password: string): string | null {
  const strongEnough = password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && [...password].some((character) => SUPABASE_PASSWORD_SYMBOLS.includes(character));
  return strongEnough ? null : PASSWORD_REQUIREMENTS;
}
