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
    gold: PriceRow
    updatedAt: number
  } | null>(null)
  const [city, setCity] = useState<string>('')
  const [coordQuery, setCoordQuery] = useState<string>('') // "lat,lon" only (preferred for weather)
  const [locationReady, setLocationReady] = useState(false)
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

        const [bnbUsd, ethUsd, solUsd, goldUsd] = await Promise.all([
          fetchAvg('BNBUSDT'),
          fetchAvg('ETHUSDT'),
          fetchAvg('SOLUSDT'),
          fetchAvg('PAXGUSDT'),
        ])

        if (!alive) return
        setData({
          bnb: { usd: bnbUsd },
          eth: { usd: ethUsd },
          sol: { usd: solUsd },
          gold: { usd: goldUsd },
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
      let cityWasSet = false
      const setCitySafe = (v: string) => {
        if (!v) return
        cityWasSet = true
        setCity(v)
      }

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
          setCoordQuery(geoQuery)

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
              if (pretty && alive) setCitySafe(pretty)
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
        // 地址展示优先用定位反查；反查失败时再用 IP 补齐（避免啥也不显示）
        if (!cityWasSet && typeof json.city === 'string') setCitySafe(json.city)
        // 只有在没有定位坐标时，才用 IP 坐标作为 coordQuery（避免出口节点覆盖天气位置）
        if (!geoQuery && typeof json.latitude === 'number' && typeof json.longitude === 'number') {
          setCoordQuery(`${json.latitude.toFixed(3)},${json.longitude.toFixed(3)}`)
        }
      } catch {
        // 静默失败
      }

      if (alive) setLocationReady(true)
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

    if (!locationReady) return

    // 基于定位结果刷新天气（无定位时用占位符/旧值）
    const query = coordQuery || city || 'Shanghai'
    const coordMatch = /^([\d.\-+]+)\s*,\s*([\d.\-+]+)$/.exec(coordQuery)
    const cacheKey = coordMatch ? `coord:${coordMatch[1]},${coordMatch[2]}` : `city:${query}`
    let lastKey = ''
    let lastAt = 0
    let backoffMs = 0

    const weatherEmojiFromCode = (code: number) => {
      // https://open-meteo.com/en/docs (WMO weather interpretation codes)
      if (code === 0) return '☀️'
      if (code === 1 || code === 2) return '🌤️'
      if (code === 3) return '☁️'
      if (code === 45 || code === 48) return '🌫️'
      if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67)) return '🌧️'
      if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return '🌨️'
      if (code >= 80 && code <= 82) return '🌦️'
      if (code >= 95) return '⛈️'
      return '🌡️'
    }

    const load = async () => {
      try {
        const now = Date.now()
        if (cacheKey === lastKey && now - lastAt < 5 * 60_000) return
        if (backoffMs > 0 && now - lastAt < backoffMs) return

        // 有经纬度：只用 Open-Meteo（稳定支持 lat/lon、免 key）
        // 注意：一旦有坐标，不再回退到按城市名请求，避免重复请求与错位。
        if (coordMatch) {
          const lat = Number(coordMatch[1])
          const lon = Number(coordMatch[2])
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            const om = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius&timezone=auto`,
              { signal: controller.signal },
            )
            lastKey = cacheKey
            lastAt = Date.now()
            if (om.ok) {
              const j = (await om.json()) as {
                current_weather?: { temperature?: number; weathercode?: number }
              }
              const temp = j.current_weather?.temperature
              const code = j.current_weather?.weathercode
              if (typeof temp === 'number') {
                const emoji = typeof code === 'number' ? weatherEmojiFromCode(code) : '🌡️'
                if (alive) setWeather(`${emoji} ${temp >= 0 ? '+' : ''}${temp.toFixed(0)}°C`)
                backoffMs = 0
                return
              }
            }
          }

          // 坐标模式下：Open-Meteo 不可用时静默失败（保留旧值/占位符）
          backoffMs = backoffMs ? Math.min(backoffMs * 2, 10 * 60_000) : 2 * 60_000
          return
        }

        // 没有经纬度：按城市名用 wttr.in 兜底
        const url = `https://wttr.in/${encodeURIComponent(query)}?format=%c+%t&m`
        const res = await fetch(url, { signal: controller.signal })
        lastKey = cacheKey
        lastAt = Date.now()
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = (await res.text()).trim()
        if (!alive) return
        setWeather(text || '-')
        backoffMs = 0
        if (!coordQuery && !city) setCity('Shanghai')
      } catch (e) {
        if (!alive) return
        if (e instanceof DOMException && e.name === 'AbortError') return
        // 静默失败：保留旧值/占位符
        backoffMs = backoffMs ? Math.min(backoffMs * 2, 10 * 60_000) : 2 * 60_000
      }
    }

    load()
    const t = window.setInterval(load, 600_000) // 10 分钟
    return () => {
      alive = false
      controller.abort()
      window.clearInterval(t)
    }
  }, [city, coordQuery, locationReady])

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
          <div className="flex items-center gap-2 py-1">
            <div className="h-4 w-4 rounded-full bg-[#FFD700]/20 flex items-center justify-center ring-1 ring-[#FFD700]/50">
              <span className="text-[10px] text-[#FFD700] font-bold">G</span>
            </div>
            <span className="font-mono text-[#FFD700]">
              {Number.isFinite(data?.gold?.usd ?? Number.NaN) ? `$${data!.gold.usd.toFixed(2)}` : '-'}
            </span>
          </div>
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

