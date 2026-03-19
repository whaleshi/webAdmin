import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type AuthState = {
  token: string | null
  // 保存后端原始返回，字段结构随后端可能会有变化
  raw: any | null
}

type AuthContextValue = {
  auth: AuthState
  setAuthFromBackendResponse: (data: any) => void
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    // 只持久化 token：后端鉴权用
    // key 按你的示例：auth_token
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('auth_token') : null
    return { token, raw: null }
  })

  const setAuthFromBackendResponse = (data: any) => {
    const token: string | null =
      (data?.token as string | undefined) ??
      (data?.jwt as string | undefined) ??
      (data?.access_token as string | undefined) ??
      null
    if (typeof window !== 'undefined') {
      if (token) window.localStorage.setItem('auth_token', token)
      else window.localStorage.removeItem('auth_token')
    }
    setAuth({ token, raw: data })
  }

  const clearAuth = () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem('auth_token')
    setAuth({ token: null, raw: null })
  }

  const value = useMemo(
    () => ({ auth, setAuthFromBackendResponse, clearAuth }),
    [auth.token, auth.raw],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider />')
  return v
}

