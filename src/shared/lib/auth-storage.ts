import type { UserInfoResponse } from '../types/api'

export const OWNER_TOKEN_KEY = 'owner_token'
export const OWNER_REFRESH_TOKEN_KEY = 'owner_refresh_token'
export const OWNER_USER_KEY = 'owner_user'

export interface StoredAuth {
  token: string | null
  refreshToken: string | null
  user: UserInfoResponse | null
}

export function getStoredAuth(): StoredAuth {
  const token = localStorage.getItem(OWNER_TOKEN_KEY)
  const refreshToken = localStorage.getItem(OWNER_REFRESH_TOKEN_KEY)
  const rawUser = localStorage.getItem(OWNER_USER_KEY)

  let user: UserInfoResponse | null = null
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as UserInfoResponse
    } catch {
      user = null
    }
  }

  return { token, refreshToken, user }
}

export function setStoredAuth(token: string, refreshToken: string, user: UserInfoResponse) {
  localStorage.setItem(OWNER_TOKEN_KEY, token)
  localStorage.setItem(OWNER_REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(OWNER_USER_KEY, JSON.stringify(user))
}

export function updateStoredToken(token: string) {
  localStorage.setItem(OWNER_TOKEN_KEY, token)
}

export function updateStoredRefreshToken(refreshToken: string) {
  localStorage.setItem(OWNER_REFRESH_TOKEN_KEY, refreshToken)
}

export function updateStoredUser(user: UserInfoResponse) {
  localStorage.setItem(OWNER_USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth() {
  localStorage.removeItem(OWNER_TOKEN_KEY)
  localStorage.removeItem(OWNER_REFRESH_TOKEN_KEY)
  localStorage.removeItem(OWNER_USER_KEY)
}
