import * as Linking from "expo-linking";
import { extractMobileCaptchaToken, MOBILE_CAPTCHA_CALLBACKS, shouldBypassMobileCaptcha } from "./captcha-validation";

const CAPTCHA_URL = "https://nobogeyofficial.com/mobile-captcha";

type PendingCaptcha = {
  id: symbol;
  reject: (reason: Error) => void;
  resolve: (token: string) => void;
  subscription: ReturnType<typeof Linking.addEventListener>;
  timeout: ReturnType<typeof setTimeout>;
};

let pendingCaptcha: PendingCaptcha | undefined;

function clearPendingCaptcha(expectedId?: symbol): PendingCaptcha | undefined {
  if (expectedId && pendingCaptcha?.id !== expectedId) return undefined;
  const pending = pendingCaptcha;
  pendingCaptcha = undefined;
  if (pending) {
    clearTimeout(pending.timeout);
    pending.subscription.remove();
  }
  return pending;
}

/** Resolve the active challenge from the Expo route as a fallback to the Linking event. */
export function resolveMobileCaptchaToken(token: string): boolean {
  const normalized = token.trim();
  if (!normalized) return false;
  const pending = clearPendingCaptcha();
  if (!pending) return false;
  pending.resolve(normalized);
  return true;
}

function acceptMobileCaptchaCallback(url: string): boolean {
  const token = extractMobileCaptchaToken(url);
  return token ? resolveMobileCaptchaToken(token) : false;
}

export async function completeMobileCaptcha(): Promise<string> {
  if (shouldBypassMobileCaptcha()) return "development-bypass";

  const callbackUrl = MOBILE_CAPTCHA_CALLBACKS[0];
  const token = await new Promise<string>((resolve, reject) => {
    clearPendingCaptcha()?.reject(new Error("A newer security check was started."));
    const challengeId = Symbol("mobile-captcha");
    const timeout = setTimeout(() => {
      const pending = clearPendingCaptcha(challengeId);
      pending?.reject(new Error("Security check timed out. Please try again."));
    }, 120_000);
    const subscription = Linking.addEventListener("url", ({ url }) => {
      acceptMobileCaptchaCallback(url);
    });
    pendingCaptcha = { id: challengeId, reject, resolve, subscription, timeout };
    void Linking.openURL(`${CAPTCHA_URL}?return_to=${encodeURIComponent(callbackUrl)}`).catch((error) => {
      const pending = clearPendingCaptcha(challengeId);
      pending?.reject(error instanceof Error ? error : new Error("Security check could not be opened."));
    });
  });

  // Turnstile tokens are single-use. Supabase Auth verifies this token server-side,
  // so the mobile client must not pre-consume it at the Worker verification endpoint.
  return token;
}
