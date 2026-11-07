import { describe, expect, it } from "vitest";
import { isValidEmailAddress, normalizeEmailAddress } from "./email";

describe("email address utilities", () => {
  it("accepts Gmail, corporate, education, and multi-label country domains", () => {
    expect(isValidEmailAddress("golfer@gmail.com")).toBe(true);
    expect(isValidEmailAddress("test@globe.com.ph")).toBe(true);
    expect(isValidEmailAddress("caddie@club.org.ph")).toBe(true);
    expect(isValidEmailAddress("student+golf@university.edu.ph")).toBe(true);
  });

  it("normalizes casing and surrounding whitespace without changing the provider", () => {
    expect(normalizeEmailAddress("  Test@Globe.COM.PH  ")).toBe("test@globe.com.ph");
  });

  it("rejects malformed addresses without imposing a provider allow-list", () => {
    expect(isValidEmailAddress("test@localhost")).toBe(false);
    expect(isValidEmailAddress("test@@globe.com.ph")).toBe(false);
    expect(isValidEmailAddress("test @globe.com.ph")).toBe(false);
    expect(isValidEmailAddress("test@-globe.com.ph")).toBe(false);
  });
});
