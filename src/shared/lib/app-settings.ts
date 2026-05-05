export type AppLanguage = 'ru' | 'kg'

const LANGUAGE_KEY = 'app_language'
const LANGUAGE_EVENT = 'app-language-changed'

export function getAppLanguage(): AppLanguage {
  const value = localStorage.getItem(LANGUAGE_KEY)
  return value === 'kg' ? 'kg' : 'ru'
}

export function setAppLanguage(language: AppLanguage) {
  localStorage.setItem(LANGUAGE_KEY, language)
  window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: language }))
}

export function subscribeLanguageChange(listener: (language: AppLanguage) => void) {
  const handler = (event: Event) => {
    const custom = event as CustomEvent<AppLanguage>
    listener(custom.detail ?? getAppLanguage())
  }
  window.addEventListener(LANGUAGE_EVENT, handler)
  return () => window.removeEventListener(LANGUAGE_EVENT, handler)
}
