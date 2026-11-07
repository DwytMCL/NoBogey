import { describe, expect, it } from "vitest";
import { describeUserError } from "./user-error";

describe("describeUserError", () => {
  it("never exposes database function names or SQL errors", () => {
    const message = describeUserError(
      { code: "42501", message: "permission denied for function submit_caddie_onboarding" },
      "Your profile was not submitted because there was a problem. Please try again.",
    );

    expect(message).toBe("Your profile was not submitted because there was a problem. Please try again.");
    expect(message).not.toContain("submit_caddie_onboarding");
    expect(message).not.toContain("42501");
  });

  it("provides actionable messages for common account errors", () => {
    expect(describeUserError({ code: "invalid_credentials" }, "Unable to sign in."))
      .toBe("The email or password is incorrect. Please try again.");
    expect(describeUserError({ message: "User already registered" }, "Unable to create account."))
      .toContain("Sign in instead");
    expect(describeUserError({ code: "over_email_send_rate_limit" }, "Unable to send email."))
      .toContain("wait a few minutes");
    expect(describeUserError({ code: "email_address_not_authorized" }, "Unable to create account."))
      .toContain("verification email");
    expect(describeUserError({ message: "Error sending confirmation email" }, "Unable to create account."))
      .toContain("could not send the email");
  });

  it("uses the supplied safe fallback for unknown infrastructure errors", () => {
    expect(describeUserError(new Error("unexpected_internal_rpc_name"), "Please try again."))
      .toBe("Please try again.");
  });
});
