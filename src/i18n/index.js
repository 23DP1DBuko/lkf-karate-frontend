import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import lv from './locales/lv.json'
import ru from './locales/ru.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      lv: { translation: lv },
      ru: { translation: ru },
    },
    lng: localStorage.getItem('language') || 'lv',
    fallbackLng: 'lv',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n