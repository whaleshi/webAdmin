const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000')

function getAuthTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('auth_token')
}

async function meFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })

  if (res.status === 401) {
    // 交给调用方处理：比如 clearAuth + 跳转到登录页
    throw new Error('UNAUTHORIZED')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }

  return (await res.json()) as T
}

export type MeAsset = {
  id: string | number
  name: string
  category: string
  resource_url: string
  is_equipped: boolean
}

export type GroupedAssets = Record<string, MeAsset[]>

export async function getMeAssets(token?: string): Promise<GroupedAssets> {
  const t = token ?? getAuthTokenFromStorage()
  if (!t) throw new Error('NO_AUTH_TOKEN')
  return meFetch<GroupedAssets>('/me/assets', t, { method: 'GET' })
}

export async function equipMeAsset(token: string | undefined, assetId: string | number): Promise<unknown> {
  const t = token ?? getAuthTokenFromStorage()
  if (!t) throw new Error('NO_AUTH_TOKEN')
  return meFetch<unknown>('/me/equip', t, {
    method: 'POST',
    body: JSON.stringify({ asset_id: assetId }),
  })
}

