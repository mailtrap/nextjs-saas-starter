import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { sendEmail } from "@/lib/mailtrap";
import { extractHttpStatus } from "@/lib/http";
import { getAppUrl } from "@/lib/utils";

export const runtime = "nodejs";

type HookPayload = {
  user: { id: string; email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
};

function authConfirmLink(tokenHash: string, type: string, redirect: string): string {
  const appUrl = getAppUrl();
  return `${appUrl}/auth/confirm?token_hash=${tokenHash}&type=${type}&redirect=${encodeURIComponent(redirect)}`;
}

/** Supabase Send Email Hook handler that sends auth emails via Mailtrap templates. */
export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Hook not configured" }, { status: 500 });
  }

  const headers = Object.fromEntries(request.headers.entries());
  const wh = new Webhook(secret.replace(/^v1,whsec_/, ""));

  let payload: HookPayload;
  try {
    payload = wh.verify(body, headers) as HookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { user, email_data } = payload;
  const action = email_data.email_action_type;
  const redirect = email_data.redirect_to || "/settings";

  try {
    if (action === "magiclink") {
      const link = authConfirmLink(email_data.token_hash, "magiclink", redirect || "/dashboard");
      await sendEmail({
        templateKey: "magic_link",
        to: user.email,
        variables: { magic_link: link },
        idempotencyKey: `magic:${user.id}:${email_data.token_hash.slice(0, 8)}`,
        userId: user.id,
      });
    } else if (action === "recovery") {
      const link = authConfirmLink(email_data.token_hash, "recovery", "/reset-password");
      await sendEmail({
        templateKey: "reset_password",
        to: user.email,
        variables: { reset_link: link },
        idempotencyKey: `reset:${user.id}:${email_data.token_hash.slice(0, 8)}`,
        userId: user.id,
      });
    } else if (action === "email_change" || action === "email_change_new") {
      // New email: token_hash + token_new (see Supabase send-email hook docs)
      if (user.new_email && email_data.token_hash) {
        const link = authConfirmLink(email_data.token_hash, "email_change", redirect);
        await sendEmail({
          templateKey: "magic_link",
          to: user.new_email,
          variables: { magic_link: link },
          idempotencyKey: `email-change-new:${user.id}:${email_data.token_hash.slice(0, 8)}`,
          userId: user.id,
        });
      }

      // Current email (secure email change): token_hash_new + token
      if (email_data.token_hash_new) {
        const link = authConfirmLink(email_data.token_hash_new, "email_change", redirect);
        await sendEmail({
          templateKey: "magic_link",
          to: user.email,
          variables: { magic_link: link },
          idempotencyKey: `email-change-current:${user.id}:${email_data.token_hash_new.slice(0, 8)}`,
          userId: user.id,
        });
      }
    }
  } catch (err) {
    const status = extractHttpStatus(err);
    console.error("Send email hook failed:", err);
    if (status === 429) {
      return NextResponse.json(
        { error: "Mail provider rate-limited. Retry in about a minute." },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }

  return NextResponse.json({});
}
