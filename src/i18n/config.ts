import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

// 从 localStorage 获取保存的语言，默认中文
const savedLanguage = localStorage.getItem('language') || 'zh';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en }
    },
    lng: savedLanguage,
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false // React 已经处理了 XSS
    }
  });

export default i18n;
