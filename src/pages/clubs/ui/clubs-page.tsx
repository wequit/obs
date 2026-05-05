import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../shared/api/api'
import type { ClubResponse } from '../../../shared/types/api'
import { buildClubPhotoSlides, ImageLightbox, PhotoCarousel } from '../../../shared/ui/gallery'
import { Input, PageTitle, PrimaryButton, SurfaceCard } from '../../../shared/ui/primitives'

function truncateText(text: string, max = 140) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

export function ClubsPage() {
  const PAGE_SIZE = 12
  const [clubs, setClubs] = useState<ClubResponse[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | ClubResponse['status']>('ALL')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoViewer, setPhotoViewer] = useState<{ images: string[]; index: number; alt: string } | null>(null)

  const debouncedSearch = useDebouncedValue(search, 350)

  useEffect(() => {
    setIsLoading(true)
    api
      .getPublicClubs({
        page,
        size: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      })
      .then((data) => {
        setError(null)
        setClubs(data.content)
        setTotalElements(data.totalElements)
        setTotalPages(Math.max(1, data.totalPages))
        setHasLoadedOnce(true)
      })
      .catch(() => setError('Не удалось загрузить список клубов'))
      .finally(() => setIsLoading(false))
  }, [page, debouncedSearch, statusFilter])

  const activeCount = clubs.filter((club) => club.status === 'ACTIVE').length
  const inactiveCount = clubs.length - activeCount

  if (isLoading && !hasLoadedOnce) return <p className="text-slate-600">Загрузка клубов...</p>
  if (error && !hasLoadedOnce) return <p className="text-rose-600">{error}</p>

  return (
    <section className="space-y-8 pb-6">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-100">Public booking</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">Клубы для моментальной брони</h1>
            <p className="mt-3 max-w-2xl text-sm text-indigo-50 sm:text-base">
              Выбирайте клуб, проверяйте статус и переходите к бронированию в пару кликов. Всё в одном окне без лишних шагов.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium sm:text-sm">
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1">Без регистрации</span>
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1">Обновление статуса онлайн</span>
              <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1">Бронь 24/7</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-indigo-100">Всего клубов</p>
              <p className="mt-1 text-2xl font-semibold">{totalElements}</p>
            </div>
            <div className="rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-indigo-100">Активных на странице</p>
              <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-indigo-100">Недоступно на странице</p>
              <p className="mt-1 text-2xl font-semibold">{inactiveCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <PageTitle>Выберите клуб</PageTitle>
        <p className="max-w-3xl text-slate-600">Найдите площадку по району, названию или опишите запрос в поиске ниже.</p>
      </div>

      <SurfaceCard className="space-y-4 border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
            placeholder="Поиск: название, адрес, описание..."
            className="md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'ALL' | ClubResponse['status'])
              setPage(0)
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          >
            <option value="ALL">Все статусы</option>
            <option value="ACTIVE">Только ACTIVE</option>
            <option value="INACTIVE">Только INACTIVE</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 p-3 text-sm">
          <p className="text-slate-600">
            Найдено клубов: <span className="font-semibold text-slate-900">{totalElements}</span>
          </p>
          <div className="flex items-center gap-3">
            {error && hasLoadedOnce && <span className="text-xs font-medium text-rose-600">{error}</span>}
            {isLoading && hasLoadedOnce && <span className="text-xs font-medium text-slate-500">Обновляем…</span>}
            {!isLoading && hasLoadedOnce && debouncedSearch.trim() !== search.trim() && (
              <span className="text-xs font-medium text-slate-500">Печатаем…</span>
            )}
          </div>
          <div className="inline-flex flex-wrap gap-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">Быстрая бронь</span>
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">Актуальные статусы</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Онлайн 24/7</span>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => {
          const slides = buildClubPhotoSlides(club)
          return (
            <SurfaceCard
              key={club.id}
              className="group flex h-full flex-col overflow-hidden border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-100"
            >
              {slides.length > 0 ? (
                <PhotoCarousel
                  slides={slides}
                  alt={club.name}
                  variant="compact"
                  className="-mx-5 -mt-5 mb-4"
                  onPhotoClick={(i) =>
                    setPhotoViewer({ images: slides.map((s) => s.full), index: i, alt: club.name })
                  }
                />
              ) : (
                <div className="-mx-5 -mt-5 mb-4 rounded-t-2xl bg-gradient-to-br from-slate-100 to-slate-200 px-5 py-8">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Фото отсутствует</p>
                  <p className="mt-1 text-sm text-slate-600">Добавьте изображение, чтобы карточка стала заметнее.</p>
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{club.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    club.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {club.status}
                </span>
              </div>
              <p
                className="mt-2 grow text-sm leading-6 text-slate-600"
                title={club.description ? club.description : undefined}
              >
                {club.description ? truncateText(club.description) : 'Описание отсутствует'}
              </p>
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{club.address}</p>
              <p className="mt-2 text-sm text-slate-500">{club.phone}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-indigo-50 px-2 py-1 text-indigo-700">Номер клуба: #{club.id}</div>
                <div className="rounded-lg bg-cyan-50 px-2 py-1 text-cyan-700">Онлайн бронирование</div>
              </div>
              <Link to={`/clubs/${club.id}`} className="mt-4 inline-block">
                <PrimaryButton className="w-full">Открыть клуб</PrimaryButton>
              </Link>
            </SurfaceCard>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-sm text-slate-600">
          Страница <span className="font-semibold text-slate-900">{page + 1}</span> из{' '}
          <span className="font-semibold text-slate-900">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={page === 0 || (isLoading && !hasLoadedOnce)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={page >= totalPages - 1 || (isLoading && !hasLoadedOnce)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      </div>

      <ImageLightbox
        open={photoViewer != null}
        images={photoViewer?.images ?? []}
        initialIndex={photoViewer?.index ?? 0}
        alt={photoViewer?.alt ?? ''}
        onClose={() => setPhotoViewer(null)}
      />

      {clubs.length === 0 && (
        <SurfaceCard className="border border-amber-200 bg-amber-50/40 text-center">
          <p className="text-slate-700">По вашему фильтру ничего не найдено.</p>
          <p className="mt-1 text-sm text-slate-500">Попробуйте очистить поиск или выбрать другой статус.</p>
        </SurfaceCard>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Почему это удобно</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Без регистрации</p>
            <p className="mt-1 text-sm text-slate-600">Клиент может забронировать первую услугу без аккаунта.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Прозрачный статус</p>
            <p className="mt-1 text-sm text-slate-600">Активность клуба видна сразу в карточке и фильтре.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Быстрый переход</p>
            <p className="mt-1 text-sm text-slate-600">После выбора клуба пользователь сразу попадает к форме брони.</p>
          </div>
        </div>
      </section>
    </section>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
