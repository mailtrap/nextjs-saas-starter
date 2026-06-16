import crypto from "crypto";

/** Verifies the Mailtrap-Signature HMAC header against the raw webhook body. */
export function verifyMailtrapSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !body) return false;

  const computed = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
