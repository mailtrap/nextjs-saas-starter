export const PLANS = {
  free: {
    key: "free",
    name: "Free",
    price: 0,
    priceId: process.env.STRIPE_PRICE_FREE ?? "",
    description: "Get started at no cost",
    features: ["1 organization", "Basic email support"],
  },
  pro: {
    key: "pro",
    name: "Pro",
    price: 19,
    priceId: process.env.STRIPE_PRICE_PRO ?? "",
    description: "For indie hackers shipping fast",
    features: ["Everything in Free", "Priority support", "Team invites"],
  },
  team: {
    key: "team",
    name: "Team",
    price: 99,
    priceId: process.env.STRIPE_PRICE_TEAM ?? "",
    description: "For small teams collaborating",
    features: ["Everything in Pro", "Unlimited invites", "Admin email logs"],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
