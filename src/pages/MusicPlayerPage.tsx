import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMusic } from '../state/MusicContext'

interface LyricLine {
  time: number
  text: string
}

export function MusicPlayerPage() {
  const navigate = useNavigate()
  const { track, isPlaying, progress, currentTime, duration, togglePlay, nextTrack, prevTrack, playlist, playSpecific, currentIndex } = useMusic()
  
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const lyricContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const loadLyrics = async () => {
      if (!track.lrc) {
        setLyrics([])
        return
      }
      try {
        const res = await fetch(track.lrc)
        const text = await res.text()
        const lines = text.split('\n')
        const parsed: LyricLine[] = []
        const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/
        
        lines.forEach(line => {
          const match = timeReg.exec(line)
          if (match) {
            const min = parseInt(match[1])
            const sec = parseInt(match[2])
            const ms = parseInt(match[3])
            const time = min * 60 + sec + (ms > 99 ? ms / 1000 : ms / 100)
            const content = line.replace(timeReg, '').trim()
            if (content) parsed.push({ time, text: content })
          }
        })
        setLyrics(parsed.sort((a, b) => a.time - b.time))
      } catch (err) {
        console.warn('Lyrics fetch failed')
      }
    }
    loadLyrics()
  }, [track.id, track.lrc])

  useEffect(() => {
    let index = -1
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) index = i
      else break
    }
    
    if (index !== currentLineIndex) {
      setCurrentLineIndex(index)
      if (lyricContainerRef.current) {
         const activeLine = lyricContainerRef.current.children[index] as HTMLElement
         if (activeLine) {
            lyricContainerRef.current.scrollTo({
                top: activeLine.offsetTop - lyricContainerRef.current.clientHeight / 2 + 20,
                behavior: 'smooth'
            })
         }
      }
    }
  }, [currentTime, lyrics, currentLineIndex])

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const rs = Math.floor(s % 60)
    return `${m}:${rs.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative min-h-[85vh] w-full overflow-hidden rounded-[32px] md:rounded-[40px] bg-[#060010]/60 p-4 md:p-8 backdrop-blur-3xl ring-1 ring-white/10 mb-24 md:mb-0 pb-32 md:pb-8">
      <div 
        className="absolute inset-0 -z-10 opacity-30 blur-[120px] saturate-200 transition-all duration-1000"
        style={{ backgroundImage: `url(${track.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      {/* 顶部标题栏 */}
      <div className="mb-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
            <button 
                onClick={() => navigate('/')}
                className="group flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition-all"
            >
                <svg className="h-4 w-4 text-white/60 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <div>
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] leading-none mb-1.5">Music Lab</div>
                <div className="text-xs font-bold text-white/70 tracking-tight">Audio Workstation</div>
            </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 ring-1 ring-white/10">
            <div className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Mastering</span>
        </div>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between h-full relative z-10">
        <div className="flex flex-col items-center lg:w-[45%] lg:sticky lg:top-8">
          <div className="group relative">
            <div className={`relative h-64 w-64 md:h-80 md:w-80 lg:h-[380px] lg:w-[380px] overflow-hidden rounded-full border-[12px] border-black shadow-[0_40px_80px_-15px_rgba(0,0,0,0.9)] transition-transform duration-[12s] linear infinite ${isPlaying ? 'animate-[spin_12s_linear_infinite]' : ''}`}>
              <img src={track.cover} alt="cover" className="h-full w-full object-cover opacity-95" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)]" />
            </div>
            <div className="absolute inset-0 m-auto h-16 w-16 md:h-24 md:w-24 rounded-full bg-[#060010] border-4 border-white/5 shadow-inner flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-white/5 ring-1 ring-white/10" />
            </div>
          </div>

          <div className="mt-10 text-center w-full max-w-lg px-4">
            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl lg:text-6xl line-clamp-2 leading-[1.1]">{track.name}</h1>
            <div className="mt-4 flex items-center justify-center gap-4">
                <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{track.artist}</span>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Lossless</span>
            </div>
          </div>

          <div className="hidden lg:flex w-full flex-col items-center gap-10 mt-12">
             <div className="flex items-center gap-6 w-full px-8">
                <span className="text-[11px] font-mono font-bold text-white/20 w-12">{formatTime(currentTime)}</span>
                <div className="group relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                    <div className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-300 shadow-[0_0_20px_rgba(34,211,238,0.4)]" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[11px] font-mono font-bold text-white/20 w-12 text-right">{formatTime(duration)}</span>
             </div>

             <div className="flex items-center justify-center gap-12">
                <button onClick={prevTrack} className="text-white/30 hover:text-white transition-all hover:scale-110 active:scale-90 focus:outline-none">
                    <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6L18 18V6z"/></svg>
                </button>
                <button onClick={togglePlay} className="h-20 w-20 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] active:scale-95 focus:outline-none">
                    {isPlaying ? (
                        <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg className="h-10 w-10 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>
                <button onClick={nextTrack} className="text-white/30 hover:text-white transition-all hover:scale-110 active:scale-90 focus:outline-none">
                    <svg className="h-9 w-9" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
                </button>
             </div>

             {/* 音频频谱：优雅的呼吸波浪，彻底解决抽搐感 */}
             <div className="flex items-end justify-center gap-[4px] h-16 w-full px-10 opacity-40">
                {[...Array(80)].map((_, i) => {
                    const waveHeight = 20 + Math.abs(Math.sin(i * 0.12)) * 70;
                    const duration = 1.2 + Math.sin(i * 0.5) * 0.4;
                    return (
                        <div 
                            key={i} 
                            className={`w-[3px] rounded-full bg-gradient-to-t from-cyan-500/10 via-purple-500/60 to-cyan-400 transition-all duration-700 ${isPlaying ? 'animate-musicBar' : 'h-1'}`}
                            style={{ 
                                animationDelay: `${i * 0.02}s`,
                                animationDuration: `${duration}s`,
                                // @ts-ignore
                                '--bar-height': `${waveHeight}%`,
                                height: isPlaying ? 'auto' : '4px'
                            }}
                        />
                    );
                })}
             </div>
          </div>
        </div>

        {/* 右侧：歌词墙 */}
        <div className="flex flex-1 flex-col gap-10 lg:w-[50%] h-full">
          <div className="relative flex h-[350px] md:h-[450px] lg:h-[520px] flex-col overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#060010]/0 to-transparent z-10" />
            <div 
                ref={lyricContainerRef}
                className="flex-1 overflow-y-auto px-4 md:px-8 py-32 transition-all no-scrollbar"
                style={{ scrollbarWidth: 'none' }}
            >
                {lyrics.length > 0 ? (
                    lyrics.map((line, i) => (
                        <div 
                            key={i}
                            className={`py-4 md:py-5 text-xl md:text-3xl lg:text-4xl font-black transition-all duration-700 ${
                                currentLineIndex === i 
                                    ? 'text-white scale-105 origin-left drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]' 
                                    : 'text-white/5 blur-[1.5px] hover:text-white/20'
                            }`}
                        >
                            {line.text}
                        </div>
                    ))
                ) : (
                    <div className="flex h-full items-center justify-center text-white/5 text-3xl font-black italic uppercase tracking-tighter">
                        Streaming Data...
                    </div>
                )}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#060010]/0 to-transparent z-10" />
          </div>

          <div className="mt-auto">
            <div className="mb-6 flex items-center justify-between px-2">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Up Next</span>
                </div>
            </div>
            <div className={`grid grid-flow-col auto-cols-max gap-4 overflow-x-auto pb-8 no-scrollbar ${playlist.length > 5 ? 'lg:grid-rows-2' : 'lg:grid-rows-1'}`}>
                {playlist.map((item, idx) => {
                    const isCurrent = idx === currentIndex || playlist.indexOf(item) === currentIndex
                    return (
                        <div 
                            key={item.id + idx}
                            onClick={() => playSpecific(playlist.indexOf(item))}
                            className={`group relative h-20 w-20 md:h-24 md:w-24 flex-shrink-0 cursor-pointer overflow-hidden rounded-[24px] ring-1 transition-all duration-500 ${isCurrent ? 'ring-cyan-500 scale-90 shadow-[0_0_40px_rgba(34,211,238,0.4)]' : 'ring-white/10 hover:ring-white/30 hover:-translate-y-1'}`}
                        >
                            <img src={item.cover} alt="cover" className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-115 ${isCurrent ? 'opacity-40' : 'opacity-50 group-hover:opacity-100'}`} />
                            {isCurrent && (
                                <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10">
                                    <div className="flex items-end gap-1.5 h-6">
                                        <div className="w-1 bg-cyan-400 animate-[musicBar_0.8s_infinite]" />
                                        <div className="w-1 bg-cyan-400 animate-[musicBar_0.8s_infinite_0.2s]" />
                                        <div className="w-1 bg-cyan-400 animate-[musicBar_0.8s_infinite_0.4s]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
          </div>
        </div>
      </div>

      {/* 移动端底部固定控制栏 (提升层级至 z-[100]) */}
      <div className="fixed bottom-0 inset-x-0 z-[100] lg:hidden px-6 py-6 bg-[#0b0f19]/95 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
         <div className="flex flex-col gap-5 max-w-md mx-auto">
            {/* 进度条 */}
            <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-white/30 w-10">{formatTime(currentTime)}</span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-mono text-white/30 w-10 text-right">{formatTime(duration)}</span>
            </div>
            
            {/* 控制按钮 */}
            <div className="flex items-center justify-around px-4">
                <button onClick={prevTrack} className="text-white/40 active:scale-75 transition-transform p-2 focus:outline-none">
                    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6L18 18V6z"/></svg>
                </button>
                <button onClick={togglePlay} className="h-14 w-14 rounded-full bg-white flex items-center justify-center text-black active:scale-90 transition-transform shadow-lg focus:outline-none">
                    {isPlaying ? (
                        <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg className="h-7 w-7 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>
                <button onClick={nextTrack} className="text-white/40 active:scale-75 transition-transform p-2 focus:outline-none">
                    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
                </button>
            </div>
         </div>
      </div>

      <style>
        {`
          @keyframes musicBar {
            0%, 100% { height: 15%; opacity: 0.5; transform: scaleY(1); }
            50% { height: var(--bar-height, 100%); opacity: 1; transform: scaleY(1.1); }
          }
          .animate-musicBar {
            animation: musicBar 1.5s ease-in-out infinite;
          }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}
      </style>
    </div>
  )
}
