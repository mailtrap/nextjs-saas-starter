"use client";

import { useRef, useTransition } from "react";
import { changePlan } from "@/actions/billing";
import { isPlanDowngrade, PLANS, type PlanKey } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const planKeys: PlanKey[] = ["free", "pro", "team"];

type Props = {
  currentPlan: PlanKey;
};

type PlanButtonProps = {
  planKey: PlanKey;
  currentPlan: PlanKey;
  label: string;
  variant: "default" | "outline";
};

function PlanButton({ planKey, currentPlan, label, variant }: PlanButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const isDowngrade = isPlanDowngrade(currentPlan, planKey);
  const targetPlan = PLANS[planKey];

  function runAction() {
    startTransition(async () => {
      await changePlan(planKey);
    });
  }

  function onClick() {
    if (isDowngrade) {
      dialogRef.current?.showModal();
      return;
    }
    runAction();
  }

  return (
    <>
      <Button
        type="button"
        className="w-full"
        variant={variant}
        disabled={pending}
        onClick={onClick}
      >
        {pending ? "Please wait…" : label}
      </Button>

      {isDowngrade ? (
        <dialog
          ref={dialogRef}
          className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg backdrop:bg-black/50"
          onClose={() => dialogRef.current?.close()}
        >
          <h3 className="text-lg font-semibold">Confirm plan downgrade</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Are you sure you want to proceed with plan downgrade from{" "}
            <span className="font-medium text-foreground">{PLANS[currentPlan].name}</span> to{" "}
            <span className="font-medium text-foreground">{targetPlan.name}</span>? Your current
            Stripe subscription will be updated or canceled.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                dialogRef.current?.close();
                runAction();
              }}
            >
              Yes, downgrade
            </Button>
          </div>
        </dialog>
      ) : null}
    </>
  );
}

/** Pricing grid with downgrade confirmation before switching to a lower tier. */
export function PricingCardsClient({ currentPlan }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-3" id="pricing">
      {planKeys.map((key) => {
        const plan = PLANS[key];

        return (
          <Card key={key} className="flex h-full flex-col">
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-3xl font-bold">
                ${plan.price}
                {plan.price > 0 && (
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <div className="mt-auto">
                <PlanButton
                  planKey={key}
                  currentPlan={currentPlan}
                  variant={key === "pro" ? "default" : "outline"}
                  label={key === "free" ? "Get started free" : `Choose ${plan.name}`}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
