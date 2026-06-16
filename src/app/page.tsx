import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PricingCards } from "@/components/pricing-cards";

const faqs = [
  {
    q: "What is this project?",
    a: "A blank-slate SaaS starter with Supabase auth, Stripe billing, and Mailtrap transactional email. Add your product logic on top.",
  },
  {
    q: "Do I need a Mailtrap account?",
    a: "Yes. Create hosted templates, add UUIDs to your env, and verify a sending domain.",
  },
  {
    q: "Can I deploy to Vercel?",
    a: "Yes. Use the Deploy button in the README and complete the post-deploy webhook checklist.",
  },
];

/** Marketing landing page with hero, pricing, FAQ, and footer. */
export default function HomePage() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Ship your SaaS faster with Mailtrap email
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Next.js 15, Supabase, Stripe, and Mailtrap — wired for learners and weekend builders.
          Drop in your product logic within an hour.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/signup">Start building</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="#pricing">View pricing</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold">Simple pricing</h2>
        <PricingCards />
      </section>

      <section className="mx-auto max-w-2xl px-4 py-16">
        <h2 className="mb-6 text-center text-2xl font-semibold">FAQ</h2>
        <Accordion type="single" collapsible>
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.q} value={`item-${i}`}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>
          Built by{" "}
          <a href="https://mailtrap.io" className="underline">
            Mailtrap
          </a>
          . MIT License. Swap in your product under <code className="text-xs">src/features/</code>.
        </p>
      </footer>
    </div>
  );
}
