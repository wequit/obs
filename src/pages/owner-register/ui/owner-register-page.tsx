import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../../shared/api/api'
import { Input, PageTitle, PrimaryButton, SurfaceCard } from '../../../shared/ui/primitives'

export function OwnerRegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await api.registerOwner({ name, email, phone, password })
      navigate('/owner/login')
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        setError(error.response?.data?.message ?? 'Не удалось зарегистрироваться. Проверьте данные.')
      } else {
        setError('Не удалось зарегистрироваться. Проверьте данные.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mx-auto flex min-h-[72vh] max-w-md items-center">
      <SurfaceCard className="w-full border-indigo-100 shadow-lg shadow-indigo-100/60">
        <PageTitle>Регистрация владельца</PageTitle>
        <p className="mt-2 text-sm text-slate-600">Создайте аккаунт owner для доступа к управлению клубом.</p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Имя" />
          <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
          <Input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Телефон" />
          <Input
            type={showPassword ? 'text' : 'password'}
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Пароль (минимум 8 символов)"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
            Показать пароль
          </label>
          <PrimaryButton disabled={isLoading} className="w-full">
            {isLoading ? 'Регистрируем...' : 'Создать аккаунт'}
          </PrimaryButton>
        </form>
        {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <p className="mt-4 text-sm text-slate-600">
          Уже есть аккаунт?{' '}
          <Link to="/owner/login" className="font-medium text-indigo-700 hover:underline">
            Войти
          </Link>
        </p>
      </SurfaceCard>
    </section>
  )
}
