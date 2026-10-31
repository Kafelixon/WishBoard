import { Suspense, lazy } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/lib/common";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

const AccountMenu = lazy(() => import("./AccountMenu"));

const navLinkClass =
  "rounded-md px-2.5 pb-1 pt-2 text-sm text-muted-foreground sm:px-3.5 sm:text-[0.95rem] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-secondary aria-[current=page]:text-foreground";

function LogoMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="hidden size-6 text-primary sm:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

export function TopMenu() {
  const location = useLocation();
  const user = useUser();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-5">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md font-display text-xl font-semibold tracking-tight sm:text-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogoMark />
          {t("app.name")}
        </Link>
        <nav aria-label={t("nav.main")} className="flex flex-1 items-center gap-0.5 sm:ml-2 sm:gap-1">
          {user && (
            <>
              <NavLink to="/wishlists" className={navLinkClass}>
                {t("nav.wishlists")}
              </NavLink>
              <NavLink to="/following" className={navLinkClass}>
                {t("nav.following")}
              </NavLink>
            </>
          )}
        </nav>
        {!user && <LanguageSwitcher compact />}
        {user ? (
          <Suspense fallback={<div className="size-9 shrink-0 rounded-full bg-secondary" aria-hidden="true" />}>
            <AccountMenu user={user} />
          </Suspense>
        ) : (
          location.pathname !== "/login" && (
            <Button asChild size="sm">
              <Link to="/login">{t("nav.getStarted")}</Link>
            </Button>
          )
        )}
      </div>
    </header>
  );
}
