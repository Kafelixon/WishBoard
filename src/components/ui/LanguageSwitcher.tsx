import { useTranslation } from "react-i18next";
import { ChevronDown, Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES, chooseLanguage, currentLanguage, type Language } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  /** A quiet, borderless trigger sized for the header. */
  compact?: boolean;
}

/** Picks the UI language; the choice is saved to localStorage by the language detector. */
export function LanguageSwitcher({ className, compact = false }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const active = currentLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t("language.label")}: ${t(`language.${active}`)}`}
        className={cn(
          "inline-flex cursor-pointer items-center gap-2 rounded-lg pt-[0.2em] text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary [&_svg]:relative [&_svg]:-top-[0.1em] [&_svg]:size-4 [&_svg]:text-muted-foreground",
          compact ? "h-9 px-2 text-sm" : "h-11 border border-input bg-card px-3.5 text-base",
          className,
        )}
      >
        <Globe aria-hidden="true" />
        {t(`language.${active}`)}
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={active}
          onValueChange={(code) => {
            void chooseLanguage(code as Language);
          }}
        >
          {SUPPORTED_LANGUAGES.map((code) => (
            <DropdownMenuRadioItem key={code} value={code} lang={code}>
              {t(`language.${code}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
