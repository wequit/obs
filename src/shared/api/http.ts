import axios from 'axios'
import { getStoredAuth, updateStoredRefreshToken, updateStoredToken, updateStoredUser } from '../lib/auth-storage'
import type { UserInfoResponse } from '../types/api'

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? '/backend' : 'https://test-obs.tms.kg')

function coerceMediaRef(ref: unknown): string {
  if (ref == null) return ''
  if (typeof ref === 'string') return ref.trim()
  if (typeof ref === 'number') return Number.isFinite(ref) ? String(ref) : ''
  if (typeof ref === 'object') {
    const o = ref as Record<string, unknown>
    for (const key of ['url', 'path', 'src', 'href', 'galleryUrl', 'thumbGalleryUrl', 'logoUrl'] as const) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return ''
}

export function resolveApiMediaUrl(ref: unknown): string {
  const trimmed = coerceMediaRef(ref)
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const root = baseURL.replace(/\/$/, '')
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${root}${path}`
}

function pickClubGalleryRawPath(ref: unknown, _role: 'preview' | 'view'): string {
  if (ref == null) return ''
  if (typeof ref === 'object') {
    const o = ref as Record<string, unknown>
    const order = ['galleryUrl', 'url', 'path', 'src', 'href', 'thumbGalleryUrl'] as const
    for (const key of order) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
  }
  return coerceMediaRef(ref)
}

export function resolveClubGalleryItemUrl(ref: unknown, role: 'preview' | 'view' = 'view'): string {
  const raw = pickClubGalleryRawPath(ref, role)
  return raw ? resolveApiMediaUrl(raw) : ''
}

export const http = axios.create({
  baseURL,
})

let onUnauthorized: (() => void) | null = null
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const { refreshToken } = getStoredAuth()
    if (!refreshToken) return null

    try {
      isRefreshing = true
      const response = await axios.post<{ token: string; refreshToken: string; user?: UserInfoResponse }>(
        `${baseURL}/auth/refresh`,
        { refreshToken },
      )
      updateStoredToken(response.data.token)
      if (response.data.refreshToken) {
        updateStoredRefreshToken(response.data.refreshToken)
      }
      if (response.data.user) {
        updateStoredUser(response.data.user)
      }
      return response.data.token
    } catch {
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

http.interceptors.request.use((config) => {
  const { token } = getStoredAuth()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status as number | undefined
    const originalRequest = error?.config as { _retry?: boolean; headers?: Record<string, string> } | undefined

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const nextToken = isRefreshing ? await refreshPromise : await refreshAccessToken()

      if (nextToken) {
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${nextToken}`
        return http(originalRequest)
      }

      onUnauthorized?.()
    }

    return Promise.reject(error)
  },
)
