import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../../features/auth'
import { getAppLanguage, setAppLanguage, subscribeLanguageChange, type AppLanguage } from '../../../shared/lib/app-settings'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100'
      : 'text-slate-600 hover:bg-white/80 hover:text-indigo-700'
  }`

export function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth()
  const [language, setLanguage] = useState<AppLanguage>('ru')

  useEffect(() => {
    setLanguage(getAppLanguage())
    return subscribeLanguageChange(setLanguage)
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(129,140,248,0.16),transparent_38%),radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),transparent_32%)] bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-indigo-50/60 to-cyan-50/70 p-2 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link to="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-white/80">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                  OB
                </span>
                <div>
                  <p className="text-base font-semibold leading-tight text-slate-900">Online Booking</p>
                  <p className="text-xs text-slate-500">Быстрое бронирование клубов</p>
                </div>
              </Link>

              <nav className="flex flex-wrap items-center gap-2">
            <NavLink to={isAuthenticated ? '/owner/dashboard' : '/'} className={linkClass}>
              {isAuthenticated ? 'Мои клубы' : 'Клубы'}
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/owner/history" className={linkClass}>
                  История
                </NavLink>
                <NavLink to="/owner/studio" className={linkClass}>
                  Кабинет клуба
                </NavLink>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Выйти
                </button>
              </>
            ) : (
              <NavLink to="/owner/login" className={linkClass}>
                Вход owner
              </NavLink>
            )}
            <div className="ml-1 inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setAppLanguage('ru')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  language === 'ru' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => setAppLanguage('kg')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  language === 'kg' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                KG
              </button>
            </div>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
