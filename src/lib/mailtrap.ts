import { MailtrapClient } from "mailtrap";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sentEmails, suppressions } from "@/db/schema";
import { type EmailTemplateKey, getTemplateUuid } from "@/config/emails";

let client: MailtrapClient | null = null;

/** True when emails should be captured in a Mailtrap test inbox instead of delivered. */
export function isMailtrapSandbox(): boolean {
  const value = process.env.MAILTRAP_SANDBOX?.toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

function getTestInboxId(): number {
  const raw = process.env.MAILTRAP_TEST_INBOX_ID?.trim();
  if (!raw) {
    throw new Error("MAILTRAP_TEST_INBOX_ID is required when MAILTRAP_SANDBOX=true");
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("MAILTRAP_TEST_INBOX_ID must be a positive integer");
  }
  return id;
}

/** Returns a singleton Mailtrap API client. */
function getClient(): MailtrapClient {
  if (!client) {
    const token = process.env.MAILTRAP_API_TOKEN;
    if (!token) throw new Error("MAILTRAP_API_TOKEN is not set");
    client = new MailtrapClient({
      token,
      testInboxId: isMailtrapSandbox() ? getTestInboxId() : undefined,
    });
  }
  return client;
}

export type SendEmailParams = {
  templateKey: EmailTemplateKey;
  to: string;
  variables: Record<string, unknown>;
  idempotencyKey: string;
  userId?: string;
  category?: string;
};

/** Sends one transactional email through the Mailtrap API. */
async function attemptSend(
  templateUuid: string,
  to: string,
  variables: Record<string, unknown>,
  userId: string | undefined,
  category: string,
) {
  const fromEmail = process.env.MAILTRAP_FROM_EMAIL;
  const fromName = process.env.MAILTRAP_FROM_NAME ?? "App";
  if (!fromEmail) throw new Error("MAILTRAP_FROM_EMAIL is not set");

  const baseMail = {
    from: { email: fromEmail, name: fromName },
    to: [{ email: to }],
    template_uuid: templateUuid,
    template_variables: variables as Record<string, string | number | boolean>,
    custom_variables: userId ? { user_id: userId } : undefined,
  };

  const mailtrap = getClient();
  if (isMailtrapSandbox()) {
    // Sandbox API rejects category together with template_uuid.
    return mailtrap.testing.send(baseMail);
  }
  return mailtrap.send({ ...baseMail, category });
}

async function clearIdempotencyKey(idempotencyKey: string): Promise<void> {
  await db.delete(sentEmails).where(eq(sentEmails.idempotencyKey, idempotencyKey));
}

/**
 * Sends a hosted-template email with idempotency, suppression checks, and one retry on server errors.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { templateKey, to, variables, idempotencyKey, userId, category } = params;

  const [suppressed] = await db
    .select()
    .from(suppressions)
    .where(eq(suppressions.email, to.toLowerCase()))
    .limit(1);

  if (suppressed) return;

  try {
    await db.insert(sentEmails).values({
      idempotencyKey,
      templateKey,
      recipient: to,
      userId: userId ?? null,
    });
  } catch {
    const [existing] = await db
      .select()
      .from(sentEmails)
      .where(eq(sentEmails.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing?.mailtrapMessageId) return;
  }

  const templateUuid = getTemplateUuid(templateKey);

  const deliver = async () => {
    const response = await attemptSend(
      templateUuid,
      to,
      variables,
      userId,
      category ?? templateKey,
    );
    const messageId =
      response && typeof response === "object" && "message_ids" in response
        ? (response as { message_ids?: string[] }).message_ids?.[0]
        : undefined;

    if (messageId) {
      await db
        .update(sentEmails)
        .set({ mailtrapMessageId: messageId })
        .where(eq(sentEmails.idempotencyKey, idempotencyKey));
    }
  };

  try {
    await deliver();
  } catch (err) {
    const isRetryable =
      err instanceof Error &&
      ("status" in err
        ? Number((err as { status?: number }).status) >= 500
        : err.message.includes("5"));

    if (isRetryable) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        await deliver();
        return;
      } catch (retryErr) {
        await clearIdempotencyKey(idempotencyKey);
        throw retryErr;
      }
    }

    await clearIdempotencyKey(idempotencyKey);
    throw err;
  }
}
