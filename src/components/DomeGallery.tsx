import { useEffect, useMemo, useRef, useCallback, type ReactNode } from 'react'
import { useGesture } from '@use-gesture/react'

type ImageItem = string | { src: string; alt?: string }
type TileItem = { node: ReactNode; alt?: string }

export type DomeGalleryProps = {
  images?: ImageItem[]
  tiles?: TileItem[]
  fit?: number
  fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height'
  minRadius?: number
  maxRadius?: number
  padFactor?: number
  overlayBlurColor?: string
  maxVerticalRotationDeg?: number
  dragSensitivity?: number
  enlargeTransitionMs?: number
  segments?: number
  dragDampening?: number
  openedImageWidth?: string
  openedImageHeight?: string
  imageBorderRadius?: string
  openedImageBorderRadius?: string
  grayscale?: boolean
  autoRotate?: boolean
  autoRotateDegPerSec?: number
  autoRotateIdleMs?: number
  enableEnlarge?: boolean
  tileBgColors?: string[]
  tileBgOpacity?: number
}

type ItemDef = {
  src: string
  alt: string
  tileIndex: number
  x: number
  y: number
  sizeX: number
  sizeY: number
}

const DEFAULT_IMAGES: ImageItem[] = [
  {
    src: 'https://images.unsplash.com/photo-1755331039789-7e5680e26e8f?q=80&w=774&auto=format&fit=crop',
    alt: 'Abstract art',
  },
  {
    src: 'https://images.unsplash.com/photo-1755569309049-98410b94f66d?q=80&w=772&auto=format&fit=crop',
    alt: 'Modern sculpture',
  },
  {
    src: 'https://images.unsplash.com/photo-1755497595318-7e5e3523854f?q=80&w=774&auto=format&fit=crop',
    alt: 'Digital artwork',
  },
  {
    src: 'https://images.unsplash.com/photo-1755353985163-c2a0fe5ac3d8?q=80&w=774&auto=format&fit=crop',
    alt: 'Contemporary art',
  },
  {
    src: 'https://images.unsplash.com/photo-1745965976680-d00be7dc0377?q=80&w=774&auto=format&fit=crop',
    alt: 'Geometric pattern',
  },
  {
    src: 'https://images.unsplash.com/photo-1752588975228-21f44630bb3c?q=80&w=774&auto=format&fit=crop',
    alt: 'Textured surface',
  },
  {
    src: 'https://pbs.twimg.com/media/Gyla7NnXMAAXSo_?format=jpg&name=large',
    alt: 'Social media image',
  },
]

