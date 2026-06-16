"use client";

import { useState } from "react";
import { openBillingPortal } from "@/actions/billing";
import { Button } from "@/components/ui/button";

/** Button that opens the Stripe Customer Portal for the current user. */
export function BillingPortalButton() {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <form
        action={async () => {
          try {
            await openBillingPortal();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to open portal");
          }
        }}
      >
        <Button type="submit" variant="outline">
          Manage billing in Stripe
        </Button>
      </form>
      {error && <p className="mt-2 text-sm text-muted-foreground">{error}</p>}
    </div>
  );
}
