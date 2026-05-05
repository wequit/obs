import { useEffect, useMemo, useState } from 'react'
import { api } from '../../../shared/api/api'
import { resolveApiMediaUrl, resolveClubGalleryItemUrl } from '../../../shared/api/http'
import { Input, PageTitle, SurfaceCard, Textarea } from '../../../shared/ui/primitives'
import type {
  BookingRequestDto,
  BookingStatus,
  ClubCreateRequest,
  ClubResponse,
  ClubWorkingHoursRequest,
  ResourceCreateRequest,
  ResourceResponse,
  ResourceType,
  ResourceUpdateRequest,
} from '../../../shared/types/api'

const resourceTypeOptions: { value: ResourceType; label: string }[] = [
  { value: 'BILLIARD', label: 'Бильярд' },
  { value: 'TABLE_TENNIS', label: 'Настольный теннис' },
  { value: 'PLAYSTATION', label: 'PlayStation' },
  { value: 'VIP_ROOM', label: 'VIP комната' },
]

function toTimeString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const o = value as { hour?: unknown; minute?: unknown }
    const hour = typeof o.hour === 'number' ? o.hour : Number(o.hour)
    const minute = typeof o.minute === 'number' ? o.minute : Number(o.minute)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
    const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0')
    return `${pad(hour)}:${pad(minute)}`
  }
  return null
}

function createDefaultWorkingHours(): ClubWorkingHoursRequest[] {
  return [
    { dayOfWeek: 1, openTime: '11:00', closeTime: '21:00', isClosed: false },
    { dayOfWeek: 2, openTime: null, closeTime: null, isClosed: true },
    { dayOfWeek: 3, openTime: null, closeTime: null, isClosed: true },
    { dayOfWeek: 4, openTime: null, closeTime: null, isClosed: true },
    { dayOfWeek: 5, openTime: null, closeTime: null, isClosed: true },
    { dayOfWeek: 6, openTime: null, closeTime: null, isClosed: true },
    { dayOfWeek: 7, openTime: '11:00', closeTime: '17:00', isClosed: false },
  ]
}

function coerceWorkingHoursRequest(club: ClubResponse): ClubWorkingHoursRequest[] {
  const raw = club.workingHours ?? []
  const mapped: ClubWorkingHoursRequest[] = raw.map((row) => ({
    dayOfWeek: row.dayOfWeek,
    openTime: row.isClosed ? null : toTimeString(row.openTime),
    closeTime: row.isClosed ? null : toTimeString(row.closeTime),
    isClosed: row.isClosed,
  }))
  return mapped.length > 0 ? mapped : createDefaultWorkingHours()
}

type ClubDraft = ClubCreateRequest

function clubToDraft(club: ClubResponse): ClubDraft {
  return {
    name: club.name ?? '',
    address: club.address ?? '',
    phone: club.phone ?? '',
    description: club.description ?? '',
    logo: undefined,
    gallery: undefined,
    workingHours: coerceWorkingHoursRequest(club),
  }
}

type ResourceDraft = {
  name: string
  number: number
  type: ResourceType
  pricePerHour?: number
  description?: string
}

function resourceToDraft(resource: ResourceResponse): ResourceDraft {
  return {
    name: resource.name ?? '',
    number: resource.number ?? 1,
    type: resource.type,
    pricePerHour: resource.pricePerHour ?? undefined,
    description: resource.description ?? '',
  }
}

function normalizeResourceDraft(draft: ResourceDraft): ResourceCreateRequest {
  return {
    name: draft.name.trim(),
    number: Number(draft.number),
    type: draft.type,
    pricePerHour: draft.pricePerHour == null ? undefined : Number(draft.pricePerHour),
    description: draft.description?.trim() ? draft.description.trim() : undefined,
  }
}

const statusPillClasses: Record<BookingStatus, string> = {
  NEW: 'bg-amber-50 text-amber-700',
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  CANCELED: 'bg-rose-50 text-rose-700',
  COMPLETED: 'bg-slate-200 text-slate-700',
}

