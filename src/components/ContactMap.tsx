import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const MY_LOCATION: [number, number] = [39.93709094135687, 116.65370008973728]

// 只保留暗色/浅色两种地图：使用稳定的 Carto tile 源
const CARTO_DARK_URL = 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const CARTO_LIGHT_URL = 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const markerIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:12px;height:12px;border-radius:999px;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.0) 55%),
                linear-gradient(135deg, rgba(192,132,252,0.95), rgba(56,189,248,0.95));
    box-shadow: 0 0 18px rgba(56,189,248,0.28), 0 0 18px rgba(192,132,252,0.22);
    border: 1px solid rgba(255,255,255,0.18);
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

const whaleIcon = new L.DivIcon({
  className: '',
  html: `<div style="position:relative; width:36px; height:46px; display:flex; align-items:flex-start; justify-content:center;">
    <div style="
      width:32px; height:32px; border-radius:999px; overflow:hidden;
      border: 1px solid rgba(255,255,255,0.28);
      box-shadow: 0 10px 24px rgba(0,0,0,0.45), 0 0 18px rgba(56,189,248,0.18), 0 0 18px rgba(192,132,252,0.14);
      background: linear-gradient(135deg, rgba(192,132,252,0.18), rgba(56,189,248,0.14));
    ">
      <img src="/whale.png" style="width:100%; height:100%; object-fit:cover; display:block;" />
    </div>
    <div style="
      position:absolute; top:32px; left:50%;
      width:1px; height:14px;
      transform: translateX(-0.5px);
      background: linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0.00));
    "></div>
    <div style="
      position:absolute; top:44px; left:50%;
      width:6px; height:6px; border-radius:999px;
      transform: translate(-50%, -50%);
      background: rgba(56,189,248,0.9);
      box-shadow: 0 0 0 6px rgba(56,189,248,0.12), 0 0 16px rgba(56,189,248,0.25);
      border: 1px solid rgba(255,255,255,0.18);
    "></div>
  </div>`,
  iconSize: [36, 46],
  iconAnchor: [18, 45],
})

const visitorIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:8px;height:8px;border-radius:999px;
    background: rgba(244,114,182,0.95);
    box-shadow: 0 0 0 6px rgba(244,114,182,0.10), 0 0 16px rgba(244,114,182,0.28);
    border: 1px solid rgba(255,255,255,0.22);
    animation: visitorBlink 1.15s ease-in-out infinite;
  "></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
})

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLon / 2)
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function InvalidateMapSize({ visible }: { visible: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!visible) return
    const t = window.setTimeout(() => map.invalidateSize(), 0)
    return () => window.clearTimeout(t)
  }, [map, visible])
  return null
}

type MapAction =
  | { type: 'pick'; lat: number; lon: number; label?: string }
  | { type: 'search'; query: string; lat: number; lon: number; label?: string }
  | { type: 'layer'; layer: string }
  | { type: 'reset' }

