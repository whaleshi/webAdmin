import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import MagicRings from './MagicRings'

interface HeroAvatarProps {
  image?: string
  className?: string
  colors?: string[]
}

export function HeroAvatar({
  image = '/whale.png',
  className = '',
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
}: HeroAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 1. 经典呼吸浮动
      gsap.to(containerRef.current, {
        y: -15,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      // 2. 微旋动效
      gsap.to(imageRef.current, {
        rotate: 4,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      // 3. 背光呼吸感
      gsap.to(glowRef.current, {
        scale: 1.2,
        opacity: 0.6,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      })

      // 4. 入场动画
      gsap.fromTo(
        containerRef.current,
        { scale: 0.5, opacity: 0, rotate: -10 },
        {
          scale: 1,
          opacity: 1,
          rotate: 0,
          duration: 1.2,
          ease: 'back.out(1.7)',
          delay: 0.2,
        }
      )
    })

    return () => ctx.revert()
  }, [])

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      
      {/* 光效容器层 - 带边缘羽化遮罩 */}
      <div 
        className="pointer-events-none absolute h-[400px] w-[400px] md:h-[500px] md:w-[500px]"
        style={{
          maskImage: 'radial-gradient(circle, black 40%, rgba(0,0,0,0.5) 60%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(circle, black 40%, rgba(0,0,0,0.5) 60%, transparent 85%)',
        }}
      >
        <MagicRings
          color={colors[0]}
          colorTwo={colors[2]}
          ringCount={8}
          speed={0.8}
          attenuation={10}
          lineThickness={1.8}
          baseRadius={0.3}
          radiusStep={0.08}
          scaleRate={0.15}
          opacity={0.8}
          rotation={45}
          followMouse={true}
          mouseInfluence={0.15}
          clickBurst={true}
          hoverScale={1.1}
        />

        <div
          ref={glowRef}
          className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[60px]"
          style={{
            background: `radial-gradient(circle, ${colors[0]}88 0%, ${colors[1]}44 50%, transparent 100%)`,
          }}
        />
      </div>

      {/* 头像容器核心 */}
      <div ref={containerRef} className="relative z-10 cursor-pointer">
        <div className="relative h-44 w-44 md:h-56 md:w-56">
          <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-white/20 via-white/50 to-white/10 opacity-50 blur-[1px]" />
          
          <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white/30 bg-black/40 shadow-[0_0_40px_rgba(0,0,0,0.4)] backdrop-blur-md">
            <img
              ref={imageRef}
              src={image}
              alt="Whale"
              className="h-full w-full object-cover transition-all duration-700 hover:scale-110"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
