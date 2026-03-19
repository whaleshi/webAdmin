import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMusic } from '../state/MusicContext'

/**
 * FloatingMusicWidget 
 * 接入全局 MusicContext
 */
export function FloatingStatusWidget() {
  const navigate = useNavigate()
  const { track, isPlaying, progress, isLoading, togglePlay, nextTrack, prevTrack } = useMusic()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="fixed right-4 top-1/2 z-[60] -translate-y-1/2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        onClick={() => navigate('/music')}
        className={`
          group relative cursor-pointer overflow-hidden rounded-[24px] border border-white/10 
          bg-[#060010]/80 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          hover:border-pink-500/30 hover:bg-[#060010]/95
          ${isHovered 
            ? 'w-60 p-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6),0_0_30px_rgba(244,114,182,0.15)]' 
            : 'w-[56px] h-[56px] flex items-center justify-center shadow-lg'
          }
        `}
      >
        <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-500/10 blur-[40px] transition-opacity duration-700 ${isHovered ? 'opacity-100' : 'opacity-40'}`} />
        
        {!isHovered ? (
          <div className="relative flex items-center justify-center">
            <div className={`h-10 w-10 overflow-hidden rounded-full ring-2 ring-white/10 transition-transform duration-[3s] linear infinite ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`}>
              <img src={track.cover} alt="cover" className="h-full w-full object-cover opacity-80" />
            </div>
            <div className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ${isPlaying ? 'bg-pink-500' : 'bg-white/20'} shadow-sm transition-colors`}>
                {isLoading ? (
                    <div className="h-2 w-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : isPlaying ? (
                    <div className="flex items-end gap-[1.5px] h-2">
                        <div className="w-[1.5px] bg-white animate-[musicBar_0.8s_ease-in-out_infinite]" style={{ height: '60%' }} />
                        <div className="w-[1.5px] bg-white animate-[musicBar_0.8s_ease-in-out_infinite_0.2s]" style={{ height: '100%' }} />
                        <div className="w-[1.5px] bg-white animate-[musicBar_0.8s_ease-in-out_infinite_0.4s]" style={{ height: '40%' }} />
                    </div>
                ) : (
                    <div className="w-0 h-0 border-l-[5px] border-l-white border-y-[4px] border-y-transparent ml-0.5" />
                )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Global Sync</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-500/10 ring-1 ring-pink-500/20">
                <span className="text-[9px] font-bold text-pink-400 uppercase">Synced</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10 shadow-lg relative group/cover">
                  <img src={track.cover} alt="cover" className="h-full w-full object-cover" />
                  <div 
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity"
                  >
                    {isPlaying ? (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                  </div>
               </div>
               <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-white/95 leading-tight">{track.name}</div>
                  <div className="mt-1.5 truncate text-[12px] text-white/45 font-medium">{track.artist}</div>
               </div>
            </div>

            <div className="space-y-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                         <div 
                            onClick={(e) => { e.stopPropagation(); prevTrack(); }}
                            className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors shadow-md bg-white/10 hover:bg-white/20`}
                         >
                            <svg className="w-4 h-4 text-white/40 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6L18 18V6z"/></svg>
                         </div>
                         <div 
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                            className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors shadow-md ${isPlaying ? 'bg-pink-500' : 'bg-white/10 hover:bg-white/20'}`}
                         >
                            {isPlaying ? (
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                         </div>
                         <div 
                            onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                            className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors shadow-md bg-white/10 hover:bg-white/20`}
                         >
                            <svg className="w-4 h-4 text-white/40 hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
                         </div>
                    </div>
                    <div className="group/btn flex items-center gap-1">
                        <span className="text-[10px] text-white/30 group-hover/btn:text-pink-400 transition-colors">Details</span>
                        <svg className="w-2.5 h-2.5 text-white/20 group-hover/btn:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth={3}/></svg>
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes musicBar {
            0%, 100% { height: 30%; }
            50% { height: 100%; }
          }
        `}
      </style>
    </div>
  )
}
