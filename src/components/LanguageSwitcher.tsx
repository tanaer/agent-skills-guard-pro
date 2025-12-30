import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded font-mono text-sm transition-all duration-200 border border-border text-terminal-cyan hover:border-terminal-cyan hover:bg-terminal-cyan/10 hover:text-glow"
      title="Switch Language / 切换语言"
    >
      <Languages className="w-4 h-4" />
      <span className="font-medium">
        {currentLang === 'zh' ? (
          <>
            <span className="text-terminal-cyan">{t('language.zh')}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-muted-foreground">{t('language.en')}</span>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">{t('language.zh')}</span>
            <span className="text-muted-foreground mx-1">/</span>
            <span className="text-terminal-cyan">{t('language.en')}</span>
          </>
        )}
      </span>
    </button>
  );
}
