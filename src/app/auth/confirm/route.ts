import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirect } from "@/lib/utils";

/** Verifies magic-link and recovery OTP tokens and redirects to the app. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const redirect = searchParams.get("redirect");
  const fallback = type === "email_change" ? "/settings?emailChanged=1" : "/dashboard";

  let destination = `${origin}${safeRedirect(redirect, fallback)}`;
  if (redirect) {
    try {
      destination = new URL(redirect).toString();
    } catch {
      destination = `${origin}${safeRedirect(redirect, fallback)}`;
    }
  }

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "magiclink" | "recovery" | "email" | "email_change",
    });

    if (!error) {
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
