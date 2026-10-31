import { useId } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, currentLanguage } from "@/i18n";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  /** Hides the visible label (it stays available to screen readers). */
  compact?: boolean;
}

/** Picks the UI language; the choice is saved to localStorage by the language detector. */
export function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const id = useId();

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id} className={compact ? "sr-only" : undefined}>
        {t("language.label")}
      </Label>
      <select
        id={id}
        value={currentLanguage()}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value);
        }}
        className="h-9 rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {SUPPORTED_LANGUAGES.map((code) => (
          <option key={code} value={code} lang={code}>
            {t(`language.${code}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
