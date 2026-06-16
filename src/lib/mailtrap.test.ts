import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { verifyMailtrapSignature } from "./mailtrap-verify";

describe("verifyMailtrapSignature", () => {
  it("accepts valid signature", () => {
    const secret = "test-secret";
    const body = '{"events":[]}';
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyMailtrapSignature(body, sig, secret)).toBe(true);
  });

  it("rejects invalid signature", () => {
    expect(verifyMailtrapSignature("{}", "bad", "secret")).toBe(false);
  });
});
