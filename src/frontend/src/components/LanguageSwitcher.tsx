import { useLanguage } from "../i18n/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <fieldset
      data-ocid="nav.language_switcher.toggle"
      className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 border border-border"
      aria-label="Language / Språk"
    >
      <legend className="sr-only">Language / Språk</legend>
      <button
        type="button"
        onClick={() => setLang("sv")}
        aria-pressed={lang === "sv"}
        className={[
          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-body transition-all",
          lang === "sv"
            ? "bg-background shadow-sm text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground",
        ].join(" ")}
        title="Svenska"
      >
        <span>🇸🇪</span>
        <span>SE</span>
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={[
          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-body transition-all",
          lang === "en"
            ? "bg-background shadow-sm text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground",
        ].join(" ")}
        title="English"
      >
        <span>🇬🇧</span>
        <span>EN</span>
      </button>
    </fieldset>
  );
}
