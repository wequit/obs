import { useState, type FormEvent } from 'react'
import { api } from '../../../shared/api/api'
import { Input, PageTitle, PrimaryButton, SurfaceCard } from '../../../shared/ui/primitives'

export function BookingCancelPage() {
  const [token, setToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleCancel = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)
    try {
      const booking = await api.cancelPublicBookingByToken(token)
      setMessage(`Заявка #${booking.id} отменена. Текущий статус: ${booking.status}`)
    } catch {
      setMessage('Не удалось отменить бронь. Проверьте токен.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg">
      <SurfaceCard>
        <PageTitle>Отмена брони</PageTitle>
        <p className="mt-2 text-sm text-slate-600">Вставьте `cancelToken`, который вернулся после создания брони.</p>
        <form onSubmit={handleCancel} className="mt-4 space-y-3">
          <Input required value={token} onChange={(event) => setToken(event.target.value)} placeholder="UUID токен" />
          <PrimaryButton disabled={isLoading} className="w-full bg-rose-600 hover:bg-rose-700">
            {isLoading ? 'Отмена...' : 'Отменить бронь'}
          </PrimaryButton>
          {message && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{message}</p>}
        </form>
      </SurfaceCard>
    </section>
  )
}