export function ContactMap({
  center = MY_LOCATION,
  zoom = 11,
  showControlsBelow = false,
  onAction,
}: {
  center?: [number, number]
  zoom?: number
  showControlsBelow?: boolean
  onAction?: (action: MapAction) => void
}) {
  const baseCenter = useMemo<[number, number]>(() => center, [center])
  const [visitor, setVisitor] = useState<[number, number] | null>(null)
  const initialCenterRef = useRef<[number, number]>(center)
  const initialZoomRef = useRef<number>(zoom)

  const [map, setMap] = useState<L.Map | null>(null)
  const [layer, setLayer] = useState<'dark' | 'light'>('dark')
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searching, setSearching] = useState<boolean>(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    // hidden/display:none -> visible 时需要重新计算 leaflet 尺寸
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === el) setVisible(entry.isIntersecting)
        }
      },
      { threshold: [0, 0.1] },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const requestVisitor = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setVisitor([latitude, longitude])
      },
      () => {
        // 静默失败：不显示访客点/距离
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 10 * 60 * 1000 },
    )
  }

  useEffect(() => {
    if (!navigator.geolocation) return
    requestVisitor()
  }, [])

  const distanceKm = useMemo(() => (visitor ? haversineKm(MY_LOCATION, visitor) : null), [visitor])

  const selectedIcon = useMemo(() => {
    return new L.DivIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;border-radius:999px;
        background: rgba(192,132,252,0.95);
        box-shadow: 0 0 0 7px rgba(192,132,252,0.12), 0 0 18px rgba(192,132,252,0.22);
        border: 1px solid rgba(255,255,255,0.22);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
  }, [])

  const reverseLookup = async (lat: number, lon: number) => {
    try {
      const r = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=zh`,
      )
      if (!r.ok) return ''
      const j = (await r.json()) as {
        principalSubdivision?: string
        locality?: string
        city?: string
        town?: string
        county?: string
      }
      const lvl1 = (j.principalSubdivision ?? '').trim()
      const lvl2 = (j.locality ?? j.city ?? j.town ?? j.county ?? '').trim()
      const parts = [lvl1, lvl2].filter(Boolean)
      return parts.length >= 2 ? `${parts[0]}·${parts[1]}` : parts[0] ?? ''
    } catch {
      return ''
    }
  }

  function MapClickHandler() {
    useMapEvents({
      click: async (e) => {
        const lat = e.latlng.lat
        const lon = e.latlng.lng
        setSelected([lat, lon])
        const label = await reverseLookup(lat, lon)
        setSelectedLabel(label)
        onAction?.({ type: 'pick', lat, lon, label: label || undefined })
      },
    })
    return null
  }

  const flyTo = (lat: number, lon: number, z?: number) => {
    if (!map) return
    map.flyTo([lat, lon], z ?? initialZoomRef.current, { animate: true, duration: 0.8 })
  }

  const mapThemeClass =
    layer === 'dark' ? 'leaflet-map--dark' : 'leaflet-map--light'

  const handleResetView = () => {
    const [lat, lon] = initialCenterRef.current
    flyTo(lat, lon, initialZoomRef.current)
    setSelected(null)
    setSelectedLabel('')
    setSearchQuery('')
    onAction?.({ type: 'reset' })
  }

  const handleGoMy = () => {
    flyTo(MY_LOCATION[0], MY_LOCATION[1], initialZoomRef.current)
  }

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    try {
      // Nominatim：按关键词返回经纬度（可能会有 CORS 限制，失败会展示错误但不影响页面）
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const arr = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>
      const first = arr[0]
      if (!first?.lat || !first?.lon) throw new Error('No result')
      const lat = Number(first.lat)
      const lon = Number(first.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Bad result')
      setSelected([lat, lon])
      const label = first.display_name
      setSelectedLabel(label || '')
      flyTo(lat, lon, Math.max(initialZoomRef.current, 12))
      onAction?.({ type: 'search', query: q, lat, lon, label: label || undefined })
    } catch (e) {
      setSearchError('搜索失败')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex h-full w-full flex-col bg-[#0b0f19]">
      <div className="relative flex-1">
      <style>{`
        @keyframes visitorBlink {
          0%, 100% { transform: scale(0.92); opacity: 0.55; filter: blur(0px); }
          50% { transform: scale(1.18); opacity: 1; filter: blur(0.2px); }
        }
      `}</style>
      <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-full bg-black/55 px-2.5 py-1 font-mono text-[11px] text-white/85 ring-1 ring-white/10 backdrop-blur">
        {distanceKm == null ? '距离 -' : `距离 ${distanceKm.toFixed(distanceKm >= 100 ? 0 : 1)} km`}
      </div>
      <MapContainer
        center={baseCenter}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        className={`h-full w-full ${mapThemeClass}`}
        ref={(m: L.Map | null) => setMap(m)}
      >
        {/* 始终渲染一个 TileLayer：仅根据 layer 切换 url，避免 Leaflet 偶发不显示 */}
        <TileLayer
          key={layer}
          url={layer === 'dark' ? CARTO_DARK_URL : CARTO_LIGHT_URL}
        />
        <InvalidateMapSize visible={visible} />
        <Marker position={MY_LOCATION} icon={whaleIcon}>
        </Marker>
        <Marker position={baseCenter} icon={markerIcon} />
        {selected ? (
          <Marker position={selected} icon={selectedIcon} />
        ) : null}
        <MapClickHandler />
        {visitor ? (
          <>
            <Polyline
              positions={[MY_LOCATION, visitor]}
              pathOptions={{ color: '#ffffff', opacity: 0.18, weight: 2, dashArray: '4 8' }}
            />
            <Marker position={visitor} icon={visitorIcon} />
          </>
        ) : null}
      </MapContainer>
      </div>

      {showControlsBelow ? (
        <div className="border-t border-white/10 bg-black/15 px-4 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索地点（如北京/通州）"
                className="w-full rounded-[12px] bg-white/5 px-3 py-2 text-xs text-white/85 ring-1 ring-white/10 outline-none placeholder:text-white/35"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="shrink-0 rounded-[12px] bg-white/5 px-3 py-2 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
              >
                {searching ? '...' : '搜索'}
              </button>
            </div>
            {searchError ? <div className="text-[11px] text-rose-300">{searchError}</div> : null}

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/55">图层</span>
                <select
                  value={layer}
                  onChange={(e) => {
                    const v = e.target.value as 'dark' | 'light'
                    setLayer(v)
                    onAction?.({ type: 'layer', layer: v })
                  }}
                  className="rounded-[12px] bg-white/5 px-2 py-2 text-xs text-white/85 ring-1 ring-white/10 outline-none"
                >
                  <option value="dark">暗色</option>
                  <option value="light">浅色</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGoMy}
                  className="rounded-[12px] bg-white/5 px-3 py-2 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/10"
                >
                  回到我
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="rounded-[12px] bg-white/5 px-3 py-2 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/10"
                >
                  重置
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={requestVisitor}
                className="rounded-[12px] bg-white/5 px-3 py-2 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/10"
              >
                更新访客位置
              </button>
              {selectedLabel ? <div className="text-[11px] text-white/60 line-clamp-1">{selectedLabel}</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

