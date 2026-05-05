import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../../../shared/api/api'
import { setUnauthorizedHandler } from '../../../shared/api/http'
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../../../shared/lib/auth-storage'
import type { UserInfoResponse } from '../../../shared/types/api'

interface AuthContextValue {
  user: UserInfoResponse | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, refreshToken: string, user: UserInfoResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredAuth().token)
  const [user, setUser] = useState<UserInfoResponse | null>(() => getStoredAuth().user)

  const login = useCallback((nextToken: string, refreshToken: string, nextUser: UserInfoResponse) => {
    setToken(nextToken)
    setUser(nextUser)
    setStoredAuth(nextToken, refreshToken, nextUser)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    clearStoredAuth()
  }, [])

  useEffect(() => {
    if (!token) return
    api.me().then(setUser).catch(logout)
  }, [token, logout])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [user, token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
