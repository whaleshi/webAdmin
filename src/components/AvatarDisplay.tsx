import { useMemo } from 'react'

export function AvatarDisplay({
  avatarUrl,
  initials,
  size = 72,
  frameUrl,
  frameFit = 'cover',
  shape = 'circle',
  className = '',
}: {
  avatarUrl?: string | null
  initials: string
  size?: number
  // 用于叠加“头像框”（比如穿戴的 avatar_frame 资产），透明 PNG/SVG 最好
  frameUrl?: string | null
  // 方形头像框一般用 cover 更贴合
  frameFit?: 'contain' | 'cover'
  // 方形框时，头像容器也要不要裁成圆形
  shape?: 'circle' | 'square'
  className?: string
}) {
  const displayInitials = useMemo(() => {
    const n = (initials ?? '').trim()
    return n || 'U'
  }, [initials])

  return (
    <div
      className={`relative overflow-hidden bg-white/5 ring-1 ring-white/10 ${shape === 'circle' ? 'rounded-full' : 'rounded-[0px]'} ${className}`}
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#c084fc]/30 via-[#f472b6]/20 to-[#38bdf8]/25">
          <div className="text-[18px] font-semibold tracking-wide text-white/85">{displayInitials}</div>
        </div>
      )}

      {frameUrl ? (
        <img
          src={frameUrl}
          alt="frame"
          className={`pointer-events-none absolute inset-0 h-full w-full object-${frameFit}`}
          referrerPolicy="no-referrer"
        />
      ) : null}

      {/* 额外一层 ring，和你原来的视觉一致 */}
      <div
        className={`pointer-events-none absolute inset-0 ring-1 ring-white/10 ${
          shape === 'circle' ? 'rounded-full' : 'rounded-[0px]'
        }`}
      />
    </div>
  )
}

