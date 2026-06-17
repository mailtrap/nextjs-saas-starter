import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { type PlanKey } from "@/config/plans";
import { getSessionUser } from "@/lib/supabase/server";
import { PricingCardsClient } from "./pricing-cards-client";

/** Renders the three-tier pricing grid with checkout actions. */
export async function PricingCards() {
  const user = await getSessionUser();

  let currentPlan: PlanKey = "free";
  if (user && process.env.DATABASE_URL?.trim()) {
    try {
      const [sub] = await db
        .select({ planKey: subscriptions.planKey })
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
        .limit(1);
      currentPlan = (sub?.planKey ?? "free") as PlanKey;
    } catch {
      /* DB unavailable — show default plan */
    }
  }

  return <PricingCardsClient currentPlan={currentPlan} />;
}
