import i18n, { type ParseKeys } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import pl from "@/locales/pl.json";

export const SUPPORTED_LANGUAGES = ["en", "pl"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "wishboard.language";

export const resources = { en: { translation: en }, pl: { translation: pl } } as const;

/** Keeps `<html lang>` in step with the UI language (screen readers, hyphenation, spellcheck). */
const syncDocumentLanguage = (language: string) => {
  document.documentElement.lang = language;
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES,
    // "pl-PL" and friends resolve to "pl".
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      // An explicit choice (saved by the switcher) wins over the browser's language.
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

syncDocumentLanguage(i18n.resolvedLanguage ?? "en");
i18n.on("languageChanged", syncDocumentLanguage);

/** The active UI language, narrowed to one we ship. */
export const currentLanguage = (): Language => {
  const language = i18n.resolvedLanguage;
  return SUPPORTED_LANGUAGES.find((supported) => supported === language) ?? "en";
};

export default i18n;

/** A translation key that exists in the English file. */
export type TKey = Exclude<ParseKeys, "">;
