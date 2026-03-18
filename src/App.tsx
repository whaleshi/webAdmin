import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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

type Project = {
  title: string
  tags: string[]
  status: 'Deployed' | 'In Progress' | 'Open Source'
  desc: string
  href?: string
}

gsap.registerPlugin(ScrollTrigger)

function App() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const heroRef = useRef<HTMLElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const isMapDetails = pathname.replace(/\/+$/, '') === '/map'

  const themeColors = useMemo(() => ['#c084fc', '#f472b6', '#38bdf8'], [])

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
    return () => ctx.revert()
  }, [])

  return (
    <div ref={rootRef} className="min-h-dvh text-neutral-100">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0b0f19]" />
        <ShapeGridBackground
          className="absolute inset-0 opacity-80"
          cell={52}
          speed={0.5}
          colors={themeColors}
        />
        <ParticleFlowBackground
          className="absolute inset-0 opacity-90"
          density={0.00006}
          speed={0.8}
          opacity={0.9}
          colors={themeColors}
        />
        <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_-10%,rgba(255,255,255,0.06),transparent_62%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.06),rgba(0,0,0,0.90))]" />
      </div>

      <div className="relative z-10">
      <header className="fixed inset-x-0 top-0 z-40 overflow-hidden border-b border-white/10 bg-[#0b0f19]/70 backdrop-blur">
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
          <a href="#top" className="font-mono text-sm text-white/85">
            shijy.dev
          </a>
          <nav className="hidden items-center gap-6 text-sm text-white/65 md:flex">
            <a className="hover:text-white" href="#about">
              About
            </a>
            <a className="hover:text-white" href="#projects">
              Projects
            </a>
            <a className="hover:text-white" href="#contact">
              Contact
            </a>
          </nav>
          <a
            href="#contact"
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:-translate-y-0.5"
          >
            约个时间 →
          </a>
        </div>
      </header>

      <main id="top" className="mx-auto w-full max-w-6xl px-5 pt-16 pb-20 md:pt-[72px]">
        {isMapDetails ? (
          <section className="relative py-14 md:py-20">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                地图详情
              </h2>
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, '', '/')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="rounded-[16px] bg-white/5 px-3 py-1.5 text-xs text-white/80 ring-1 ring-white/10 hover:bg-white/10"
              >
                返回
              </button>
            </div>

            <div className="mt-6 h-[70vh] w-full">
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
                <div className="h-full overflow-hidden rounded-[20px] ring-1 ring-white/10">
                  <ContactMap zoom={12} />
                </div>
              </BorderGlow>
            </div>
          </section>
        ) : null}

        <div className={isMapDetails ? 'hidden' : ''}>
        <section
          ref={heroRef}
          className="relative flex min-h-[72svh] items-center py-14 md:min-h-[78svh] md:py-20"
        >
          <div className="grid w-full gap-10 md:grid-cols-12 md:items-center">
            <div className="md:col-span-7">
              <p
                data-reveal
                className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Available for freelance
              </p>

              <h1 data-reveal className="mt-5 text-balance">
                <span className="block text-[46px] font-semibold leading-[0.96] tracking-tight text-white sm:text-6xl md:text-7xl">
                  Software
                </span>
                <span className="block text-[46px] font-semibold leading-[0.96] tracking-tight text-white/80 sm:text-6xl md:text-7xl">
                  Developer
                </span>
              </h1>

              <p
                data-reveal
                className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70 md:text-lg"
              >
                我做 React 工程化与交互动效落地，也做 Web3 前端（EVM 生态）。专注排版层级、细节质感与可维护性。
              </p>

              <div data-reveal className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="#projects"
                  className="rounded-[20px] bg-white px-5 py-3 text-sm font-medium text-neutral-950 transition hover:-translate-y-0.5"
                >
                  查看作品
                </a>
                <a
                  href="#contact"
                  className="rounded-[20px] bg-white/5 px-5 py-3 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  联系我
                </a>
                <div className="ml-0 flex flex-wrap gap-2 md:ml-2">
                  {['React', 'TypeScript', 'Tailwind', 'GSAP', 'Web3'].map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-5">
              <BorderGlow
                edgeSensitivity={30}
                glowColor="200 80 70"
                backgroundColor="#060010"
                borderRadius={20}
                glowRadius={40}
                glowIntensity={1}
                coneSpread={25}
                animated={false}
                colors={['#c084fc', '#f472b6', '#38bdf8']}
              >
                <div className="p-6">
                  <div className="text-xs font-medium tracking-wide text-white/55">
                    Snapshot
                  </div>
                  <div className="mt-3 grid gap-3">
                    {[
                      { k: 'Location', v: 'Remote' },
                      { k: 'Focus', v: 'UI polish & motion' },
                      { k: 'Stack', v: 'React · TS · Tailwind' },
                      { k: 'Web3', v: 'EVM · Wallets · The Graph' },
                    ].map((x) => (
                      <div
                        key={x.k}
                        className="flex items-center justify-between rounded-[20px] bg-black/20 px-4 py-3 ring-1 ring-white/10"
                      >
                        <span className="text-xs text-white/55">{x.k}</span>
                        <span className="text-xs font-medium text-white/80">{x.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </BorderGlow>
            </div>
          </div>
        </section>

        <section id="about" data-section className="scroll-mt-24 border-t border-white/10 py-16 md:py-20">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                About
              </h2>
              <p className="mt-4 text-white/70">
                喜欢把复杂信息做成易读的布局，再用克制的动效增强节奏。关注 A11y、性能与代码结构。
              </p>
            </div>
            <div className="grid flex-1 gap-4 md:max-w-xl md:grid-cols-3">
              {[
                { title: 'Web', desc: 'SPA / Landing / 业务系统' },
                { title: 'Motion', desc: 'ScrollTrigger / 入场节奏' },
                { title: 'Web3', desc: 'EVM dApp / 钱包接入 / 链上数据' },
              ].map((x) => (
                <BorderGlow
                  key={x.title}
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
                  <div className="p-5">
                    <div data-item className="text-sm font-medium text-white">
                      {x.title}
                    </div>
                    <div data-item className="mt-2 text-sm text-white/70">
                      {x.desc}
                    </div>
                  </div>
                </BorderGlow>
              ))}
            </div>
          </div>
        </section>

        <section id="projects" data-section className="scroll-mt-24 border-t border-white/10 py-16 md:py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Projects
              </h2>
              <p className="mt-3 text-sm text-white/70">替换为你的真实项目即可。</p>
            </div>
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
              <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Contact
              </h2>
              <p className="mt-4 text-sm text-white/70">
                把联系方式替换成你的即可。
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  { label: 'Email', value: 'hello@shijy.dev', Icon: Gmail },
                  { label: 'GitHub', value: 'github.com/yourname', Icon: GitHub },
                  { label: 'X', value: 'x.com/yourname', Icon: XformerlyTwitter },
                ].map((x) => (
                  <BorderGlow
                    key={x.label}
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
                    <div className="px-4 py-3">
                      <div data-item className="flex items-center justify-between gap-4">
                        <span className="inline-flex items-center gap-2 text-xs text-white/70">
                          <x.Icon className="h-4 w-4" aria-hidden="true" focusable="false" />
                          {x.label}
                        </span>
                        <span className="truncate font-mono text-xs text-white/85">{x.value}</span>
                      </div>
                    </div>
                  </BorderGlow>
                ))}
              </div>
              <a
                data-item
                href="#top"
                className="mt-4 inline-flex items-center justify-center rounded-[20px] bg-white px-4 py-3 text-sm font-medium text-neutral-950 transition hover:-translate-y-0.5"
              >
                回到顶部 ↑
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
                    window.history.pushState({}, '', '/map')
                    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      </main>

      <FixedFooter themeColors={themeColors} />
      </div>
    </div>
  )
}

export default App
