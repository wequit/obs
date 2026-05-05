import { useEffect, useRef, useState } from 'react'
import { resolveClubGalleryItemUrl } from '../api/http'
import type { ClubResponse } from '../types/api'

export type PhotoSlide = { preview: string; full: string }

export function buildClubPhotoSlides(club: Pick<ClubResponse, 'logo' | 'gallery'>): PhotoSlide[] {
  const refs: unknown[] = []
  if (club.logo) refs.push(club.logo)
  for (const item of club.gallery ?? []) refs.push(item)
  const seen = new Set<string>()
  const out: PhotoSlide[] = []
  for (const ref of refs) {
    const full = resolveClubGalleryItemUrl(ref, 'view')
    if (!full || seen.has(full)) continue
    seen.add(full)
    out.push({
      preview: resolveClubGalleryItemUrl(ref, 'preview') || full,
      full,
    })
  }
  return out
}

type ImageLightboxProps = {
  open: boolean
  images: string[]
  initialIndex: number
  alt: string
  onClose: () => void
}

export function ImageLightbox({ open, images, initialIndex, alt, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    if (open) setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)))
  }, [open, initialIndex, images.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && images.length > 0) {
        setIndex((i) => (i - 1 + images.length) % images.length)
      }
      if (e.key === 'ArrowRight' && images.length > 0) {
        setIndex((i) => (i + 1) % images.length)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, images.length, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || images.length === 0) return null

  const src = images[index]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фото"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        Закрыть
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-3 text-xl text-white backdrop-blur transition hover:bg-white/25 sm:left-4"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => (i - 1 + images.length) % images.length)
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-3 text-xl text-white backdrop-blur transition hover:bg-white/25 sm:right-4"
            onClick={(e) => {
              e.stopPropagation()
              setIndex((i) => (i + 1) % images.length)
            }}
          >
            ›
          </button>
        </>
      )}
      <div className="max-h-[90vh] max-w-full" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={`${alt} — ${index + 1}`} className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" />
        {images.length > 1 && (
          <p className="mt-2 text-center text-sm text-white/80">
            {index + 1} / {images.length}
          </p>
        )}
      </div>
    </div>
  )
}

type PhotoCarouselProps = {
  slides: PhotoSlide[]
  alt: string
  className?: string
  onPhotoClick?: (index: number) => void
  /** compact — низкая полоска для сетки карточек; comfortable — страница клуба */
  variant?: 'compact' | 'comfortable'
  /** Скругление блока с фото (под карточку SurfaceCard или вложенный блок) */
  cornerClass?: string
}

export function PhotoCarousel({
  slides,
  alt,
  className = '',
  onPhotoClick,
  variant = 'comfortable',
  cornerClass = 'rounded-t-2xl',
}: PhotoCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const scrollTo = (i: number) => {
    const el = scrollerRef.current
    if (!el) return
    const next = Math.max(0, Math.min(slides.length - 1, i))
    const w = el.clientWidth
    el.scrollTo({ left: next * w, behavior: 'smooth' })
    setActive(next)
  }

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || slides.length <= 1) return
    const onScroll = () => {
      const w = el.clientWidth || 1
      const i = Math.round(el.scrollLeft / w)
      setActive(Math.max(0, Math.min(slides.length - 1, i)))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [slides.length])

  if (slides.length === 0) return null

  const isCompact = variant === 'compact'

  const slideFrame = isCompact
    ? 'relative h-28 w-full overflow-hidden bg-slate-100 sm:h-32'
    : 'relative aspect-[16/9] w-full max-h-40 overflow-hidden bg-slate-100 sm:max-h-44'

  const slideImg = isCompact
    ? 'h-full w-full object-cover object-center transition duration-300 hover:brightness-[0.97]'
    : 'absolute inset-0 h-full w-full object-cover object-center transition duration-300 hover:brightness-[0.98]'

  if (slides.length === 1) {
    return (
      <div className={className}>
        <button
          type="button"
          className={`block w-full overflow-hidden ${cornerClass} text-left outline-none ring-indigo-400 focus-visible:ring-2`}
          onClick={() => onPhotoClick?.(0)}
        >
          <div className={slideFrame}>
            <img src={slides[0].preview} alt={alt} className={slideImg} />
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollerRef}
        className={`flex overflow-x-auto scroll-smooth ${cornerClass} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory`}
      >
        {slides.map((slide, i) => (
          <div key={`${slide.full}-${i}`} className="min-w-full shrink-0 snap-center">
            <button
              type="button"
              className="block w-full text-left outline-none ring-indigo-400 focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={() => onPhotoClick?.(i)}
            >
              <div className={slideFrame}>
                <img src={slide.preview} alt="" className={slideImg} />
              </div>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label="Предыдущий слайд"
        className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-black/45 p-2 text-lg text-white shadow-md backdrop-blur-sm transition hover:bg-black/60"
        onClick={() => scrollTo(active - 1)}
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Следующий слайд"
        className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-black/45 p-2 text-lg text-white shadow-md backdrop-blur-sm transition hover:bg-black/60"
        onClick={() => scrollTo(active + 1)}
      >
        ›
      </button>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Показать слайд ${i + 1}`}
            className={`h-1.5 rounded-full transition ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/65 hover:bg-white/90'}`}
            onClick={(e) => {
              e.stopPropagation()
              scrollTo(i)
            }}
          />
        ))}
      </div>
    </div>
  )
}
