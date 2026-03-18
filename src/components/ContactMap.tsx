import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import L from 'leaflet'

const MY_LOCATION: [number, number] = [39.93712882758603, 116.65384379689417]

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

export function ContactMap({
  center = MY_LOCATION,
  zoom = 11,
}: {
  center?: [number, number]
  zoom?: number
}) {
  const baseCenter = useMemo<[number, number]>(() => center, [center])
  const [visitor, setVisitor] = useState<[number, number] | null>(null)

  useEffect(() => {
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
  }, [])

  const distanceKm = useMemo(() => (visitor ? haversineKm(MY_LOCATION, visitor) : null), [visitor])

  return (
    <div className="relative h-full w-full">
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
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        <Marker position={MY_LOCATION} icon={whaleIcon}>
        </Marker>
        <Marker position={baseCenter} icon={markerIcon} />
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
  )
}

