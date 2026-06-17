import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { type PlanKey } from "@/config/plans";
import { createClient } from "@/lib/supabase/server";
import { PricingCardsClient } from "./pricing-cards-client";

/** Renders the three-tier pricing grid with checkout actions. */
export async function PricingCards() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentPlan: PlanKey = "free";
  if (user) {
    const [sub] = await db
      .select({ planKey: subscriptions.planKey })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);
    currentPlan = (sub?.planKey ?? "free") as PlanKey;
  }

  return <PricingCardsClient currentPlan={currentPlan} />;
}
