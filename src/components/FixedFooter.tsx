import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { BNB } from '../icons/BNB'
import { Ethereum } from '../icons/Ethereum'
import { Solana } from '../icons/Solana'

type PriceRow = {
  usd: number
}

export function FixedFooter({ themeColors }: { themeColors: string[] }) {
  const [data, setData] = useState<{
    bnb: PriceRow
    eth: PriceRow
    sol: PriceRow
    updatedAt: number
  } | null>(null)
  const [city, setCity] = useState<string>('')
  const [locationQuery, setLocationQuery] = useState<string>('') // "lat,lon" or city
  const [weather, setWeather] = useState<string>('-')
  const [now, setNow] = useState(() => Date.now())

  const accent = useMemo(() => themeColors.join(', '), [themeColors])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()

    let cooldownUntil = 0

    const load = async () => {
      const now = Date.now()
      if (now < cooldownUntil) return
      try {
        const fetchAvg = async (symbol: string) => {
          const res = await fetch(`https://api.binance.com/api/v3/avgPrice?symbol=${symbol}`, {
            signal: controller.signal,
          })
          if (res.status === 429) {
            cooldownUntil = Date.now() + 120_000
            throw new Error('Rate limited')
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const json = (await res.json()) as { price?: string }
          const n = Number(json.price)
          if (!Number.isFinite(n)) throw new Error('Bad response')
          return n
        }

        const [bnbUsd, ethUsd, solUsd] = await Promise.all([
          fetchAvg('BNBUSDT'),
          fetchAvg('ETHUSDT'),
          fetchAvg('SOLUSDT'),
        ])

        if (!alive) return
        setData({
          bnb: {
            usd: bnbUsd,
          },
          eth: {
            usd: ethUsd,
          },
          sol: {
            usd: solUsd,
          },
          updatedAt: Date.now(),
        })
      } catch (e) {
        if (!alive) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        // 静默失败：保留占位符或旧数据
      }
    }

    load()
    const t = window.setInterval(load, 300_000)
    return () => {
      alive = false
      controller.abort()
      window.clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()

    const load = async () => {
      let geoQuery: string | null = null
      // 1) 优先浏览器定位（需要用户允许）
      if (navigator.geolocation) {
        try {
          if (!window.isSecureContext) {
            console.warn('[geo] skipped: not a secure context (HTTPS required)')
          } else {
            console.log('[geo] requesting current position...')
          }
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 6000,
              maximumAge: 10 * 60 * 1000,
            }),
          )
          if (!alive) return
          const { latitude, longitude } = pos.coords
          console.log('[geo] success:', { latitude, longitude })
          geoQuery = `${latitude.toFixed(3)},${longitude.toFixed(3)}`
          setLocationQuery(geoQuery)

          // 用经纬度反查行政区（比 IP 更准，避免显示香港/出口节点）
          try {
            const r = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`,
              { signal: controller.signal },
            )
            if (r.ok) {
              const j = (await r.json()) as {
                principalSubdivision?: string
                city?: string
                locality?: string
                localityInfo?: { administrative?: Array<{ name?: string; order?: number; adminLevel?: number }> }
              }
              // locality 通常更接近区县；principalSubdivision 是省/直辖市
              const lvl1 = (j.principalSubdivision ?? '').trim()
              const lvl2 = (j.locality ?? j.city ?? '').trim()
              const pretty =
                lvl1 && lvl2 && lvl1 !== lvl2 ? `${lvl1}·${lvl2}` : (lvl2 || lvl1 || '')
              if (pretty && alive) setCity(pretty)
            }
          } catch {
            // 静默失败：保留现有 city（可能来自 IP 或默认）
          }
        } catch (e) {
          console.warn('[geo] failed:', e)
          // 用户拒绝/超时则走 IP 兜底
        }
      }

      // 2) IP 兜底（不弹权限）
      try {
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
        if (!res.ok) throw new Error('bad')
        const json = (await res.json()) as {
          city?: string
          region?: string
          latitude?: number
          longitude?: number
        }
        if (!alive) return
        // 只有在定位失败时才用 IP 的城市，避免被出口节点覆盖
        if (!geoQuery && typeof json.city === 'string') setCity(json.city)
        if (!geoQuery && typeof json.latitude === 'number' && typeof json.longitude === 'number') {
          setLocationQuery(`${json.latitude.toFixed(3)},${json.longitude.toFixed(3)}`)
        } else if (typeof json.city === 'string') {
          // 没有坐标时只能退回到 city（可能是区县级）
          setLocationQuery(json.city)
        }
      } catch {
        // 静默失败
      }
    }

    load()
    return () => {
      alive = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    let alive = true
    const controller = new AbortController()

    // 基于定位结果刷新天气（无定位时用占位符/旧值）
    const query = locationQuery || city || 'Shanghai'
    const url = query
      ? `https://wttr.in/${encodeURIComponent(query)}?format=%c+%t&m`
      : `https://wttr.in/?format=%c+%t&m`

    const load = async () => {
      try {
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = (await res.text()).trim()
        if (!alive) return
        setWeather(text || '-')
        if (!locationQuery && !city) setCity('Shanghai')
      } catch (e) {
        if (!alive) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        // 静默失败：保留旧值/占位符
      }
    }

    load()
    const t = window.setInterval(load, 600_000) // 10 分钟
    return () => {
      alive = false
      controller.abort()
      window.clearInterval(t)
    }
  }, [city, locationQuery])

  const renderRow = (
    Icon: ComponentType<{ className?: string }>,
    row: PriceRow,
    color: string,
  ) => {
    const priceText = Number.isFinite(row.usd) ? `$${row.usd.toFixed(2)}` : '-'
    return (
      <div className="relative flex items-center gap-2 py-1">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="font-mono" style={{ color }}>
          {priceText}
        </span>
      </div>
    )
  }

  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-white/5 bg-black/25 backdrop-blur md:block"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      <style>
        {`
          @keyframes footerBreath {
            0%, 100% { transform: scale(0.92); opacity: 0.55; filter: blur(0px); }
            50% { transform: scale(1.08); opacity: 1; filter: blur(0.2px); }
          }
          @keyframes footerBreathColor {
            0% { background: #c084fc; box-shadow: 0 0 0 0 rgba(192,132,252,0.0), 0 0 12px rgba(192,132,252,0.35); }
            33% { background: #f472b6; box-shadow: 0 0 0 0 rgba(244,114,182,0.0), 0 0 12px rgba(244,114,182,0.35); }
            66% { background: #38bdf8; box-shadow: 0 0 0 0 rgba(56,189,248,0.0), 0 0 12px rgba(56,189,248,0.35); }
            100% { background: #c084fc; box-shadow: 0 0 0 0 rgba(192,132,252,0.0), 0 0 12px rgba(192,132,252,0.35); }
          }
        `}
      </style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-30"
        style={{ backgroundImage: `linear-gradient(90deg, ${accent})` }}
      />
      <div className="flex h-10 w-full items-center justify-between gap-4 px-5 text-xs text-white/80 md:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-4">
          {renderRow(BNB, data?.bnb ?? { usd: Number.NaN }, '#f2c366')}
          {renderRow(Ethereum, data?.eth ?? { usd: Number.NaN }, '#4ea7fa')}
          {renderRow(Solana, data?.sol ?? { usd: Number.NaN }, '#86d99f')}
        </div>

        <div className="flex items-center font-mono text-white/70">
          <span
            aria-hidden="true"
            className="mr-3 inline-block h-2 w-2 rounded-full"
            style={{
              animation: 'footerBreath 1.8s ease-in-out infinite, footerBreathColor 6s linear infinite',
            }}
          />
          <span className="mr-3 text-white/60">
            {(city ? `${city} ` : '') + weather}
          </span>
          {new Date(now).toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </div>
      </div>
    </footer>
  )
}

