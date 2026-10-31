import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, currentLanguage } from "@/i18n";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  /** A quiet header-sized control with a globe icon and a hidden label. */
  compact?: boolean;
  /** Hides the visible label (it stays available to screen readers). Defaults to `compact`. */
  hideLabel?: boolean;
}

/** Picks the UI language; the choice is saved to localStorage by the language detector. */
export function LanguageSwitcher({ className, compact = false, hideLabel = compact }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const id = useId();

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
        {t("language.label")}
      </Label>
      <div className="relative inline-flex items-center text-muted-foreground focus-within:text-foreground">
        <Globe
          className={cn("pointer-events-none absolute size-4", compact ? "left-2" : "left-3.5")}
          aria-hidden="true"
        />
        <select
          id={id}
          value={currentLanguage()}
          onChange={(event) => {
            void i18n.changeLanguage(event.target.value);
          }}
          className={cn(
            "cursor-pointer appearance-none rounded-lg text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact
              ? "h-9 bg-transparent pl-8 pr-7 text-sm hover:bg-secondary"
              : "h-11 border border-input bg-card pl-10 pr-9 text-base hover:border-foreground/30",
          )}
        >
          {SUPPORTED_LANGUAGES.map((code) => (
            <option key={code} value={code} lang={code}>
              {t(`language.${code}`)}
            </option>
          ))}
        </select>
        <ChevronDown
          className={cn("pointer-events-none absolute size-4", compact ? "right-2" : "right-3")}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
