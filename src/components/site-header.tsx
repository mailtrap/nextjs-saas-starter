import Link from "next/link";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/utils";

/** Renders the top navigation with auth-aware links. */
export async function SiteHeader() {
  const user = await getSessionUser();
  const isAdmin = !!user?.email && isAdminEmail(user.email);

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold">
          Mailtrap SaaS
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/settings" className="hover:underline">
                Settings
              </Link>
              <Link href="/team" className="hover:underline">
                Team
              </Link>
              {isAdmin ? (
                <Link href="/admin/emails" className="hover:underline">
                  Admin
                </Link>
              ) : null}
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
