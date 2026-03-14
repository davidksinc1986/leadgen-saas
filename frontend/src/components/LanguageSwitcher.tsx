import { useI18n } from "../i18n/I18nProvider";
import type { Locale } from "../i18n/translations";

export default function LanguageSwitcher() {
  const { locale, setLocale, localeLabels } = useI18n();

  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} style={{ minWidth: 130 }}>
      {Object.entries(localeLabels).map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}
