import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../../shared/api/api'
import type { BookingRequestCreate, ClubResponse, ResourceResponse } from '../../../shared/types/api'
import { buildClubPhotoSlides, ImageLightbox, PhotoCarousel } from '../../../shared/ui/gallery'
import { Input, PageTitle, PrimaryButton, SurfaceCard, Textarea } from '../../../shared/ui/primitives'

const now = new Date()
const plusHour = new Date(Date.now() + 60 * 60 * 1000)

function formatToInputDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toApiDateTime(date: Date) {
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0')
  const yyyy = date.getFullYear()
  const mm = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const min = pad(date.getMinutes())
  const ss = pad(date.getSeconds())

  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const offH = pad(Math.floor(Math.abs(offsetMinutes) / 60))
  const offM = pad(Math.abs(offsetMinutes) % 60)

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${sign}${offH}:${offM}`
}

function normalizeBookingRange(startInput: string, endInput: string) {
  const minStartMs = Date.now() + 5 * 60 * 1000
  const parsedStartMs = new Date(startInput).getTime()
  const safeStartMs = Number.isFinite(parsedStartMs) ? Math.max(parsedStartMs, minStartMs) : minStartMs

  const parsedEndMs = new Date(endInput).getTime()
  // Backend rule: duration must be between 1 and 4 hours.
  const minEndMs = safeStartMs + 60 * 60 * 1000
  const maxEndMs = safeStartMs + 4 * 60 * 60 * 1000
  const fallbackEndMs = safeStartMs + 60 * 60 * 1000
  const rawEndMs = Number.isFinite(parsedEndMs) ? parsedEndMs : fallbackEndMs
  const safeEndMs = Math.min(Math.max(rawEndMs, minEndMs), maxEndMs)

  return {
    start: new Date(safeStartMs),
    end: new Date(safeEndMs),
  }
}

function truncateText(text: string, max = 240) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, '').trim()
}

export function ClubDetailsPage() {
  const { clubId } = useParams()
  const parsedClubId = Number(clubId)

  const [club, setClub] = useState<ClubResponse | null>(null)
  const [resources, setResources] = useState<ResourceResponse[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [photoViewer, setPhotoViewer] = useState<{ images: string[]; index: number } | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const [form, setForm] = useState<BookingRequestCreate>({
    customerName: '',
    customerPhone: '',
    resourceId: 0,
    startTime: formatToInputDateTime(now),
    endTime: formatToInputDateTime(plusHour),
    comment: '',
  })

  useEffect(() => {
    if (!parsedClubId) return

    Promise.all([api.getPublicClubById(parsedClubId), api.getPublicResourcesByClub(parsedClubId)])
      .then(([clubData, resourcesData]) => {
        setClub(clubData)
        setResources(resourcesData)
        if (resourcesData.length > 0) {
          setForm((prev) => ({ ...prev, resourceId: resourcesData[0].id }))
        }
      })
      .finally(() => setIsLoading(false))
  }, [parsedClubId])

  useEffect(() => {
    if (!parsedClubId || !form.startTime || !form.endTime) return

    const normalized = normalizeBookingRange(form.startTime, form.endTime)
    const startIso = toApiDateTime(normalized.start)
    const endIso = toApiDateTime(normalized.end)

    api
      .getPublicResourcesAvailable(parsedClubId, startIso, endIso)
      .then((availableResources) => {
        setAvailabilityError(null)
        setResources(availableResources)
        setForm((prev) => {
          if (availableResources.length === 0) return { ...prev, resourceId: 0 }
          const hasSelected = availableResources.some((resource) => resource.id === Number(prev.resourceId))
          return hasSelected ? prev : { ...prev, resourceId: availableResources[0].id }
        })
      })
      .catch((err: unknown) => {
        const message =
          typeof err === 'object' && err != null
            ? ((err as { response?: { data?: { message?: unknown } } }).response?.data?.message as unknown)
            : undefined
        setAvailabilityError(
          typeof message === 'string' && message.trim()
            ? message
            : 'Не удалось получить доступные ресурсы по выбранному времени. Попробуйте другой интервал.',
        )
      })
  }, [parsedClubId, form.startTime, form.endTime])

  const selectedResource = useMemo(
    () => resources.find((resource) => resource.id === Number(form.resourceId)),
    [resources, form.resourceId],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!parsedClubId) return

    setIsSubmitting(true)
    setMessage(null)
    try {
      const normalized = normalizeBookingRange(form.startTime, form.endTime)
      const customerName = form.customerName.trim()
      const customerPhone = normalizePhone(form.customerPhone)
      if (customerName.length < 2) {
        setMessage('Имя слишком короткое (минимум 2 символа).')
        return
      }
      if (!/^\+?\d{8,15}$/.test(customerPhone)) {
        setMessage('Телефон указан некорректно. Используйте формат +996XXXXXXXXX или только цифры (8–15).')
        return
      }
      const payload: BookingRequestCreate = {
        ...form,
        customerName,
        customerPhone,
        startTime: toApiDateTime(normalized.start),
        endTime: toApiDateTime(normalized.end),
        comment: form.comment?.trim() ? form.comment.trim() : undefined,
      }
      const created = await api.createPublicBookingRequest(parsedClubId, payload)
      setMessage(`Бронь создана. Статус: ${created.status}. Токен отмены: ${created.cancelToken ?? 'не выдан'}`)
    } catch (err: unknown) {
      const serverMessage =
        typeof err === 'object' && err != null
          ? ((err as { response?: { data?: { message?: unknown } } }).response?.data?.message as unknown)
          : undefined
      setMessage(
        typeof serverMessage === 'string' && serverMessage.trim()
          ? serverMessage
          : 'Не удалось создать бронь. Проверьте данные и попробуйте снова.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <p className="text-slate-600">Загрузка клуба...</p>
  if (!club) return <p className="text-rose-600">Клуб не найден</p>

  const slides = buildClubPhotoSlides(club)
  const coverImage = slides[0]?.full || ''

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-200">
        {coverImage ? (
          <img src={coverImage} alt={club.name} className="absolute inset-0 h-full w-full object-cover opacity-30" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-700/80 to-cyan-500/70" />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-100">Карточка клуба</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{club.name}</h1>
              <p className="mt-3 text-sm text-indigo-50 sm:text-base" title={club.description ? club.description : undefined}>
                {club.description ? truncateText(club.description) : 'Описание отсутствует'}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                club.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {club.status}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-indigo-100">Адрес</p>
              <p className="mt-1 text-sm">{club.address}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-indigo-100">Телефон</p>
              <p className="mt-1 text-sm">{club.phone}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-indigo-100">Доступных ресурсов</p>
              <p className="mt-1 text-sm font-semibold">{resources.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard className="space-y-4 border border-slate-200/80 bg-white">
          <PageTitle>Галерея и ресурсы</PageTitle>
          {slides.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Фото клуба</h2>
              <p className="text-xs text-slate-500">Листайте фото свайпом или стрелками; нажмите на кадр, чтобы открыть крупно.</p>
              <PhotoCarousel
                slides={slides}
                alt={club.name}
                cornerClass="rounded-xl"
                className="overflow-hidden rounded-xl ring-1 ring-slate-200"
                onPhotoClick={(i) => setPhotoViewer({ images: slides.map((s) => s.full), index: i })}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">У клуба пока нет фотографий в галерее.</p>
          )}

          <h2 className="pt-2 text-lg font-semibold text-slate-900">Ресурсы для брони</h2>
          <ul className="space-y-2">
            {resources.map((resource) => (
              <li key={resource.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="font-medium text-slate-900">
                  {resource.name} #{resource.number}
                </div>
                <div className="text-slate-600">
                  {resource.type} • {resource.status}
                  {resource.pricePerHour ? ` • ${resource.pricePerHour} / час` : ''}
                </div>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard className="relative z-10 border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60">
          <form onSubmit={handleSubmit} className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Бронирование без авторизации</h2>
            <p className="text-sm text-slate-600">Заполните форму и отправьте заявку. Подтверждение придёт сразу в статусе брони.</p>
          <Input
            required
            value={form.customerName}
            onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
            placeholder="Ваше имя"
          />
          <Input
            required
            value={form.customerPhone}
            onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
            placeholder="Телефон"
          />
          <div className="relative z-20">
            {resources.length > 0 ? (
              <>
                <select
                  value={form.resourceId}
                  onChange={(event) => setForm((prev) => ({ ...prev, resourceId: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                >
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name} #{resource.number}
                    </option>
                  ))}
                </select>
                {selectedResource && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <p className="font-medium text-slate-900">
                      Выбран ресурс: {selectedResource.name} #{selectedResource.number}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {selectedResource.type} • {selectedResource.status}
                      {selectedResource.pricePerHour ? ` • ${selectedResource.pricePerHour} / час` : ''}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                В этом клубе пока нет доступных ресурсов для бронирования.
              </div>
            )}
          </div>
          <Input
            type="datetime-local"
            value={form.startTime}
            onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
          />
          <Input
            type="datetime-local"
            value={form.endTime}
            onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
          />
          {availabilityError && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{availabilityError}</p>}
          <Textarea
            value={form.comment}
            onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
            className="h-24"
            placeholder="Комментарий (необязательно)"
          />
          <PrimaryButton type="submit" disabled={isSubmitting || !selectedResource} className="w-full">
            {isSubmitting ? 'Создание...' : 'Забронировать'}
          </PrimaryButton>
            {message && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          </form>
        </SurfaceCard>
      </div>

      <ImageLightbox
        open={photoViewer != null}
        images={photoViewer?.images ?? []}
        initialIndex={photoViewer?.index ?? 0}
        alt={club.name}
        onClose={() => setPhotoViewer(null)}
      />
    </section>
  )
}
