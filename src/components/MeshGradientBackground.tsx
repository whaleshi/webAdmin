import { useEffect, useRef } from 'react'

interface MeshGradientProps {
  className?: string
  colors?: string[]
  speed?: number
}

export function MeshGradientBackground({
  className = '',
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  speed = 0.5,
}: MeshGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w: number, h: number
    let raf: number
    let time = 0

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }

    const animate = () => {
      time += 0.01 * speed
      ctx.clearRect(0, 0, w, h)
      
      // 每一帧动态更新四个色块的位置，模拟流体感
      const points = [
        { 
          x: w * (0.5 + Math.sin(time * 0.7) * 0.3), 
          y: h * (0.5 + Math.cos(time * 0.5) * 0.3), 
          r: w * 0.8, color: colors[0] 
        },
        { 
          x: w * (0.2 + Math.cos(time * 0.4) * 0.2), 
          y: h * (0.8 + Math.sin(time * 0.6) * 0.2), 
          r: w * 0.7, color: colors[1] 
        },
        { 
          x: w * (0.8 + Math.sin(time * 0.5) * 0.2), 
          y: h * (0.2 + Math.cos(time * 0.8) * 0.2), 
          r: w * 0.9, color: colors[2] 
        }
      ]

      ctx.globalCompositeOperation = 'screen'
      
      points.forEach(p => {
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
        grad.addColorStop(0, p.color + '55') // 33% opacity
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      })

      raf = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resize)
    resize()
    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [colors, speed])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  )
}
