import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ShapeGridBackground } from './components/ShapeGridBackground'
import BorderGlow from './components/BorderGlow'
import { ParticleFlowBackground } from './components/ParticleFlowBackground'
import { SkillsDomeSection } from './sections/SkillsDomeSection'
import { FixedFooter } from './components/FixedFooter'
import { GitHub } from './icons/GitHub'
import { XformerlyTwitter } from './icons/XformerlyTwitter'
import { Gmail } from './icons/Gmail'
import { ContactMap } from './components/ContactMap'
import { Web3Login } from './components/Web3Login'
import { MainContentRouter } from './components/MainContentRouter'
import { FloatingStatusWidget } from './components/FloatingStatusWidget'

import { HeroAvatar } from './components/HeroAvatar'

type Project = {
  title: string
  tags: string[]
  status: 'Deployed' | 'In Progress' | 'Open Source'
  desc: string
  href?: string
}

gsap.registerPlugin(ScrollTrigger)

import RotatingText from './components/RotatingText'

import { MeshGradientBackground } from './components/MeshGradientBackground'

function App() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // 页面主内容由 `MainContentRouter` 根据路由切换

  const themeColors = useMemo(() => ['#c084fc', '#f472b6', '#38bdf8'], [])

  type ChatMsg = { id: string; from: 'system' | 'you'; text: string }
  const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    { id: makeId(), from: 'system', text: '地图已就绪。点击地图/搜索地点，会自动写入聊天上下文。' },
  ])
  const [chatInput, setChatInput] = useState<string>('')

  const projects = useMemo<Project[]>(
    () => [
      {
        title: 'Aurora Notes',
        desc: '极简笔记 + 全文检索 + 离线优先',
        tags: ['React', 'IndexedDB', 'Tailwind'],
        status: 'Deployed',
      },
      {
        title: 'Motion Gallery',
        desc: '滚动叙事作品集，沉浸式动效',
        tags: ['GSAP', 'ScrollTrigger', 'Vite'],
        status: 'Open Source',
      },
      {
        title: 'Onchain Dashboard',
        desc: '链上数据可视化：地址画像 / 交易追踪 / 实时看板',
        tags: ['Web3', 'EVM', 'The Graph', 'React'],
        status: 'In Progress',
      },
      {
        title: 'Tiny SaaS Landing',
        desc: '高转化落地页模板，组件化可复用',
        tags: ['Design', 'A11y', 'Performance'],
        status: 'In Progress',
      },
    ],
    [],
  )

  useLayoutEffect(() => {
    if (!rootRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-reveal]',
        { y: 14, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.06,
        },
      )

      gsap.utils.toArray<HTMLElement>('[data-section]').forEach((el) => {
        gsap.fromTo(
          el.querySelectorAll('[data-item]'),
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.06,
            scrollTrigger: { trigger: el, start: 'top 75%' },
          },
        )
      })

      if (progressRef.current) {
        gsap.set(progressRef.current, { scaleX: 0, transformOrigin: '0% 50%' })
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => {
            gsap.to(progressRef.current, {
              scaleX: self.progress,
              duration: 0.08,
              overwrite: true,
              ease: 'none',
            })
          },
        })
      }
    }, rootRef)
    // 切换路由后重新计算触发器范围与页面高度
    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [location.pathname])

  return (
    <div ref={rootRef} className="min-h-dvh text-neutral-100">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0b0f19]" />
        
        {/* 新增：主题色流体渐变层 */}
        <MeshGradientBackground
          className="absolute inset-0 opacity-40 mix-blend-screen"
          colors={themeColors}
          speed={0.4}
        />

        <ShapeGridBackground
          className="absolute inset-0 opacity-40"
          cell={60}
          speed={0.3}
          colors={themeColors}
        />

        <ParticleFlowBackground
          className="absolute inset-0 opacity-70 mix-blend-lighter"
          density={0.00004}
          speed={1.2}
          opacity={0.8}
          colors={themeColors}
        />

        {/* 增强顶部和底部遮罩，增加深度 */}
        <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_50%_0%,rgba(192,132,252,0.1)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,15,25,0)_0%,rgba(11,15,25,0.8)_80%,#0b0f19_100%)]" />
      </div>

      <div className="relative z-10">
      <header className="fixed inset-x-0 top-0 z-40 overflow-visible border-b border-white/10 bg-[#0b0f19]/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-0">
          <div
            ref={progressRef}
            className="h-full w-full origin-left opacity-80 blur-[6px] saturate-150"
            style={{
              background: [
                'radial-gradient(at 18% 55%, rgba(192,132,252,0.45) 0px, transparent 55%)',
                'radial-gradient(at 55% 38%, rgba(244,114,182,0.32) 0px, transparent 58%)',
                'radial-gradient(at 82% 52%, rgba(56,189,248,0.40) 0px, transparent 55%)',
                'linear-gradient(to right, rgba(192,132,252,0.10), rgba(56,189,248,0.08))',
              ].join(', '),
              mixBlendMode: 'plus-lighter',
            }}
          />
        </div>
        <div className="relative flex w-full items-center justify-between px-5 py-3 md:px-8 lg:px-10">
          <a
            href="/"
            className="font-mono text-sm text-white/85"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
              const raw = window.sessionStorage.getItem('homeScrollY')
              const y = raw ? Number(raw) : 0
              window.scrollTo({ top: Number.isFinite(y) ? y : 0, behavior: 'auto' })
            }}
          >
            whale
          </a>
          <div className="flex items-center gap-4">

            <Web3Login />
          </div>
        </div>
      </header>

      <MainContentRouter
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        makeId={makeId}
      >
        <div>
        <section
          ref={heroRef}
          className="relative flex min-h-[85svh] items-center py-20 md:min-h-[90svh]"
        >
          {/* 背景装饰：一个巨大的模糊光晕，增强视觉深度 */}
          <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-[120px]" />

          <div className="grid w-full gap-16 md:grid-cols-12 md:items-center">
            {/* 左侧文字区域：更具张力的排版 */}
            <div className="md:col-span-7">
              <div data-reveal className="inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/10 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                Active in Web3 Ecosystem
              </div>

              <h1 data-reveal className="mt-8">
                <span className="block text-[54px] font-bold leading-[0.9] tracking-tight text-white sm:text-7xl md:text-8xl">
                  Web3 Frontend
                </span>
                <span className="mt-2 block pb-2 text-[54px] font-light italic leading-[1.0] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#c084fc] to-[#38bdf8] sm:text-7xl md:text-8xl">
                  Engineer
                </span>
              </h1>

              <div data-reveal className="mt-8 flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-x-3 text-lg font-medium text-white/60">
                  <span className="font-mono text-xs uppercase tracking-[0.3em]">Building with</span>
                  <RotatingText
                    texts={['React', 'Vue', 'Node.js', 'Web3', 'Uni-app', 'TypeScript']}
                    mainClassName="px-4 py-1 bg-white/5 border border-white/10 text-white rounded-xl overflow-hidden justify-center shadow-[0_8px_32px_-8px_rgba(192,132,252,0.4)] backdrop-blur-xl ring-1 ring-white/10"
                    staggerFrom={"last"}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "-120%", opacity: 0 }}
                    staggerDuration={0.02}
                    splitLevelClassName="overflow-hidden pb-0.5"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    rotationInterval={2000}
                  />
                </div>
                <p className="max-w-md text-pretty text-base leading-relaxed text-white/50 md:text-lg">
                  Experienced developer specializing in multi-platform ecosystems and Web3. Proficient in end-to-end development—from core HTML/CSS to Node.js backend logic—dedicated to crafting high-performance, cross-compatible digital experiences.
                </p>
              </div>

              <div data-reveal className="mt-10 flex flex-wrap items-center gap-4">
                <a
                  href="#projects"
                  className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-bold text-neutral-950 transition-all hover:pr-10 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                >
                  View Projects
                  <span className="absolute right-4 translate-x-4 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">→</span>
                </a>
                <a
                  href="/resume.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full bg-white/5 px-8 py-4 text-sm font-bold text-white ring-1 ring-white/15 transition-all hover:bg-white/10 hover:ring-white/30 backdrop-blur-sm"
                >
                  Download CV
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <a
                  href="#contact"
                  className="text-sm font-bold text-white/50 hover:text-white transition-colors px-4 py-4"
                >
                  Contact Me
                </a>
              </div>
            </div>

            {/* 右侧区域：HUD 头像展示区 */}
            <div className="relative md:col-span-5 flex items-center justify-center py-16 md:py-0 overflow-visible">
              <HeroAvatar colors={themeColors} />

              {/* HUD 悬浮信息块 1：Location */}
              <div 
                data-reveal 
                className="absolute left-[2%] top-[0%] md:-left-24 md:top-[6%] z-20"
                style={{ animation: 'float 6.5s ease-in-out infinite' }}
              >
                <div className="rounded-xl border border-white/10 bg-[#0b0f19]/40 p-2 md:p-4 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
                  <div className="text-[7px] md:text-[10px] uppercase tracking-widest text-white/30 font-mono">Location</div>
                  <div className="mt-0.5 font-mono text-[9px] md:text-xs text-white/80">Remote / Beijing</div>
                </div>
              </div>

              {/* HUD 悬浮信息块 2：Focus */}
              <div 
                data-reveal 
                className="absolute right-[2%] top-[15%] md:-right-4 md:top-[32%] z-20"
                style={{ animation: 'float 6s ease-in-out infinite 1s' }}
              >
                <div className="rounded-xl border border-white/10 bg-[#0b0f19]/40 p-2 md:p-4 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
                  <div className="text-[7px] md:text-[10px] uppercase tracking-widest text-white/30 font-mono">Focus</div>
                  <div className="mt-0.5 font-mono text-[9px] md:text-xs text-white/80">Web3 & dApp</div>
                </div>
              </div>

              {/* HUD 悬浮信息块 3：Expertise */}
              <div 
                data-reveal 
                className="absolute left-[4%] bottom-[5%] md:-left-20 md:bottom-[8%] z-20"
                style={{ animation: 'float 7s ease-in-out infinite 2s' }}
              >
                <div className="rounded-xl border border-white/10 bg-[#0b0f19]/40 p-2 md:p-4 backdrop-blur-sm shadow-xl ring-1 ring-white/5">
                  <div className="text-[7px] md:text-[10px] uppercase tracking-widest text-white/30 font-mono">Expertise</div>
                  <div className="mt-0.5 font-mono text-[9px] md:text-xs text-white/80">Full-stack & Hybrid</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="projects" data-section className="scroll-mt-24 border-t border-white/5 py-24 md:py-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                Featured Projects
              </h2>
              <p className="mt-4 max-w-lg text-base text-white/40 font-medium">
                A curated selection of my work—from decentralized applications to high-performance frontend systems.
              </p>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent mb-4 hidden md:block ml-10"></div>
          </div>

          <div className="mt-8 grid gap-3">
            {projects.map((p) => (
              <BorderGlow
                key={p.title}
                edgeSensitivity={30}
                glowColor="40 80 80"
                backgroundColor="#060010"
                borderRadius={20}
                glowRadius={40}
                glowIntensity={1}
                coneSpread={25}
                animated={false}
                colors={['#c084fc', '#f472b6', '#38bdf8']}
              >
                <div className="px-5 py-4 md:px-6">
                  <a
                    data-item
                    href={p.href ?? '#'}
                    onClick={(e) => {
                      if (!p.href) e.preventDefault()
                    }}
                    className="group block"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="truncate text-sm font-semibold text-white">
                            {p.title}
                          </div>
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/65 ring-1 ring-white/10">
                            {p.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-white/70">{p.desc}</div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {p.tags.map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </a>
                </div>
              </BorderGlow>
            ))}
          </div>
        </section>

        <SkillsDomeSection themeColors={themeColors} />

        <section id="contact" data-section className="scroll-mt-24 border-t border-white/10 py-16 md:py-20">
          <div className="grid gap-6 rounded-[20px] bg-white/5 p-7 ring-1 ring-white/10 md:grid-cols-2 md:p-10">
            <div className="flex flex-col">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                Contact
              </h2>
              <p className="mt-4 text-sm text-white/40 font-medium">
                Feel free to reach out for collaborations, project inquiries, or just a friendly hello.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  { label: 'Email', value: 'whaleshi@163.com', href: 'mailto:whaleshi@163.com', Icon: Gmail },
                  { label: 'GitHub', value: 'github.com/whaleshi', href: 'https://github.com/whaleshi', Icon: GitHub },
                  { label: 'X', value: 'x.com/whale2869', href: 'https://x.com/whale2869', Icon: XformerlyTwitter },
                ].map((x) => (
                  <a
                    key={x.label}
                    href={x.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group"
                  >
                    <BorderGlow
                      edgeSensitivity={30}
                      glowColor="40 80 80"
                      backgroundColor="#060010"
                      borderRadius={20}
                      glowRadius={40}
                      glowIntensity={1}
                      coneSpread={25}
                      animated={false}
                      colors={['#c084fc', '#f472b6', '#38bdf8']}
                      className="transition-transform group-hover:-translate-y-1"
                    >
                      <div className="px-4 py-3">
                        <div data-item className="flex items-center justify-between gap-4">
                          <span className="inline-flex items-center gap-2 text-xs text-white/70 group-hover:text-white transition-colors">
                            <x.Icon className="h-4 w-4" aria-hidden="true" focusable="false" />
                            {x.label}
                          </span>
                          <span className="truncate font-mono text-xs text-white/85 group-hover:text-white transition-colors">{x.value}</span>
                        </div>
                      </div>
                    </BorderGlow>
                  </a>
                ))}
              </div>
              <a
                data-item
                href="#top"
                className="mt-4 inline-flex items-center justify-center rounded-[20px] bg-white px-4 py-3 text-sm font-bold text-neutral-950 transition-all hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                Back to top ↑
              </a>
            </div>
            <BorderGlow
              edgeSensitivity={30}
              glowColor="40 80 80"
              backgroundColor="#060010"
              borderRadius={20}
              glowRadius={40}
              glowIntensity={1}
              coneSpread={25}
              animated={false}
              colors={['#c084fc', '#f472b6', '#38bdf8']}
            >
              <div className="overflow-hidden rounded-[20px] ring-1 ring-white/10">
                <button
                  type="button"
                  onClick={() => {
                    // 进入地图前保存首页滚动位置，返回时恢复
                    window.sessionStorage.setItem('homeScrollY', String(window.scrollY))
                    navigate('/map')
                    window.scrollTo({ top: 0, behavior: 'auto' })
                  }}
                  className="block h-full w-full text-left"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-white/70">Map</span>
                    <span className="text-[11px] text-white/45">Carto</span>
                  </div>
                  <div className="h-[260px] w-full md:h-[320px]">
                    <ContactMap />
                  </div>
                </button>
              </div>
            </BorderGlow>
          </div>
        </section>
        </div>
      </MainContentRouter>

      <FloatingStatusWidget />
      <FixedFooter themeColors={themeColors} />
      </div>
    </div>
  )
}

export default App
