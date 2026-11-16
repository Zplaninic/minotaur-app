import { useTranslation } from "react-i18next";
import { currentLanguage, LANGUAGES, setLanguage } from "../lib/i18n";
import { useMessages } from "../lib/messages";
import styles from "./LanguageSwitcher.module.css";

// Each language is named in itself, so it can be found whatever is shown now.
export const LanguageSwitcher = () => {
  const { t } = useMessages();
  // Subscribes to language changes, so the pressed button follows them.
  useTranslation();
  const active = currentLanguage();
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{t("language.label")}</legend>
      {LANGUAGES.map((language) => (
        <button
          key={language}
          type="button"
          lang={language}
          className={styles.option}
          aria-pressed={language === active}
          onClick={() => setLanguage(language)}
        >
          {t(`language.${language}`)}
        </button>
      ))}
    </fieldset>
  );
};
