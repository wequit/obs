import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { api } from '../../../shared/api/api'
import type {
  BookingRequestDto,
  ClubCreateRequest,
  ClubResponse,
  ClubStatus,
  ClubWorkingHoursRequest,
  ResourceCreateRequest,
  ResourceType,
} from '../../../shared/types/api'
import { buildClubPhotoSlides, ImageLightbox } from '../../../shared/ui/gallery'
import { Input, PageTitle, PrimaryButton, SurfaceCard, Textarea } from '../../../shared/ui/primitives'

function createDefaultWorkingHours() {
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

function toTimeString(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const o = value as { hour?: unknown; minute?: unknown }
    const hour = typeof o.hour === 'number' ? o.hour : Number(o.hour)
    const minute = typeof o.minute === 'number' ? o.minute : Number(o.minute)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null
    const pad = (n: number) => String(Math.max(0, Math.min(59, Math.floor(n)))).padStart(2, '0')
    return `${pad(hour)}:${pad(minute)}`
  }
  return null
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

const resourceTypeOptions: { value: ResourceType; label: string }[] = [
  { value: 'BILLIARD', label: 'Бильярд' },
  { value: 'TABLE_TENNIS', label: 'Настольный теннис' },
  { value: 'PLAYSTATION', label: 'PlayStation' },
  { value: 'VIP_ROOM', label: 'VIP комната' },
]

type ResourceDraft = {
  name: string
  number: number
  type: ResourceType
  pricePerHour?: number
  description?: string
}

function createEmptyResourceDraft(): ResourceDraft {
  return { name: '', number: 1, type: 'BILLIARD', pricePerHour: undefined, description: '' }
}

function normalizeResourceDraft(draft: ResourceDraft): ResourceCreateRequest | null {
  const name = draft.name.trim()
  if (!name) return null
  const number = Number(draft.number)
  if (!Number.isFinite(number) || number <= 0) return null
  const payload: ResourceCreateRequest = {
    name,
    number,
    type: draft.type,
    pricePerHour:
      draft.pricePerHour == null || draft.pricePerHour === ('' as unknown as number)
        ? undefined
        : Number(draft.pricePerHour),
    description: draft.description?.trim() ? draft.description.trim() : undefined,
  }
  if (payload.pricePerHour != null && (!Number.isFinite(payload.pricePerHour) || payload.pricePerHour < 0)) {
    return null
  }
  return payload
}

export function OwnerDashboardPage() {
  const [clubs, setClubs] = useState<ClubResponse[]>([])
  const [bookings, setBookings] = useState<BookingRequestDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createImages, setCreateImages] = useState<File[]>([])
  const [createResources, setCreateResources] = useState<ResourceDraft[]>([])
  const [newClub, setNewClub] = useState<ClubCreateRequest>({
    name: '',
    address: '',
    phone: '',
    description: '',
    logo: undefined,
    gallery: undefined,
  })

  const [updatingClubId, setUpdatingClubId] = useState<number | null>(null)
  const [listActionError, setListActionError] = useState<string | null>(null)
  const [galleryUploadClubId, setGalleryUploadClubId] = useState<number | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [photoViewer, setPhotoViewer] = useState<{ images: string[]; index: number } | null>(null)

  const [editOpenClubId, setEditOpenClubId] = useState<number | null>(null)
  const [editClub, setEditClub] = useState<ClubCreateRequest | null>(null)
  const [editResourcesToAdd, setEditResourcesToAdd] = useState<ResourceDraft[]>([])
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (editOpenClubId == null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeEditClub()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpenClubId])

  const load = async () => {
    setIsLoading(true)
    try {
      const [clubsData, bookingsData] = await Promise.all([api.getOwnerClubs(), api.getOwnerBookings()])
      setClubs(clubsData)
      setBookings(bookingsData.content)
      setListActionError(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (isLoading) return <p className="text-slate-600">Загрузка кабинета...</p>

  const newBookingsCount = bookings.filter((booking) => booking.status === 'NEW').length

  const resetCreateForm = () => {
    setNewClub({ name: '', description: '', address: '', phone: '' })
    setCreateImages([])
    setCreateResources([])
    setCreateError(null)
    setCreateLoading(false)
    setCreateOpen(false)
  }

  const handleCreateClub = async () => {
    setCreateError(null)
    setCreateLoading(true)
    try {
      const payload: ClubCreateRequest = {
        name: newClub.name.trim(),
        address: newClub.address.trim(),
        phone: newClub.phone.trim(),
        description: newClub.description?.trim() ? newClub.description.trim() : undefined,
        logo: undefined,
        gallery: undefined,
        workingHours: createDefaultWorkingHours(),
      }
      const createdClub = await api.createOwnerClub(payload)
      const resourcePayloads = createResources
        .map(normalizeResourceDraft)
        .filter((item): item is ResourceCreateRequest => item != null)
      for (const resourcePayload of resourcePayloads) {
        await api.createOwnerResource(createdClub.id, resourcePayload)
      }
      if (createImages.length > 0) {
        await api.uploadOwnerClubImages(createdClub.id, createImages)
      }
      resetCreateForm()
      await load()
    } catch {
      setCreateError('Не удалось создать клуб. Проверьте поля и повторите попытку.')
    } finally {
      setCreateLoading(false)
    }
  }

  const openEditClub = (club: ClubResponse) => {
    setEditError(null)
    setEditOpenClubId(club.id)
    setEditResourcesToAdd([])
    setEditClub({
      name: club.name ?? '',
      address: club.address ?? '',
      phone: club.phone ?? '',
      description: club.description ?? '',
      logo: undefined,
      gallery: undefined,
      workingHours: coerceWorkingHoursRequest(club),
    })
  }

  const closeEditClub = () => {
    setEditOpenClubId(null)
    setEditClub(null)
    setEditResourcesToAdd([])
    setEditError(null)
    setEditLoading(false)
  }

  const handleSaveEditClub = async () => {
    if (!editOpenClubId || !editClub) return
    setEditLoading(true)
    setEditError(null)
    try {
      const payload: ClubCreateRequest = {
        name: editClub.name.trim(),
        address: editClub.address.trim(),
        phone: editClub.phone.trim(),
        description: editClub.description?.trim() ? editClub.description.trim() : undefined,
        logo: undefined,
        gallery: undefined,
        workingHours: editClub.workingHours && editClub.workingHours.length > 0 ? editClub.workingHours : createDefaultWorkingHours(),
      }
      await api.updateOwnerClub(editOpenClubId, payload)

      const resourcePayloads = editResourcesToAdd
        .map(normalizeResourceDraft)
        .filter((item): item is ResourceCreateRequest => item != null)
      for (const resourcePayload of resourcePayloads) {
        await api.createOwnerResource(editOpenClubId, resourcePayload)
      }

      closeEditClub()
      await load()
    } catch {
      setEditError('Не удалось сохранить изменения. Проверьте поля и повторите попытку.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleGalleryFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const clubId = galleryUploadClubId
    if (clubId == null) return
    const raw = event.target.files
    const files = raw ? Array.from(raw).slice(0, 1) : []
    event.target.value = ''
    setGalleryUploadClubId(null)
    if (files.length === 0) return
    setUpdatingClubId(clubId)
    try {
      await api.uploadOwnerClubImages(clubId, files)
      await load()
    } catch {
      setListActionError('Не удалось загрузить фото. Попробуйте другой файл или позже.')
    } finally {
      setUpdatingClubId(null)
    }
  }

  const openGalleryPicker = (clubId: number) => {
    setListActionError(null)
    setGalleryUploadClubId(clubId)
    queueMicrotask(() => galleryInputRef.current?.click())
  }

  const handleToggleClubStatus = async (clubId: number, currentStatus: ClubStatus) => {
    const nextStatus: ClubStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setUpdatingClubId(clubId)
    try {
      await api.updateOwnerClubStatus(clubId, nextStatus)
      await load()
    } finally {
      setUpdatingClubId(null)
    }
  }

  return (
    <section className="space-y-6">
      <PageTitle>Кабинет владельца</PageTitle>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-600 to-indigo-500 p-5 text-white shadow-md shadow-indigo-200">
          <p className="text-sm text-indigo-100">Клубов</p>
          <p className="mt-1 text-3xl font-semibold">{clubs.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white shadow-md shadow-slate-300">
          <p className="text-sm text-slate-300">Заявок</p>
          <p className="mt-1 text-3xl font-semibold">{bookings.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-600 to-emerald-500 p-5 text-white shadow-md shadow-emerald-200">
          <p className="text-sm text-emerald-100">Новых заявок</p>
          <p className="mt-1 text-3xl font-semibold">{newBookingsCount}</p>
        </div>
      </div>

      <SurfaceCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Мои клубы</h2>
          <PrimaryButton type="button" className="w-full sm:w-auto" onClick={() => setCreateOpen((v) => !v)}>
            {createOpen ? 'Скрыть форму' : 'Добавить клуб'}
          </PrimaryButton>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleGalleryFilesSelected(e)}
        />

        {listActionError && (
          <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{listActionError}</p>
        )}

        {createOpen && (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                required
                value={newClub.name}
                onChange={(event) => setNewClub((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Название клуба"
              />
              <Input
                required
                value={newClub.phone}
                onChange={(event) => setNewClub((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Телефон"
              />
              <Input
                required
                value={newClub.address}
                onChange={(event) => setNewClub((prev) => ({ ...prev, address: event.target.value }))}
                className="sm:col-span-2"
                placeholder="Адрес"
              />
              <Textarea
                value={newClub.description ?? ''}
                onChange={(event) => setNewClub((prev) => ({ ...prev, description: event.target.value }))}
                className="sm:col-span-2"
                placeholder="Описание (необязательно)"
              />
              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Фото клуба (необязательно)</p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={(event) =>
                    setCreateImages(event.target.files ? Array.from(event.target.files).slice(0, 1) : [])
                  }
                />
                {createImages.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">Выбрано фото: 1</p>
                )}
              </div>

              <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ресурсы клуба (необязательно)</p>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setCreateResources((prev) => [...prev, createEmptyResourceDraft()])}
                  >
                    + Добавить ресурс
                  </button>
                </div>
                {createResources.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {createResources.map((resource, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">Ресурс #{idx + 1}</p>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            onClick={() => setCreateResources((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            Удалить
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Input
                            value={resource.name}
                            onChange={(e) =>
                              setCreateResources((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                              )
                            }
                            placeholder="Название ресурса"
                          />
                          <Input
                            value={resource.number}
                            onChange={(e) =>
                              setCreateResources((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, number: Number(e.target.value || 0) } : r,
                                ),
                              )
                            }
                            placeholder="Номер"
                            type="number"
                            min={1}
                          />
                          <select
                            value={resource.type}
                            onChange={(e) =>
                              setCreateResources((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, type: e.target.value as ResourceType } : r)),
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          >
                            {resourceTypeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={resource.pricePerHour ?? ''}
                            onChange={(e) =>
                              setCreateResources((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, pricePerHour: Number(e.target.value) } : r,
                                ),
                              )
                            }
                            placeholder="Цена за час (сом)"
                            type="number"
                            min={0}
                          />
                          <Textarea
                            value={resource.description ?? ''}
                            onChange={(e) =>
                              setCreateResources((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)),
                              )
                            }
                            className="h-20 sm:col-span-2"
                            placeholder="Описание (необязательно)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Можно добавить ресурсы сразу при создании клуба.</p>
                )}
              </div>
            </div>

            {createError && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{createError}</p>}

            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="button" disabled={createLoading} onClick={() => void handleCreateClub()}>
                {createLoading ? 'Создаём...' : 'Создать'}
              </PrimaryButton>
              <PrimaryButton
                type="button"
                className="bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                disabled={createLoading}
                onClick={resetCreateForm}
              >
                Отмена
              </PrimaryButton>
            </div>
          </div>
        )}

        <ul className="mt-4 space-y-3">
          {clubs.map((club) => {
            const slides = buildClubPhotoSlides(club)
            return (
              <li key={club.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <div className="font-medium text-lg text-slate-900">{club.name}</div>
                      <div className="text-sm text-slate-600">
                        {club.address} • {club.phone}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            club.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {club.status}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Галерея</h3>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingClubId === club.id}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                            onClick={() => openEditClub(club)}
                          >
                            Редактировать
                          </button>
                          <button
                            type="button"
                            disabled={updatingClubId === club.id}
                            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
                            onClick={() => openGalleryPicker(club.id)}
                          >
                            {updatingClubId === club.id ? 'Загрузка...' : 'Добавить фото'}
                          </button>
                        </div>
                      </div>
                      {slides.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                          {slides.map((slide, i) => (
                            <button
                              key={`${slide.full}-${i}`}
                              type="button"
                              className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-2 hover:ring-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                              onClick={() => setPhotoViewer({ images: slides.map((s) => s.full), index: i })}
                            >
                              <img
                                src={slide.preview}
                                alt=""
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Пока без фото. Нажмите «Добавить фото».</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 lg:items-end lg:pt-1">
                    <PrimaryButton
                      type="button"
                      disabled={updatingClubId === club.id}
                      className={
                        club.status === 'ACTIVE'
                          ? 'w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 lg:w-auto'
                          : 'w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 lg:w-auto'
                      }
                      onClick={() => void handleToggleClubStatus(club.id, club.status)}
                    >
                      {updatingClubId === club.id ? '...' : club.status === 'ACTIVE' ? 'Деактивировать' : 'Активировать'}
                    </PrimaryButton>
                  </div>
                </div>
              </li>
            )
          })}
          {clubs.length === 0 && <li className="text-sm text-slate-600">Пока нет ваших клубов.</li>}
        </ul>
      </SurfaceCard>

      <ImageLightbox
        open={photoViewer != null}
        images={photoViewer?.images ?? []}
        initialIndex={photoViewer?.index ?? 0}
        alt="Фото клуба"
        onClose={() => setPhotoViewer(null)}
      />

      {editOpenClubId != null && editClub && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Редактирование клуба"
          onClick={closeEditClub}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <SurfaceCard className="max-h-[85vh] overflow-y-auto border border-indigo-200 bg-white">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Редактирование клуба</h2>
                  <p className="text-sm text-slate-600">ID клуба: {editOpenClubId}</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={closeEditClub}
                  disabled={editLoading}
                >
                  Закрыть
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input
                  value={editClub.name}
                  onChange={(e) => setEditClub((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  placeholder="Название клуба"
                />
                <Input
                  value={editClub.phone}
                  onChange={(e) => setEditClub((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
                  placeholder="Телефон"
                />
                <Input
                  value={editClub.address}
                  onChange={(e) => setEditClub((prev) => (prev ? { ...prev, address: e.target.value } : prev))}
                  className="sm:col-span-2"
                  placeholder="Адрес"
                />
                <Textarea
                  value={editClub.description ?? ''}
                  onChange={(e) => setEditClub((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                  className="h-24 sm:col-span-2"
                  placeholder="Описание (необязательно)"
                />
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Добавить ресурсы</p>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setEditResourcesToAdd((prev) => [...prev, createEmptyResourceDraft()])}
                    disabled={editLoading}
                  >
                    + Добавить ресурс
                  </button>
                </div>
                {editResourcesToAdd.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {editResourcesToAdd.map((resource, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">Новый ресурс #{idx + 1}</p>
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            onClick={() => setEditResourcesToAdd((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={editLoading}
                          >
                            Удалить
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Input
                            value={resource.name}
                            onChange={(e) =>
                              setEditResourcesToAdd((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                              )
                            }
                            placeholder="Название ресурса"
                          />
                          <Input
                            value={resource.number}
                            onChange={(e) =>
                              setEditResourcesToAdd((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, number: Number(e.target.value || 0) } : r)),
                              )
                            }
                            placeholder="Номер"
                            type="number"
                            min={1}
                          />
                          <select
                            value={resource.type}
                            onChange={(e) =>
                              setEditResourcesToAdd((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, type: e.target.value as ResourceType } : r,
                                ),
                              )
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          >
                            {resourceTypeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={resource.pricePerHour ?? ''}
                            onChange={(e) =>
                              setEditResourcesToAdd((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, pricePerHour: Number(e.target.value) } : r,
                                ),
                              )
                            }
                            placeholder="Цена за час (сом)"
                            type="number"
                            min={0}
                          />
                          <Textarea
                            value={resource.description ?? ''}
                            onChange={(e) =>
                              setEditResourcesToAdd((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)),
                              )
                            }
                            className="h-20 sm:col-span-2"
                            placeholder="Описание (необязательно)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Можно быстро добавить новый ресурс, не трогая существующие.</p>
                )}
              </div>

              {editError && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{editError}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                <PrimaryButton type="button" disabled={editLoading} onClick={() => void handleSaveEditClub()}>
                  {editLoading ? 'Сохраняем...' : 'Сохранить'}
                </PrimaryButton>
                <PrimaryButton
                  type="button"
                  className="bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                  disabled={editLoading}
                  onClick={closeEditClub}
                >
                  Отмена
                </PrimaryButton>
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}

      <SurfaceCard>
        <h2 className="text-lg font-semibold text-slate-900">Последние заявки</h2>
        <ul className="mt-3 space-y-2">
          {bookings.map((booking) => (
            <li key={booking.id} className="rounded-xl bg-slate-50 p-3">
              <div className="font-medium">
                #{booking.id} • Ресурс {booking.resourceId} • {booking.status}
              </div>
              <div className="text-sm text-slate-600">
                {booking.customerName} ({booking.customerPhone})
              </div>
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </section>
  )
}