export function OwnerClubStudioPage() {
  const [clubs, setClubs] = useState<ClubResponse[]>([])
  const [resources, setResources] = useState<ResourceResponse[]>([])
  const [bookings, setBookings] = useState<BookingRequestDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null)
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | BookingStatus>('ALL')

  const [clubDraft, setClubDraft] = useState<ClubDraft | null>(null)
  const [isEditingClub, setIsEditingClub] = useState(false)
  const [isSavingClub, setIsSavingClub] = useState(false)
  const [clubSaveError, setClubSaveError] = useState<string | null>(null)

  const [newResource, setNewResource] = useState<ResourceDraft>({
    name: '',
    number: 1,
    type: 'BILLIARD',
    pricePerHour: undefined,
    description: '',
  })
  const [resourceActionError, setResourceActionError] = useState<string | null>(null)
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null)
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft | null>(null)
  const [isSavingResource, setIsSavingResource] = useState(false)

  useEffect(() => {
    Promise.all([api.getOwnerClubs(), api.getOwnerBookings()])
      .then(([clubsData, bookingsData]) => {
        setClubs(clubsData)
        setBookings(bookingsData.content)
        if (clubsData.length > 0) {
          setSelectedClubId(clubsData[0].id)
        }
      })
      .catch(() => setError('Не удалось загрузить данные кабинета'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedClubId) return
    api.getOwnerResourcesByClub(selectedClubId).then(setResources).catch(() => setResources([]))
  }, [selectedClubId])

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) ?? null,
    [clubs, selectedClubId],
  )

  useEffect(() => {
    if (!selectedClub) return
    setClubDraft(clubToDraft(selectedClub))
    setIsEditingClub(false)
    setIsSavingClub(false)
    setClubSaveError(null)
    setEditingResourceId(null)
    setResourceDraft(null)
    setResourceActionError(null)
  }, [selectedClub?.id])

  const clubBookings = bookings
    .filter((booking) => booking.clubId === selectedClubId)
    .filter((booking) => (bookingStatusFilter === 'ALL' ? true : booking.status === bookingStatusFilter))

  if (loading) return <p className="text-slate-600">Загрузка кабинета...</p>
  if (error) return <p className="text-rose-600">{error}</p>
  if (!selectedClub) return <p className="text-slate-600">Клубы не найдены</p>

  const studioLogoSrc = resolveApiMediaUrl(selectedClub.logo)

  const reloadClub = async () => {
    const clubId = selectedClubId
    if (!clubId) return
    const updated = await api.getOwnerClubById(clubId)
    setClubs((prev) => prev.map((c) => (c.id === clubId ? updated : c)))
  }

  const handleSaveClub = async () => {
    if (!selectedClubId || !clubDraft) return
    setIsSavingClub(true)
    setClubSaveError(null)
    try {
      const payload: ClubCreateRequest = {
        name: clubDraft.name.trim(),
        address: clubDraft.address.trim(),
        phone: clubDraft.phone.trim(),
        description: clubDraft.description?.trim() ? clubDraft.description.trim() : undefined,
        logo: undefined,
        gallery: undefined,
        workingHours:
          clubDraft.workingHours && clubDraft.workingHours.length > 0 ? clubDraft.workingHours : createDefaultWorkingHours(),
      }
      await api.updateOwnerClub(selectedClubId, payload)
      await reloadClub()
      setIsEditingClub(false)
    } catch {
      setClubSaveError('Не удалось сохранить клуб. Проверьте поля и попробуйте снова.')
    } finally {
      setIsSavingClub(false)
    }
  }

  const startEditResource = (resource: ResourceResponse) => {
    setResourceActionError(null)
    setEditingResourceId(resource.id)
    setResourceDraft(resourceToDraft(resource))
  }

  const cancelEditResource = () => {
    setEditingResourceId(null)
    setResourceDraft(null)
    setResourceActionError(null)
    setIsSavingResource(false)
  }

  const handleSaveResource = async () => {
    if (!selectedClubId || !editingResourceId || !resourceDraft) return
    setIsSavingResource(true)
    setResourceActionError(null)
    try {
      const payload: ResourceUpdateRequest = {
        name: resourceDraft.name.trim(),
        number: Number(resourceDraft.number),
        type: resourceDraft.type,
        pricePerHour: resourceDraft.pricePerHour == null ? undefined : Number(resourceDraft.pricePerHour),
        description: resourceDraft.description?.trim() ? resourceDraft.description.trim() : undefined,
      }
      await api.updateOwnerResource(selectedClubId, editingResourceId, payload)
      await api.getOwnerResourcesByClub(selectedClubId).then(setResources)
      cancelEditResource()
    } catch {
      setResourceActionError('Не удалось сохранить ресурс. Проверьте поля и попробуйте снова.')
    } finally {
      setIsSavingResource(false)
    }
  }

  const handleCreateResource = async () => {
    if (!selectedClubId) return
    setResourceActionError(null)
    setIsSavingResource(true)
    try {
      const payload = normalizeResourceDraft(newResource)
      if (!payload.name) {
        setResourceActionError('Укажите название ресурса.')
        return
      }
      if (!Number.isFinite(payload.number) || payload.number <= 0) {
        setResourceActionError('Номер ресурса должен быть больше 0.')
        return
      }
      await api.createOwnerResource(selectedClubId, payload)
      await api.getOwnerResourcesByClub(selectedClubId).then(setResources)
      setNewResource({ name: '', number: 1, type: 'BILLIARD', pricePerHour: undefined, description: '' })
    } catch {
      setResourceActionError('Не удалось добавить ресурс. Попробуйте позже.')
    } finally {
      setIsSavingResource(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Owner Workspace
        </span>
        <PageTitle>Кабинет владельца клуба</PageTitle>
       
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard className="lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Мои клубы</h2>
          <ul className="mt-3 space-y-2">
            {clubs.map((club) => (
              <li key={club.id}>
                <button
                  type="button"
                  onClick={() => setSelectedClubId(club.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${selectedClubId === club.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                  <div className="font-medium">{club.name}</div>
                  <div className="text-xs opacity-80">ID: {club.id}</div>
                </button>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard className="space-y-4 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{selectedClub.name}</h2>
              <p className="text-sm text-slate-600">Карточка клуба</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedClub.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-700'
                }`}
            >
              {selectedClub.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-700">
              Режим: <span className="font-semibold">{isEditingClub ? 'Редактирование' : 'Просмотр'}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {!isEditingClub ? (
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setIsEditingClub(true)}
                >
                  Редактировать
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isSavingClub}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                    onClick={() => void handleSaveClub()}
                  >
                    {isSavingClub ? 'Сохраняем…' : 'Сохранить'}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingClub}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                    onClick={() => {
                      setClubDraft(clubToDraft(selectedClub))
                      setIsEditingClub(false)
                      setClubSaveError(null)
                    }}
                  >
                    Отмена
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={clubDraft?.name ?? ''}
              onChange={(e) => setClubDraft((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              readOnly={!isEditingClub}
              className={!isEditingClub ? 'bg-slate-50' : ''}
            />
            <Input
              value={clubDraft?.phone ?? ''}
              onChange={(e) => setClubDraft((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
              readOnly={!isEditingClub}
              className={!isEditingClub ? 'bg-slate-50' : ''}
            />
            <Input
              value={clubDraft?.address ?? ''}
              onChange={(e) => setClubDraft((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
              readOnly={!isEditingClub}
              className={`sm:col-span-2 ${!isEditingClub ? 'bg-slate-50' : ''}`}
            />
            <Textarea
              value={clubDraft?.description ?? ''}
              onChange={(e) => setClubDraft((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
              readOnly={!isEditingClub}
              className={`h-24 sm:col-span-2 ${!isEditingClub ? 'bg-slate-50' : ''}`}
            />
          </div>
          {clubSaveError && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{clubSaveError}</p>}
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard className="space-y-3">
          <h3 className="text-xl font-semibold text-slate-900">Медиа клуба</h3>
          <p className="text-sm text-slate-600">Логотип и галерея приходят из API; фото добавляются в кабинете (загрузка файлов).</p>
          {studioLogoSrc ? (
            <img
              src={studioLogoSrc}
              alt=""
              className="max-h-32 rounded-xl border border-slate-100 object-contain"
            />
          ) : (
            <Input value="Логотип отсутствует" readOnly />
          )}
          {(selectedClub.gallery ?? []).some((item) => resolveClubGalleryItemUrl(item, 'preview')) ? (
            <div className="flex flex-wrap gap-2">
              {(selectedClub.gallery ?? []).map((item, index) => {
                const src = resolveClubGalleryItemUrl(item, 'preview')
                if (!src) return null
                return <img key={`${src}-${index}`} src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Галерея пуста.</p>
          )}
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard className="space-y-3">
          <h3 className="text-xl font-semibold text-slate-900">Ресурсы клуба</h3>
          <p className="text-sm text-slate-600">Добавляйте и редактируйте ресурсы для бронирований.</p>

          {resourceActionError && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{resourceActionError}</p>}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Добавить ресурс</p>
              <button
                type="button"
                disabled={isSavingResource}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                onClick={() => void handleCreateResource()}
              >
                {isSavingResource ? 'Сохраняем…' : 'Добавить'}
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                value={newResource.name}
                onChange={(e) => setNewResource((p) => ({ ...p, name: e.target.value }))}
                placeholder="Название"
              />
              <Input
                value={newResource.number}
                onChange={(e) => setNewResource((p) => ({ ...p, number: Number(e.target.value || 0) }))}
                type="number"
                min={1}
                placeholder="Номер"
              />
              <select
                value={newResource.type}
                onChange={(e) => setNewResource((p) => ({ ...p, type: e.target.value as ResourceType }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >
                {resourceTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Input
                value={newResource.pricePerHour ?? ''}
                onChange={(e) => setNewResource((p) => ({ ...p, pricePerHour: Number(e.target.value) }))}
                type="number"
                min={0}
                placeholder="Цена/час (сом)"
              />
              <Textarea
                value={newResource.description ?? ''}
                onChange={(e) => setNewResource((p) => ({ ...p, description: e.target.value }))}
                className="h-20 sm:col-span-2"
                placeholder="Описание (необязательно)"
              />
            </div>
          </div>
          <div className="space-y-2">
            {resources.map((resource) => (
              <div key={resource.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {resource.name} #{resource.number}
                    </div>
                    <div className="text-sm text-slate-600">
                      {resource.type} • {resource.pricePerHour} сом/час
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {resource.status}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => startEditResource(resource)}
                    >
                      Редактировать
                    </button>
                  </div>
                </div>
                {editingResourceId === resource.id && resourceDraft && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">Редактирование ресурса</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isSavingResource}
                          className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                          onClick={() => void handleSaveResource()}
                        >
                          {isSavingResource ? 'Сохраняем…' : 'Сохранить'}
                        </button>
                        <button
                          type="button"
                          disabled={isSavingResource}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          onClick={cancelEditResource}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Input
                        value={resourceDraft.name}
                        onChange={(e) => setResourceDraft((p) => (p ? { ...p, name: e.target.value } : p))}
                      />
                      <Input
                        value={resourceDraft.number}
                        onChange={(e) => setResourceDraft((p) => (p ? { ...p, number: Number(e.target.value || 0) } : p))}
                        type="number"
                        min={1}
                      />
                      <select
                        value={resourceDraft.type}
                        onChange={(e) => setResourceDraft((p) => (p ? { ...p, type: e.target.value as ResourceType } : p))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      >
                        {resourceTypeOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={resourceDraft.pricePerHour ?? ''}
                        onChange={(e) => setResourceDraft((p) => (p ? { ...p, pricePerHour: Number(e.target.value) } : p))}
                        type="number"
                        min={0}
                        placeholder="Цена/час"
                      />
                      <Textarea
                        value={resourceDraft.description ?? ''}
                        onChange={(e) => setResourceDraft((p) => (p ? { ...p, description: e.target.value } : p))}
                        className="h-20 sm:col-span-2"
                        placeholder="Описание"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {resources.length === 0 && <p className="text-sm text-slate-500">Ресурсы не найдены.</p>}
        </SurfaceCard>

        <SurfaceCard className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-900">Заявки на бронирование</h3>
            <select
              value={bookingStatusFilter}
              onChange={(event) => setBookingStatusFilter(event.target.value as 'ALL' | BookingStatus)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="ALL">Все статусы</option>
              <option value="NEW">NEW</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="CANCELED">CANCELED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
          <p className="text-sm text-slate-600">Подтверждайте, завершайте или отменяйте заявки клиентов.</p>
          <div className="space-y-2">
            {clubBookings.map((booking) => (
              <div key={booking.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium text-slate-900">#{booking.id}</div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClasses[booking.status]}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {booking.customerName} ({booking.customerPhone}) • ресурс #{booking.resourceId}
                </div>
              </div>
            ))}
          </div>
          {clubBookings.length === 0 && <p className="text-sm text-slate-500">По выбранному фильтру заявок нет.</p>}
        </SurfaceCard>
      </div>
    </section>
  )
}
