import { createCheckout, selectFreePlan } from "@/actions/billing";
import { PLANS, type PlanKey } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const planKeys: PlanKey[] = ["free", "pro", "team"];

/** Renders the three-tier pricing grid with checkout actions. */
export function PricingCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3" id="pricing">
      {planKeys.map((key) => {
        const plan = PLANS[key];
        const action = key === "free" ? selectFreePlan : createCheckout.bind(null, key);

        return (
          <Card key={key} className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-3xl font-bold">
                ${plan.price}
                {plan.price > 0 && <span className="text-base font-normal text-muted-foreground">/mo</span>}
              </p>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <form action={action} className="mt-auto">
                <Button type="submit" className="w-full" variant={key === "pro" ? "default" : "outline"}>
                  {key === "free" ? "Get started free" : `Choose ${plan.name}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
