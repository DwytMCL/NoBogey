type ErrorShape = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
};

function diagnosticFor(reason: unknown): string {
  const error = reason && typeof reason === "object" ? reason as ErrorShape : null;
  return [
    error?.code,
    error?.name,
    error?.message,
    error?.details,
    error?.hint,
    error?.status,
    reason instanceof Error ? reason.message : null,
  ].filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .join(" ")
    .toLowerCase();
}

/**
 * Translate backend/Auth failures into safe copy for customer-facing screens.
 * Raw database messages, RPC names, SQLSTATE values, and infrastructure details
 * must stay in logs and must never be rendered directly in the product UI.
 */
export function describeUserError(reason: unknown, fallback: string): string {
  const diagnostic = diagnosticFor(reason);

  if (/invalid login credentials|invalid_credentials/.test(diagnostic)) {
    return "The email or password is incorrect. Please try again.";
  }
  if (/email.*not.*confirm|email_not_confirmed/.test(diagnostic)) {
    return "Confirm your email address before signing in.";
  }
  if (/user_already_exists|user already registered|already been registered|already has an account/.test(diagnostic)) {
    return "This email already has a NoBogey account. Sign in instead or reset your password.";
  }
  if (/email_address_invalid|invalid_email_address|invalid email address|email.*invalid/.test(diagnostic)) {
    return "Enter a valid email address and try again.";
  }
  if (/email_address_not_authorized/.test(diagnostic)) {
    return "NoBogey could not send a verification email to that address. Check the address and try again.";
  }
  if (/smtp|error sending (confirmation|recovery|email)|failed to send (confirmation|recovery|email)/.test(diagnostic)) {
    return "NoBogey could not send the email right now. Please try again shortly.";
  }
  if (/over_email_send_rate_limit|email rate limit|rate.?limit|too many requests|429/.test(diagnostic)) {
    return "Too many attempts were made. Please wait a few minutes and try again.";
  }
  if (/captcha|turnstile|security check/.test(diagnostic)) {
    return "The security check could not be completed. Please try again.";
  }
  if (/weak_password|password.*(weak|short)|password should/.test(diagnostic)) {
    return "Choose a stronger password and follow the password requirements shown.";
  }
  if (/expired.*(token|link)|otp_expired|invalid.*(token|link)|flow_state_not_found|pkce/.test(diagnostic)) {
    return "This secure link is invalid or has expired. Request a new one and try again.";
  }
  if (/auth_required|jwt.*expired|session.*expired|refresh_token_not_found/.test(diagnostic)) {
    return "Your session has expired. Sign in again and retry.";
  }
  if (/not registered as a|selected role/.test(diagnostic)) {
    return "This account does not have access to the selected role.";
  }
  if (/caddie_account_not_found/.test(diagnostic)) {
    return "That email must have a NoBogey account before it can be enrolled.";
  }
  if (/active_home_course_required/.test(diagnostic)) {
    return "The selected home course is unavailable. Choose another course and try again.";
  }
  if (/tee_time_already_exists|duplicate.*tee.*time/.test(diagnostic)) {
    return "That tee time is already scheduled.";
  }
  if (/booking_slot_unavailable|tee.*time.*unavailable|booking.*conflict/.test(diagnostic)) {
    return "That tee time is no longer available. Choose another time and try again.";
  }
  if (/duplicate key|unique constraint|23505/.test(diagnostic)) {
    return "This information has already been submitted.";
  }
  if (/failed to fetch|networkerror|network request failed|fetch failed|timeout|timed out/.test(diagnostic)) {
    return "NoBogey could not connect right now. Check your internet connection and try again.";
  }

  return fallback;
}