const DEFAULTS = {
  maxVerticalRotationDeg: 5,
  dragSensitivity: 20,
  enlargeTransitionMs: 300,
  segments: 35,
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)
const normalizeAngle = (d: number) => ((d % 360) + 360) % 360
const wrapAngleSigned = (deg: number) => {
  const a = (((deg + 180) % 360) + 360) % 360
  return a - 180
}
const getDataNumber = (el: HTMLElement, name: string, fallback: number) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`)
  const n = attr == null ? Number.NaN : parseFloat(attr)
  return Number.isFinite(n) ? n : fallback
}

function buildItems(pool: ImageItem[], seg: number, tileCount: number): ItemDef[] {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2)
  const evenYs = [-4, -2, 0, 2, 4]
  const oddYs = [-3, -1, 1, 3, 5]

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs
    return ys.map((y, r) => ({ x, y, sizeX: 2, sizeY: 2, c, r }))
  })

  // Stable pseudo-random distribution (no obvious order)
  const mulberry32 = (seed: number) => {
    return function () {
      let t = (seed += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  const shuffle = (arr: number[], rng: () => number) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const tmp = arr[i]
      arr[i] = arr[j]
      arr[j] = tmp
    }
    return arr
  }

  const totalSlots = coords.length
  if (pool.length === 0) {
    return coords.map((c, idx) => ({
      ...c,
      src: '',
      alt: '',
      tileIndex: tileCount ? idx % tileCount : 0,
    }))
  }

  const normalizedImages = pool.map((image) => {
    if (typeof image === 'string') return { src: image, alt: '' }
    return { src: image.src || '', alt: image.alt || '' }
  })

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length])

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i]
          usedImages[i] = usedImages[j]
          usedImages[j] = tmp
          break
        }
      }
    }
  }

  // Neighbor-aware assignment to reduce same-icon adjacency.
  // We assign on a (col,row) grid with 5 rows per column.
  const rowsPerCol = 5
  const colsCount = xCols.length
  const seed = seg * 10007 + tileCount * 97
  const rng = mulberry32(seed)
  const assigned: number[][] = Array.from({ length: colsCount }, () =>
    Array.from({ length: rowsPerCol }, () => -1),
  )

  const allTiles = Array.from({ length: Math.max(1, tileCount) }, (_, i) => i)

  for (let c = 0; c < colsCount; c++) {
    for (let r = 0; r < rowsPerCol; r++) {
      if (tileCount <= 0) {
        assigned[c][r] = 0
        continue
      }

      const forbidden = new Set<number>()
      const left = c > 0 ? assigned[c - 1][r] : -1
      const up = r > 0 ? assigned[c][r - 1] : -1
      const upLeft = c > 0 && r > 0 ? assigned[c - 1][r - 1] : -1
      const downLeft = c > 0 && r < rowsPerCol - 1 ? assigned[c - 1][r + 1] : -1
      if (left >= 0) forbidden.add(left)
      if (up >= 0) forbidden.add(up)
      if (upLeft >= 0) forbidden.add(upLeft)
      if (downLeft >= 0) forbidden.add(downLeft)

      const candidates = shuffle([...allTiles], rng)
      let pick = candidates.find((t) => !forbidden.has(t))
      if (pick == null) {
        // fallback: at least avoid direct left/up if possible
        const forbidden2 = new Set<number>()
        if (left >= 0) forbidden2.add(left)
        if (up >= 0) forbidden2.add(up)
        pick = candidates.find((t) => !forbidden2.has(t)) ?? candidates[0]
      }
      assigned[c][r] = pick
    }
  }

  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    alt: usedImages[i].alt,
    tileIndex: tileCount ? assigned[c.c][c.r] : 0,
  }))
}

function computeItemBaseRotation(offsetX: number, offsetY: number, sizeX: number, sizeY: number, segments: number) {
  const unit = 360 / segments / 2
  const rotateY = unit * (offsetX + (sizeX - 1) / 2)
  const rotateX = unit * (offsetY - (sizeY - 1) / 2)
  return { rotateX, rotateY }
}

export default function DomeGallery({
  images = DEFAULT_IMAGES,
  tiles,
  fit = 0.5,
  fitBasis = 'auto',
  minRadius = 600,
  maxRadius = Infinity,
  padFactor = 0.25,
  overlayBlurColor = '#060010',
  maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg,
  dragSensitivity = DEFAULTS.dragSensitivity,
  enlargeTransitionMs = DEFAULTS.enlargeTransitionMs,
  segments = DEFAULTS.segments,
  dragDampening = 2,
  openedImageWidth: _openedImageWidth = '400px',
  openedImageHeight: _openedImageHeight = '400px',
  imageBorderRadius = '30px',
  openedImageBorderRadius = '30px',
  grayscale = true,
  autoRotate = true,
  autoRotateDegPerSec = 6,
  autoRotateIdleMs = 900,
  enableEnlarge = true,
  tileBgColors = ['#c084fc', '#f472b6', '#38bdf8'],
  tileBgOpacity = 0.22,
}: DomeGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const sphereRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const focusedElRef = useRef<HTMLElement | null>(null)
  const originalTilePositionRef = useRef<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  const rotationRef = useRef({ x: 0, y: 0 })
  const startRotRef = useRef({ x: 0, y: 0 })
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const cancelTapRef = useRef(false)
  const movedRef = useRef(false)
  const inertiaRAF = useRef<number | null>(null)
  const pointerTypeRef = useRef<'mouse' | 'pen' | 'touch'>('mouse')
  const tapTargetRef = useRef<HTMLElement | null>(null)
  const openingRef = useRef(false)
  const openStartedAtRef = useRef(0)
  const lastDragEndAt = useRef(0)
  const lastInteractionAt = useRef(performance.now())

  const scrollLockedRef = useRef(false)
  const lockScroll = useCallback(() => {
    if (scrollLockedRef.current) return
    scrollLockedRef.current = true
    document.body.classList.add('dg-scroll-lock')
  }, [])
  const unlockScroll = useCallback(() => {
    if (!scrollLockedRef.current) return
    if (rootRef.current?.getAttribute('data-enlarging') === 'true') return
    scrollLockedRef.current = false
    document.body.classList.remove('dg-scroll-lock')
  }, [])

  const items = useMemo(
    () => buildItems(images, segments, tiles?.length ?? 0),
    [images, segments, tiles?.length],
  )

  const hexToRgb = useCallback((hex: string) => {
    const h = hex.replace('#', '').trim()
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    if (full.length !== 6) return null
    const n = parseInt(full, 16)
    if (!Number.isFinite(n)) return null
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }, [])

  const tileBgForIndex = useCallback(
    (idx: number) => {
      const c0 = tileBgColors[(idx + 0) % tileBgColors.length] ?? '#ffffff'
      const c1 = tileBgColors[(idx + 1) % tileBgColors.length] ?? c0
      const c2 = tileBgColors[(idx + 2) % tileBgColors.length] ?? c1
      const rgb0 = hexToRgb(c0)
      const rgb1 = hexToRgb(c1)
      const rgb2 = hexToRgb(c2)
      const a = Math.max(0, Math.min(1, tileBgOpacity))
      const s0 = rgb0 ? `rgba(${rgb0.r},${rgb0.g},${rgb0.b},${a})` : `rgba(255,255,255,${a})`
      const s1 = rgb1 ? `rgba(${rgb1.r},${rgb1.g},${rgb1.b},${a * 0.75})` : `rgba(255,255,255,${a * 0.75})`
      const s2 = rgb2 ? `rgba(${rgb2.r},${rgb2.g},${rgb2.b},${a * 0.55})` : `rgba(255,255,255,${a * 0.55})`
      return [
        `radial-gradient(160px 120px at 30% 25%, ${s0} 0px, transparent 60%)`,
        `radial-gradient(180px 140px at 70% 65%, ${s1} 0px, transparent 62%)`,
        `radial-gradient(220px 160px at 55% 35%, ${s2} 0px, transparent 65%)`,
      ].join(', ')
    },
    [hexToRgb, tileBgColors, tileBgOpacity],
  )

  const applyTransform = (xDeg: number, yDeg: number) => {
    const el = sphereRef.current
    if (el) {
      el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`
    }
  }

  const lockedRadiusRef = useRef<number | null>(null)

  const stopInertia = useCallback(() => {
    if (inertiaRAF.current) {
      cancelAnimationFrame(inertiaRAF.current)
      inertiaRAF.current = null
    }
  }, [])

  const startInertia = useCallback(
    (vx: number, vy: number) => {
      const MAX_V = 1.4
      let vX = clamp(vx, -MAX_V, MAX_V) * 80
      let vY = clamp(vy, -MAX_V, MAX_V) * 80
      let frames = 0
      const d = clamp(dragDampening ?? 0.6, 0, 1)
      const frictionMul = 0.94 + 0.055 * d
      const stopThreshold = 0.015 - 0.01 * d
      const maxFrames = Math.round(90 + 270 * d)
      const step = () => {
        vX *= frictionMul
        vY *= frictionMul
        if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
          inertiaRAF.current = null
          return
        }
        if (++frames > maxFrames) {
          inertiaRAF.current = null
          return
        }
        const nextX = clamp(rotationRef.current.x - vY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg)
        const nextY = wrapAngleSigned(rotationRef.current.y + vX / 200)
        rotationRef.current = { x: nextX, y: nextY }
        applyTransform(nextX, nextY)
        inertiaRAF.current = requestAnimationFrame(step)
      }
      stopInertia()
      inertiaRAF.current = requestAnimationFrame(step)
    },
    [dragDampening, maxVerticalRotationDeg, stopInertia],
  )

  const openItemFromElement = useCallback(
    (el: HTMLElement) => {
      if (!enableEnlarge) return
      if (tiles && tiles.length > 0) return
      if (openingRef.current) return
      openingRef.current = true
      openStartedAtRef.current = performance.now()
      lockScroll()

      const parent = el.parentElement as HTMLElement
      focusedElRef.current = el
      el.setAttribute('data-focused', 'true')

      const offsetX = getDataNumber(parent, 'offsetX', 0)
      const offsetY = getDataNumber(parent, 'offsetY', 0)
      const sizeX = getDataNumber(parent, 'sizeX', 2)
      const sizeY = getDataNumber(parent, 'sizeY', 2)
      const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments)
      const parentY = normalizeAngle(parentRot.rotateY)
      const globalY = normalizeAngle(rotationRef.current.y)
      let rotY = (-(parentY + globalY) % 360) as number
      if (rotY < -180) rotY += 360
      const rotX = -parentRot.rotateX - rotationRef.current.x
      parent.style.setProperty('--rot-y-delta', `${rotY}deg`)
      parent.style.setProperty('--rot-x-delta', `${rotX}deg`)

      const refDiv = document.createElement('div')
      refDiv.className = 'item__image item__image--reference opacity-0'
      refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`
      parent.appendChild(refDiv)

      void refDiv.offsetHeight

      const tileR = refDiv.getBoundingClientRect()
      const mainR = mainRef.current?.getBoundingClientRect()
      const frameR = frameRef.current?.getBoundingClientRect()
      if (!mainR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
        openingRef.current = false
        focusedElRef.current = null
        parent.removeChild(refDiv)
        unlockScroll()
        return
      }

      originalTilePositionRef.current = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height }
      el.style.visibility = 'hidden'
      ;(el.style as any).zIndex = 0

      const overlay = document.createElement('div')
      overlay.className = 'enlarge'
      overlay.style.cssText = `position:absolute; left:${frameR.left - mainR.left}px; top:${frameR.top - mainR.top}px; width:${frameR.width}px; height:${frameR.height}px; opacity:0; z-index:30; will-change:transform,opacity; transform-origin:top left; transition:transform ${enlargeTransitionMs}ms ease, opacity ${enlargeTransitionMs}ms ease; border-radius:${openedImageBorderRadius}; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,.35);`

      const rawSrc = parent.dataset.src || (el.querySelector('img') as HTMLImageElement | null)?.src || ''
      const rawAlt = parent.dataset.alt || (el.querySelector('img') as HTMLImageElement | null)?.alt || ''
      const img = document.createElement('img')
      img.src = rawSrc
      img.alt = rawAlt
      img.style.cssText = `width:100%; height:100%; object-fit:cover; filter:${grayscale ? 'grayscale(1)' : 'none'};`
      overlay.appendChild(img)
      viewerRef.current!.appendChild(overlay)

      const tx0 = tileR.left - frameR.left
      const ty0 = tileR.top - frameR.top
      const sx0 = tileR.width / frameR.width
      const sy0 = tileR.height / frameR.height
      const validSx0 = Number.isFinite(sx0) && sx0 > 0 ? sx0 : 1
      const validSy0 = Number.isFinite(sy0) && sy0 > 0 ? sy0 : 1

      overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`
      setTimeout(() => {
        if (!overlay.parentElement) return
        overlay.style.opacity = '1'
        overlay.style.transform = 'translate(0px, 0px) scale(1, 1)'
        rootRef.current?.setAttribute('data-enlarging', 'true')
      }, 16)
    },
    [enableEnlarge, enlargeTransitionMs, grayscale, lockScroll, openedImageBorderRadius, segments, tiles, unlockScroll],
  )

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect
      const w = Math.max(1, cr.width)
      const h = Math.max(1, cr.height)
      const minDim = Math.min(w, h)
      const maxDim = Math.max(w, h)
      const aspect = w / h
      let basis: number
      switch (fitBasis) {
        case 'min':
          basis = minDim
          break
        case 'max':
          basis = maxDim
          break
        case 'width':
          basis = w
          break
        case 'height':
          basis = h
          break
        default:
          basis = aspect >= 1.3 ? w : minDim
      }
      let radius = basis * fit
      const heightGuard = h * 1.35
      radius = Math.min(radius, heightGuard)
      radius = clamp(radius, minRadius, maxRadius)
      lockedRadiusRef.current = Math.round(radius)

      const viewerPad = Math.max(8, Math.round(minDim * padFactor))
      root.style.setProperty('--radius', `${lockedRadiusRef.current}px`)
      root.style.setProperty('--viewer-pad', `${viewerPad}px`)
      root.style.setProperty('--overlay-blur-color', overlayBlurColor)
      root.style.setProperty('--tile-radius', imageBorderRadius)
      root.style.setProperty('--enlarge-radius', openedImageBorderRadius)
      root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none')
      applyTransform(rotationRef.current.x, rotationRef.current.y)
    })
    ro.observe(root)
    return () => ro.disconnect()
  }, [
    fit,
    fitBasis,
    imageBorderRadius,
    maxRadius,
    minRadius,
    openedImageBorderRadius,
    overlayBlurColor,
    padFactor,
    grayscale,
  ])

  useEffect(() => {
    applyTransform(rotationRef.current.x, rotationRef.current.y)
  }, [])

  useEffect(() => {
    const scrim = scrimRef.current
    if (!scrim) return

    const close = () => {
      if (performance.now() - openStartedAtRef.current < 250) return
      const el = focusedElRef.current
      if (!el) return
      const parent = el.parentElement as HTMLElement
      const overlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement | null
      if (!overlay) return

      overlay.remove()
      const refDiv = parent.querySelector('.item__image--reference') as HTMLElement | null
      if (refDiv) refDiv.remove()
      parent.style.setProperty('--rot-y-delta', `0deg`)
      parent.style.setProperty('--rot-x-delta', `0deg`)
      el.style.visibility = ''
      ;(el.style as any).zIndex = 0
      focusedElRef.current = null
      rootRef.current?.removeAttribute('data-enlarging')
      openingRef.current = false
      unlockScroll()
    }

    scrim.addEventListener('click', close)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      scrim.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [unlockScroll])

  useGesture(
    {
      onDragStart: ({ event }) => {
        if (focusedElRef.current) return
        stopInertia()
        lastInteractionAt.current = performance.now()

        const evt = event as PointerEvent
        pointerTypeRef.current = ((evt.pointerType as any) || 'mouse') as any
        if (pointerTypeRef.current === 'touch') evt.preventDefault()
        if (pointerTypeRef.current === 'touch') lockScroll()
        draggingRef.current = true
        cancelTapRef.current = false
        movedRef.current = false
        startRotRef.current = { ...rotationRef.current }
        startPosRef.current = { x: evt.clientX, y: evt.clientY }
        const potential = (evt.target as Element).closest?.('.item__image') as HTMLElement | null
        tapTargetRef.current = potential || null
      },
      onDrag: ({ event, last, velocity: velArr = [0, 0], direction: dirArr = [0, 0], movement }) => {
        if (focusedElRef.current || !draggingRef.current || !startPosRef.current) return
        lastInteractionAt.current = performance.now()

        const evt = event as PointerEvent
        if (pointerTypeRef.current === 'touch') evt.preventDefault()

        const dxTotal = evt.clientX - startPosRef.current.x
        const dyTotal = evt.clientY - startPosRef.current.y

        if (!movedRef.current) {
          const dist2 = dxTotal * dxTotal + dyTotal * dyTotal
          if (dist2 > 16) movedRef.current = true
        }

        const nextX = clamp(startRotRef.current.x - dyTotal / dragSensitivity, -maxVerticalRotationDeg, maxVerticalRotationDeg)
        const nextY = startRotRef.current.y + dxTotal / dragSensitivity

        const cur = rotationRef.current
        if (cur.x !== nextX || cur.y !== nextY) {
          rotationRef.current = { x: nextX, y: nextY }
          applyTransform(nextX, nextY)
        }

        if (last) {
          draggingRef.current = false
          let isTap = false

          const dx = evt.clientX - startPosRef.current.x
          const dy = evt.clientY - startPosRef.current.y
          const dist2 = dx * dx + dy * dy
          const TAP_THRESH_PX = pointerTypeRef.current === 'touch' ? 10 : 6
          if (dist2 <= TAP_THRESH_PX * TAP_THRESH_PX) isTap = true

          let [vMagX, vMagY] = velArr
          const [dirX, dirY] = dirArr
          let vx = vMagX * dirX
          let vy = vMagY * dirY

          if (!isTap && Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001 && Array.isArray(movement)) {
            const [mx, my] = movement
            vx = (mx / dragSensitivity) * 0.02
            vy = (my / dragSensitivity) * 0.02
          }

          if (!isTap && (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005)) {
            startInertia(vx, vy)
          }
          startPosRef.current = null
          cancelTapRef.current = !isTap

          if (isTap && tapTargetRef.current && !focusedElRef.current) {
            openItemFromElement(tapTargetRef.current)
          }
          tapTargetRef.current = null

          if (cancelTapRef.current) setTimeout(() => (cancelTapRef.current = false), 120)
          if (pointerTypeRef.current === 'touch') unlockScroll()
          if (movedRef.current) lastDragEndAt.current = performance.now()
          movedRef.current = false
        }
      },
    },
    { target: mainRef, eventOptions: { passive: false } },
  )

  useEffect(() => {
    if (!autoRotate) return
    let raf = 0
    let lastT = performance.now()

    const step = (tNow: number) => {
      const dt = Math.min(0.033, (tNow - lastT) / 1000)
      lastT = tNow

      const idleFor = tNow - lastInteractionAt.current
      const shouldRotate =
        idleFor >= autoRotateIdleMs &&
        !draggingRef.current &&
        !focusedElRef.current &&
        !openingRef.current &&
        !inertiaRAF.current

      if (shouldRotate) {
        const nextY = wrapAngleSigned(rotationRef.current.y + autoRotateDegPerSec * dt)
        const nextX = rotationRef.current.x
        rotationRef.current = { x: nextX, y: nextY }
        applyTransform(nextX, nextY)
      }

      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [autoRotate, autoRotateDegPerSec, autoRotateIdleMs])

  useEffect(() => () => document.body.classList.remove('dg-scroll-lock'), [])

  const cssStyles = `
  .sphere-root {
    --radius: 520px;
    --viewer-pad: 72px;
    --circ: calc(var(--radius) * 3.14);
    --rot-y: calc((360deg / var(--segments-x)) / 2);
    --rot-x: calc((360deg / var(--segments-y)) / 2);
    --item-width: calc(var(--circ) / var(--segments-x));
    --item-height: calc(var(--circ) / var(--segments-y));
  }

  .sphere-root * { box-sizing: border-box; }
  .sphere, .sphere-item, .item__image { transform-style: preserve-3d; }

  .stage {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    position: absolute;
    inset: 0;
    margin: auto;
    perspective: calc(var(--radius) * 2);
    perspective-origin: 50% 50%;
  }

  .sphere {
    transform: translateZ(calc(var(--radius) * -1));
    will-change: transform;
    position: absolute;
  }

  .sphere-item {
    width: calc(var(--item-width) * var(--item-size-x));
    height: calc(var(--item-height) * var(--item-size-y));
    position: absolute;
    top: -999px;
    bottom: -999px;
    left: -999px;
    right: -999px;
    margin: auto;
    transform-origin: 50% 50%;
    backface-visibility: hidden;
    transition: transform 300ms;
    transform:
      rotateY(calc(var(--rot-y) * (var(--offset-x) + ((var(--item-size-x) - 1) / 2)) + var(--rot-y-delta, 0deg)))
      rotateX(calc(var(--rot-x) * (var(--offset-y) - ((var(--item-size-y) - 1) / 2)) + var(--rot-x-delta, 0deg)))
      translateZ(var(--radius));
  }

  .sphere-root[data-enlarging="true"] .scrim {
    opacity: 1 !important;
    pointer-events: all !important;
  }

  @media (max-aspect-ratio: 1/1) {
    .viewer-frame {
      height: auto !important;
      width: 100% !important;
    }
  }

  body.dg-scroll-lock {
    overflow: hidden !important;
    touch-action: none !important;
    overscroll-behavior: contain !important;
  }

  .item__image {
    position: absolute;
    inset: 10px;
    border-radius: var(--tile-radius, 12px);
    overflow: hidden;
    cursor: pointer;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transition: transform 300ms;
    pointer-events: auto;
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }

  .item__image--reference {
    position: absolute;
    inset: 10px;
    pointer-events: none;
  }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />
      <div
        ref={rootRef}
        className="sphere-root relative h-full w-full"
        style={
          {
            ['--segments-x' as any]: segments,
            ['--segments-y' as any]: segments,
            ['--overlay-blur-color' as any]: overlayBlurColor,
            ['--tile-radius' as any]: imageBorderRadius,
            ['--enlarge-radius' as any]: openedImageBorderRadius,
            ['--image-filter' as any]: grayscale ? 'grayscale(1)' : 'none',
          } as React.CSSProperties
        }
      >
        <main
          ref={mainRef}
          className="absolute inset-0 grid select-none place-items-center overflow-hidden bg-transparent"
          style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
        >
          <div className="stage">
            <div ref={sphereRef} className="sphere">
              {items.map((it, i) => (
                <div
                  key={`${it.x},${it.y},${i}`}
                  className="sphere-item absolute m-auto"
                  data-src={it.src}
                  data-alt={it.alt}
                  data-offset-x={it.x}
                  data-offset-y={it.y}
                  data-size-x={it.sizeX}
                  data-size-y={it.sizeY}
                  style={
                    {
                      ['--offset-x' as any]: it.x,
                      ['--offset-y' as any]: it.y,
                      ['--item-size-x' as any]: it.sizeX,
                      ['--item-size-y' as any]: it.sizeY,
                      top: '-999px',
                      bottom: '-999px',
                      left: '-999px',
                      right: '-999px',
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="item__image absolute block cursor-pointer overflow-hidden bg-transparent transition-transform duration-300"
                    role="button"
                    tabIndex={0}
                    aria-label={it.alt || 'Open image'}
                    onClick={(e) => {
                      if (draggingRef.current) return
                      if (movedRef.current) return
                      if (performance.now() - lastDragEndAt.current < 80) return
                      if (openingRef.current) return
                      openItemFromElement(e.currentTarget as HTMLElement)
                    }}
                    onPointerUp={(e) => {
                      if ((e.nativeEvent as PointerEvent).pointerType !== 'touch') return
                      if (draggingRef.current) return
                      if (movedRef.current) return
                      if (performance.now() - lastDragEndAt.current < 80) return
                      if (openingRef.current) return
                      openItemFromElement(e.currentTarget as HTMLElement)
                    }}
                    style={{
                      inset: '10px',
                      borderRadius: `var(--tile-radius, ${imageBorderRadius})`,
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    {tiles && tiles.length > 0 ? (
                      <div
                        className="grid h-full w-full place-items-center"
                        style={{
                          background: tileBgForIndex(it.tileIndex),
                        }}
                      >
                        <div className="pointer-events-none grid place-items-center">
                          <div className="h-16 w-16 md:h-20 md:w-20 opacity-95">
                            {tiles[it.tileIndex]?.node}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={it.src}
                        draggable={false}
                        alt={it.alt}
                        className="pointer-events-none h-full w-full object-cover"
                        style={{
                          backfaceVisibility: 'hidden',
                          filter: `var(--image-filter, ${grayscale ? 'grayscale(1)' : 'none'})`,
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-0 z-[3] m-auto"
            style={{
              backgroundImage: `radial-gradient(rgba(235, 235, 235, 0) 65%, var(--overlay-blur-color, ${overlayBlurColor}) 100%)`,
            }}
          />

          <div
            className="pointer-events-none absolute inset-0 z-[3] m-auto"
            style={{
              WebkitMaskImage: `radial-gradient(rgba(235, 235, 235, 0) 70%, var(--overlay-blur-color, ${overlayBlurColor}) 90%)`,
              maskImage: `radial-gradient(rgba(235, 235, 235, 0) 70%, var(--overlay-blur-color, ${overlayBlurColor}) 90%)`,
              backdropFilter: 'blur(3px)',
            }}
          />

          <div
            ref={viewerRef}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            style={{ padding: 'var(--viewer-pad)' }}
          >
            <div
              ref={scrimRef}
              className="scrim pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500"
              style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(3px)' }}
            />
            <div
              ref={frameRef}
              className="viewer-frame flex h-full aspect-square"
              style={{ borderRadius: `var(--enlarge-radius, ${openedImageBorderRadius})` }}
            />
          </div>
        </main>
      </div>
    </>
  )
}

