import { Link } from "react-router-dom";
import { Gift, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/common";
import { usePageTitle } from "@/lib/usePageTitle";

const FEATURES = [
  {
    title: "Photo, link and price",
    text: "Add what you want with a picture, a link to the shop and what it costs. Only the name is required.",
  },
  {
    title: "Keep some things private",
    text: "Mark an item private and only you will see it on your list.",
  },
  {
    title: "Share one link",
    text: "Anyone with the link can look at your list. They don't need an account.",
  },
  {
    title: "Follow other lists",
    text: "Save the lists of friends and family so you know what to buy them.",
  },
];

const SAMPLE_ITEMS = [
  { name: "Linen throw", price: "240 zł", isPrivate: false },
  { name: "Ceramic coffee set", price: "123 zł", isPrivate: false },
  { name: "Field notebook", price: "45 zł", isPrivate: true },
];

/** Decorative preview of a wishlist, drawn as a sheet of paper. */
function PaperPreview() {
  return (
    <div
      className="mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lift"
      aria-hidden="true"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Gift className="size-5" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold leading-tight">Birthday 2026</p>
          <p className="text-sm text-muted-foreground">by Testing Tester</p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {SAMPLE_ITEMS.map((item) => (
          <li key={item.name} className="flex items-center gap-3 py-3">
            <span className="size-10 shrink-0 rounded-md bg-secondary" />
            <span className="flex-1 font-display font-medium">{item.name}</span>
            {item.isPrivate ? (
              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                <Lock className="size-3" /> Private
              </span>
            ) : (
              <span className="tabular text-sm text-muted-foreground">{item.price}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const LandingPage = () => {
  usePageTitle();
  const user = useUser();
  const ctaTo = user ? "/wishlists" : "/login";
  const ctaLabel = user ? "Open your wishlists" : "Make a wishlist";

  return (
    <div className="space-y-24 pt-4 md:pt-10">
      <section className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-7">
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
            A wishlist you can send to anyone
          </h1>
          <p className="max-w-xl text-xl leading-relaxed text-muted-foreground">
            Put what you want on a list, keep a few things to yourself, and share
            it with a link. People can look without signing up.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to={ctaTo}>{ctaLabel}</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="#features">How it works</a>
            </Button>
          </div>
        </div>
        <PaperPreview />
      </section>

      <section id="features" className="scroll-mt-24 space-y-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          How it works
        </h2>
        <ol className="divide-y divide-border border-y border-border">
          {FEATURES.map((feature, index) => (
            <li
              key={feature.title}
              className="grid gap-1 py-6 sm:grid-cols-[3rem_1fr_1.4fr] sm:gap-6"
            >
              <span className="tabular font-display text-lg text-muted-foreground">
                {index + 1}.
              </span>
              <h3 className="font-display text-xl font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">{feature.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col items-start justify-between gap-6 rounded-xl bg-primary px-8 py-10 text-primary-foreground sm:flex-row sm:items-center md:px-12">
        <h2 className="max-w-md font-display text-3xl font-semibold tracking-tight">
          Ready to start your list?
        </h2>
        <Button asChild size="lg" variant="secondary">
          <Link to={ctaTo}>{ctaLabel}</Link>
        </Button>
      </section>

      <footer className="border-t border-border pt-8 text-center text-muted-foreground">
        Questions or ideas? Reach out on{" "}
        <a
          href="https://www.linkedin.com/in/piotrszkafel/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-4"
        >
          LinkedIn
        </a>
        .
      </footer>
    </div>
  );
};
