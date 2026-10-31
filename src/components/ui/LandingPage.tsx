import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type { TKey } from "@/i18n";
import { Gift, Heart, Link2, Lock, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/common";
import { usePageTitle } from "@/lib/usePageTitle";

const FEATURES: { icon: ReactNode; title: TKey; text: TKey }[] = [
  {
    icon: <Gift aria-hidden="true" />,
    title: "landing.features.create.title",
    text: "landing.features.create.text",
  },
  {
    icon: <Lock aria-hidden="true" />,
    title: "landing.features.privacy.title",
    text: "landing.features.privacy.text",
  },
  {
    icon: <Link2 aria-hidden="true" />,
    title: "landing.features.sharing.title",
    text: "landing.features.sharing.text",
  },
  {
    icon: <Heart aria-hidden="true" />,
    title: "landing.features.connected.title",
    text: "landing.features.connected.text",
  },
];

const SAMPLE_ITEMS: { name: TKey; price: string; isPrivate: boolean }[] = [
  { name: "landing.preview.items.throw", price: "240 zł", isPrivate: false },
  { name: "landing.preview.items.coffee", price: "123 zł", isPrivate: false },
  { name: "landing.preview.items.notebook", price: "45 zł", isPrivate: true },
];

/** Rendered by <Trans>, which supplies the translated link text as children. */
function LinkedInLink({ children }: { children?: ReactNode }) {
  return (
    <a
      href="https://www.linkedin.com/in/piotrszkafel/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-4"
    >
      {children}
    </a>
  );
}

/** Decorative preview of a wishlist, drawn as a sheet of paper. */
function PaperPreview() {
  const { t } = useTranslation();
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 rounded-xl border border-border bg-secondary" />
      <div className="relative -rotate-2 rounded-xl border border-border bg-card p-6 shadow-lift">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Gift className="size-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{t("landing.preview.title")}</p>
            <p className="text-sm text-muted-foreground">{t("landing.preview.by", { name: "Testing Tester" })}</p>
          </div>
        </div>
        <ul className="divide-y divide-border">
          {SAMPLE_ITEMS.map((item) => (
            <li key={item.name} className="flex items-center gap-3 py-3">
              <span className="size-10 shrink-0 rounded-lg bg-secondary" />
              <span className="flex-1 font-display font-medium">{t(item.name)}</span>
              {item.isPrivate ? (
                <span className="inline-flex items-center gap-1 text-xs text-destructive">
                  <Lock className="size-3" /> {t("landing.preview.private")}
                </span>
              ) : (
                <span className="tabular text-sm text-muted-foreground">{item.price}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-5 -right-2 flex rotate-3 items-center gap-2 rounded-lg border border-border bg-popover px-4 py-2 text-sm shadow-dialog">
        <Link2 className="size-4 text-primary" /> {t("landing.preview.linkCopied")}
      </div>
    </div>
  );
}

export const LandingPage = () => {
  usePageTitle();
  const { t } = useTranslation();
  const user = useUser();
  const ctaTo = user ? "/wishlists" : "/login";
  const ctaLabel = user ? t("landing.ctaOpen") : t("landing.ctaCreate");

  return (
    <div className="space-y-28 pt-4 md:pt-10">
      <section className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-7">
          <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
            <Sprout className="size-4 text-primary" aria-hidden="true" />
            {t("landing.badge")}
          </p>
          <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="max-w-xl text-xl leading-relaxed text-muted-foreground">
            {t("landing.heroText")}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to={ctaTo}>{ctaLabel}</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a href="#features">{t("landing.howItWorks")}</a>
            </Button>
          </div>
        </div>
        <PaperPreview />
      </section>

      <section id="features" className="scroll-mt-24 space-y-12">
        <div className="max-w-2xl space-y-3">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
            {t("landing.featuresTitle")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("landing.featuresText")}
          </p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex gap-5 rounded-xl border border-border bg-card p-6 shadow-paper"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-6">
                {feature.icon}
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display text-xl font-semibold tracking-tight">
                  {t(feature.title)}
                </h3>
                <p className="text-muted-foreground">{t(feature.text)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-6 rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground shadow-lift md:px-16">
        <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
          {t("landing.closingTitle")}
        </h2>
        <p className="mx-auto max-w-xl text-lg opacity-85">
          {t("landing.closingText")}
        </p>
        <Button asChild size="lg" variant="secondary">
          <Link to={ctaTo}>{ctaLabel}</Link>
        </Button>
      </section>

      <footer className="border-t border-border pt-8 text-center text-muted-foreground">
        <Trans
          i18nKey="landing.footer"
          components={{
            link: (
              <LinkedInLink />
            ),
          }}
        />
      </footer>
    </div>
  );
};
