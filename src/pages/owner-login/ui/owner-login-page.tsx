import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth'
import { api } from '../../../shared/api/api'
import { Input, PageTitle, PrimaryButton, SurfaceCard } from '../../../shared/ui/primitives'

export function OwnerLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await api.loginOwner({ email, password, fcmToken: '' })
      login(response.token, response.refreshToken, response.user)
      navigate('/owner/dashboard')
    } catch {
      setError('Ошибка авторизации. Проверьте email/пароль.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-[72vh] max-w-md items-center">
      <SurfaceCard className="w-full border-indigo-100 shadow-lg shadow-indigo-100/60">
        <PageTitle>Вход владельца</PageTitle>
        <p className="mt-2 text-sm text-slate-600">Авторизация для управления клубами, ресурсами и историей заявок.</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          <Input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Пароль"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
            Показать пароль
          </label>
          <PrimaryButton disabled={isLoading} className="w-full">
            {isLoading ? 'Входим...' : 'Войти'}
          </PrimaryButton>
        </form>
        {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <p className="mt-4 text-sm text-slate-600">
          Нет аккаунта?{' '}
          <Link to="/owner/register" className="font-medium text-indigo-700 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </SurfaceCard>
    </section>
  )
}
