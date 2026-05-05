import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../shared/api/api'
import type { BookingRequestDto, BookingStatus } from '../../../shared/types/api'
import { PageTitle, SurfaceCard } from '../../../shared/ui/primitives'

const filterOptions: Array<{ label: string; value: 'ALL' | BookingStatus }> = [
  { label: 'Все', value: 'ALL' },
  { label: 'Новые', value: 'NEW' },
  { label: 'Подтверждено', value: 'CONFIRMED' },
  { label: 'Отменено', value: 'CANCELED' },
  { label: 'Завершено', value: 'COMPLETED' },
]

const statusStyles: Record<BookingStatus, string> = {
  NEW: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  CANCELED: 'bg-rose-50 text-rose-700',
  COMPLETED: 'bg-slate-200 text-slate-700',
}

export function OwnerHistoryPage() {
  const [items, setItems] = useState<BookingRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'ALL' | BookingStatus>('ALL')

  useEffect(() => {
    api.getOwnerBookings().then((response) => setItems(response.content)).finally(() => setLoading(false))
  }, [])

  const filteredItems = useMemo(
    () => (status === 'ALL' ? items : items.filter((item) => item.status === status)),
    [items, status],
  )

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <PageTitle>История бронирований</PageTitle>
      </div>

      <SurfaceCard className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                status === option.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </SurfaceCard>

      <div className="grid gap-3">
        {loading ? (
          <p className="text-slate-600">Загрузка истории...</p>
        ) : (
          filteredItems.map((booking) => (
            <SurfaceCard key={booking.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold text-slate-900">Заявка #{booking.id}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[booking.status]}`}>
                  {booking.status}
                </span>
              </div>
              <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p>Клиент: {booking.customerName}</p>
                <p>Телефон: {booking.customerPhone}</p>
                <p>Ресурс ID: {booking.resourceId}</p>
                <p>Клуб ID: {booking.clubId}</p>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(booking.startTime).toLocaleString()} - {new Date(booking.endTime).toLocaleString()}
              </div>
            </SurfaceCard>
          ))
        )}
      </div>
    </section>
  )
}
