import i18n, { type BackendModule, type ParseKeys } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";

export const SUPPORTED_LANGUAGES = ["en", "pl"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "wishboard.language";

// English is bundled (it's also the fallback); other languages are fetched only when active.
export const resources = { en: { translation: en } } as const;

const lazyLocales: BackendModule = {
  type: "backend",
  init: () => undefined,
  read(language, _namespace, callback) {
    if (language !== "pl") {
      callback(null, {});
      return;
    }
    import("@/locales/pl.json").then(
      (strings) => {
        callback(null, strings.default);
      },
      (error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)), null);
      },
    );
  },
};

/** Keeps `<html lang>` in step with the UI language (screen readers, hyphenation, spellcheck). */
const syncDocumentLanguage = () => {
  // The resolved code ("pl"), not the detected one ("pl-PL") that languageChanged reports.
  document.documentElement.lang = i18n.resolvedLanguage ?? "en";
};

void i18n
  .use(LanguageDetector)
  .use(lazyLocales)
  .use(initReactI18next)
  .init({
    resources,
    // Fetch languages missing from `resources` through lazyLocales.
    partialBundledLanguages: true,
    supportedLngs: SUPPORTED_LANGUAGES,
    // "pl-PL" and friends resolve to "pl".
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      // An explicit choice (saved by the switcher) wins over the browser's language.
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      // Don't save the auto-detected language, so a changed browser language is picked up next visit.
      caches: [],
    },
  });

syncDocumentLanguage();
i18n.on("languageChanged", syncDocumentLanguage);

/** Switches the UI language and remembers it as the user's explicit choice. */
export const chooseLanguage = async (language: Language) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Private mode or full storage: the choice just lasts for this visit.
  }
  await i18n.changeLanguage(language);
};

/** The active UI language, narrowed to one we ship. */
export const currentLanguage = (): Language => {
  const language = i18n.resolvedLanguage;
  return SUPPORTED_LANGUAGES.find((supported) => supported === language) ?? "en";
};

export default i18n;

/** A translation key that exists in the English file. */
export type TKey = Exclude<ParseKeys, "">;
