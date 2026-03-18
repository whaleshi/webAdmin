import { useEffect, useRef } from 'react'

type ShapeGridBackgroundProps = {
  className?: string
  cell?: number
  padding?: number
  opacity?: number
  speed?: number
  colors?: string[]
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

export function ShapeGridBackground({
  className,
  cell = 44,
  padding = 32,
  opacity = 0.9,
  speed = 0.65,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
}: ShapeGridBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    let dpr = 1

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const r = parent.getBoundingClientRect()
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      w = Math.floor(r.width)
      h = Math.floor(r.height)
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const ro = new ResizeObserver(() => resize())
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    resize()

    const draw = (tMs: number) => {
      try {
        const t = (tMs / 1000) * speed
        ctx.clearRect(0, 0, w, h)

        const cols = Math.ceil((w - padding * 2) / cell)
        const rows = Math.ceil((h - padding * 2) / cell)

      // subtle base wash
      ctx.globalAlpha = 1
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, 'rgba(255,255,255,0.03)')
      grad.addColorStop(1, 'rgba(0,0,0,0.20)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      // grid lines
      ctx.globalAlpha = 0.22 * opacity
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      for (let i = 0; i <= cols; i++) {
        const x = Math.round(padding + i * cell) + 0.5
        ctx.beginPath()
        ctx.moveTo(x, padding)
        ctx.lineTo(x, padding + rows * cell)
        ctx.stroke()
      }
      for (let j = 0; j <= rows; j++) {
        const y = Math.round(padding + j * cell) + 0.5
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(padding + cols * cell, y)
        ctx.stroke()
      }

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const seed = i * 1337 + j * 7331
          // each cell gets a stable base RNG, plus a time-bucket RNG
          const baseRnd = mulberry32(seed)
          const cx = padding + i * cell + cell / 2
          const cy = padding + j * cell + cell / 2

          // 0..1 drift phase per cell, but deterministic
          const phase = baseRnd() * Math.PI * 2
          const wob = 0.5 + 0.5 * Math.sin(t + phase)

          // sparse mask: only some cells ever get content (prevents "every cell has something")
          const eligible = baseRnd() < 0.26
          if (!eligible) continue

          // time bucket: change contents every ~2–4 seconds per cell
          const period = 2 + baseRnd() * 2
          const bucket = Math.floor((t + phase * 0.35) / period)
          const rnd = mulberry32(seed + bucket * 99991)
          const prevRnd = mulberry32(seed + (bucket - 1) * 99991)
          const bucketT = ((t + phase * 0.35) / period) % 1

          // decide whether this cell is active this bucket
          const on = rnd() <= 0.34
          const prevOn = prevRnd() <= 0.34
          if (!on && !prevOn) continue

          // true crossfade between previous/current (sum alpha ~= 1)
          const mix = smoothstep(bucketT)
          let aPrev = prevOn ? 1 - mix : 0
          let aCurr = on ? mix : 0
          if (prevOn && !on) {
            aPrev = 1
            aCurr = 0
          } else if (on && !prevOn) {
            aPrev = 0
            aCurr = 1
          }

          // draw previous + current with normalized alphas
          const variants: Array<{ rr: () => number; alphaMul: number }> = []
          if (aPrev > 0) variants.push({ rr: prevRnd, alphaMul: aPrev })
          if (aCurr > 0) variants.push({ rr: rnd, alphaMul: aCurr })

          for (const v of variants) {
            const r = v.rr
            const kind = Math.floor(r() * 5) // 0 dot 1 circle 2 square 3 tri 4 diamond
            const size = 5 + r() * 14
            const dx = (r() - 0.5) * 7 * wob
            const dy = (r() - 0.5) * 7 * wob

            const a =
              (0.10 + r() * 0.18) *
              opacity *
              (0.6 + 0.4 * wob) *
              v.alphaMul
            const huePick = r()
            const theme = colors[Math.floor(r() * colors.length)] ?? '#ffffff'
            const col = huePick < 0.38 ? '#ffffff' : theme

            const x = cx + dx
            const y = cy + dy

            ctx.save()
            ctx.translate(x, y)
            ctx.rotate((r() - 0.5) * 0.9 * wob)

            ctx.globalAlpha = a
            ctx.fillStyle = col

            if (kind === 0) {
              ctx.beginPath()
              ctx.arc(0, 0, Math.max(1.2, size * 0.18), 0, Math.PI * 2)
              ctx.fill()
            } else if (kind === 1) {
              ctx.beginPath()
              ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
              ctx.fill()
            } else if (kind === 2) {
              const cr = 3
              const s = size
              const hw = s / 2
              ctx.beginPath()
              ctx.moveTo(-hw + cr, -hw)
              ctx.lineTo(hw - cr, -hw)
              ctx.quadraticCurveTo(hw, -hw, hw, -hw + cr)
              ctx.lineTo(hw, hw - cr)
              ctx.quadraticCurveTo(hw, hw, hw - cr, hw)
              ctx.lineTo(-hw + cr, hw)
              ctx.quadraticCurveTo(-hw, hw, -hw, hw - cr)
              ctx.lineTo(-hw, -hw + cr)
              ctx.quadraticCurveTo(-hw, -hw, -hw + cr, -hw)
              ctx.fill()
            } else if (kind === 3) {
              const s = size * 0.62
              ctx.beginPath()
              ctx.moveTo(0, -s)
              ctx.lineTo(s, s)
              ctx.lineTo(-s, s)
              ctx.closePath()
              ctx.fill()
            } else {
              const s = size * 0.62
              ctx.beginPath()
              ctx.moveTo(0, -s)
              ctx.lineTo(s, 0)
              ctx.lineTo(0, s)
              ctx.lineTo(-s, 0)
              ctx.closePath()
              ctx.fill()
            }

            // subtle stroke to keep shapes crisp
            ctx.globalAlpha = a * 0.55
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 1
            ctx.stroke()

            ctx.restore()
          }
        }
      }

      } finally {
        raf = window.requestAnimationFrame(draw)
      }
    }

    raf = window.requestAnimationFrame(draw)
    window.addEventListener('resize', resize, { passive: true })

    return () => {
      window.removeEventListener('resize', resize)
      ro.disconnect()
      window.cancelAnimationFrame(raf)
    }
  }, [cell, opacity, padding, speed])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
    />
  )
}

