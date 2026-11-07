export const MOBILE_CAPTCHA_CALLBACKS = ["nobogey://captcha", "exp+nobogey-mobile://captcha"] as const;

export function isAllowedMobileCaptchaCallback(url: string): boolean {
  if (!url) return false;
  try {
    const candidate = new URL(url);
    return MOBILE_CAPTCHA_CALLBACKS.some((allowed) => {
      const expected = new URL(allowed);
      return candidate.protocol === expected.protocol
        && candidate.hostname === expected.hostname
        && candidate.port === expected.port
        && candidate.pathname === expected.pathname
        && !candidate.username
        && !candidate.password;
    });
  } catch {
    return false;
  }
}

export function extractMobileCaptchaToken(url: string): string | null {
  if (!isAllowedMobileCaptchaCallback(url)) return null;
  const token = new URL(url).searchParams.get("token")?.trim();
  return token || null;
}

export function shouldBypassMobileCaptcha(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.EXPO_PUBLIC_BYPASS_CAPTCHA === "true";
}
