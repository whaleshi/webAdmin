import { useEffect, useRef } from 'react'

type ParticleFlowBackgroundProps = {
  className?: string
  density?: number
  speed?: number
  opacity?: number
  colors?: string[]
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash2(x: number, y: number) {
  // deterministic-ish float noise from integer lattice
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function valueNoise(x: number, y: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = x0 + 1
  const y1 = y0 + 1

  const sx = smoothstep(x - x0)
  const sy = smoothstep(y - y0)

  const n00 = hash2(x0, y0)
  const n10 = hash2(x1, y0)
  const n01 = hash2(x0, y1)
  const n11 = hash2(x1, y1)

  const ix0 = n00 + (n10 - n00) * sx
  const ix1 = n01 + (n11 - n01) * sx
  return ix0 + (ix1 - ix0) * sy
}

export function ParticleFlowBackground({
  className,
  density = 0.00007,
  speed = 0.75,
  opacity = 0.6,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
}: ParticleFlowBackgroundProps) {
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
    let lastT = performance.now()
    let particles: Particle[] = []

    const rng = mulberry32(1337)

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

      const target = Math.floor(w * h * density)
      const next: Particle[] = []
      for (let i = 0; i < target; i++) {
        next.push(makeParticle(rng() * w, rng() * h, true))
      }
      particles = next
    }

    const ro = new ResizeObserver(() => resize())
    if (canvas.parentElement) ro.observe(canvas.parentElement)
    resize()

    function makeParticle(x: number, y: number, fresh = false): Particle {
      const color = colors[Math.floor(rng() * colors.length)] ?? '#ffffff'
      const maxLife = 2.8 + rng() * 2.2
      return {
        x,
        y,
        vx: 0,
        vy: fresh ? 18 + rng() * 28 : 22 + rng() * 34,
        life: 0,
        maxLife,
        size: 0.7 + rng() * 1.5,
        color,
      }
    }

    const draw = (tNow: number) => {
      const dt = Math.min(0.033, (tNow - lastT) / 1000)
      lastT = tNow

      ctx.clearRect(0, 0, w, h)

      // Fade edges a little so it feels like "flow" not "snow"
      const vignette = ctx.createRadialGradient(w * 0.5, h * 0.35, 0, w * 0.5, h * 0.55, Math.max(w, h) * 0.7)
      vignette.addColorStop(0, `rgba(255,255,255,${0.06 * opacity})`)
      vignette.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'lighter'

      const time = tNow / 1000
      const scale = 0.006
      for (const p of particles) {
        // flow field angle from value noise
        const n = valueNoise((p.x + time * 40) * scale, (p.y - time * 30) * scale)
        const ang = n * Math.PI * 2
        const fx = Math.cos(ang)
        const fy = Math.sin(ang)

        p.vx += fx * 14 * dt
        p.vy += (20 + fy * 10) * dt

        // damping
        p.vx *= 0.92
        p.vy *= 0.92

        p.x += p.vx * speed
        p.y += p.vy * speed

        p.life += dt
        const lifeT = Math.min(p.life / p.maxLife, 1)
        const a = (1 - lifeT) * 0.9 * opacity

        // draw particle
        ctx.fillStyle = p.color
        ctx.globalAlpha = a * 0.36
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()

        // tiny streak
        ctx.strokeStyle = p.color
        ctx.globalAlpha = a * 0.16
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 0.6, p.y - p.vy * 0.6)
        ctx.stroke()

        const out = p.x < -20 || p.x > w + 20 || p.y < -40 || p.y > h + 60
        if (out || p.life >= p.maxLife) {
          // respawn near top with slight horizontal jitter
          p.x = rng() * w
          p.y = -30 - rng() * 120
          p.vx = 0
          p.vy = 14 + rng() * 24
          p.life = 0
          p.maxLife = 2.6 + rng() * 2.6
          p.size = 0.7 + rng() * 1.5
          p.color = colors[Math.floor(rng() * colors.length)] ?? '#ffffff'
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      raf = window.requestAnimationFrame(draw)
    }

    raf = window.requestAnimationFrame(draw)

    return () => {
      ro.disconnect()
      window.cancelAnimationFrame(raf)
    }
  }, [density, opacity, speed])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}

