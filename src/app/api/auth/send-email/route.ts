import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { sendEmail } from "@/lib/mailtrap";
import { getAppUrl } from "@/lib/utils";

export const runtime = "nodejs";

type HookPayload = {
  user: { id: string; email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
};

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
  const appUrl = getAppUrl();
  const action = email_data.email_action_type;

  try {
    if (action === "magiclink") {
      const link = `${appUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=magiclink&redirect=${encodeURIComponent(email_data.redirect_to || "/dashboard")}`;
      await sendEmail({
        templateKey: "magic_link",
        to: user.email,
        variables: { magic_link: link },
        idempotencyKey: `magic:${user.id}:${email_data.token_hash.slice(0, 8)}`,
        userId: user.id,
      });
    } else if (action === "recovery") {
      const link = `${appUrl}/reset-password?token_hash=${email_data.token_hash}&type=recovery`;
      await sendEmail({
        templateKey: "reset_password",
        to: user.email,
        variables: { reset_link: link },
        idempotencyKey: `reset:${user.id}:${email_data.token_hash.slice(0, 8)}`,
        userId: user.id,
      });
    }
  } catch (err) {
    console.error("Send email hook failed:", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }

  return NextResponse.json({});
}
