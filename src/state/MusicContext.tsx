import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'

interface TrackInfo {
  id: string
  name: string
  artist: string
  cover: string
  url: string
  lrc: string
}

interface MusicContextType {
  track: TrackInfo
  isPlaying: boolean
  progress: number
  currentTime: number
  duration: number
  isLoading: boolean
  playlist: TrackInfo[]
  currentIndex: number
  togglePlay: () => void
  nextTrack: () => void
  prevTrack: () => void
  playSpecific: (index: number) => void
}

const MusicContext = createContext<MusicContextType | null>(null)

export function MusicProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylist] = useState<TrackInfo[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  
  const [track, setTrack] = useState<TrackInfo>({
    id: '', name: 'Loading...', artist: 'Meting API', cover: '/whale.png', url: '', lrc: ''
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasInteracted = useRef(false)

  // 1. 获取歌单
  useEffect(() => {
    const fetchPlaylist = async () => {
      setIsLoading(true)
      try {
        const res = await fetch('https://api.i-meto.com/meting/api?server=netease&type=playlist&id=3778678')
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((item: any) => ({
            id: item.id || item.url || Math.random().toString(36).slice(2),
            name: item.title,
            artist: item.author,
            cover: item.pic,
            url: item.url,
            lrc: item.lrc
          }))
          setPlaylist(formatted)
          const idx = Math.floor(Math.random() * formatted.length)
          setCurrentIndex(idx)
          setTrack(formatted[idx])
        }
      } catch (err) {
        console.error('Playlist Fetch Error:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPlaylist()
  }, [])

  // 2. 核心：监听索引变化并尝试播放
  useEffect(() => {
    if (currentIndex >= 0 && playlist[currentIndex]) {
      const target = playlist[currentIndex]
      setTrack(target)
      setProgress(0)
      setCurrentTime(0)
      
      if (audioRef.current) {
        audioRef.current.src = target.url
        // 尝试自动播放（可能会被浏览器拦截）
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            console.log('Autoplay blocked. Waiting for user interaction to unlock sound.')
            setIsPlaying(false)
          })
      }
    }
  }, [currentIndex, playlist])

  // 3. 解决“一进页面不播放”：监听全文档首次点击解锁音频
  useEffect(() => {
    const unlockAudio = () => {
      if (hasInteracted.current) return
      if (audioRef.current && currentIndex >= 0) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true)
            hasInteracted.current = true
            // 解锁后移除监听
            document.removeEventListener('click', unlockAudio)
            document.removeEventListener('touchstart', unlockAudio)
          })
          .catch(e => console.warn('Unlock failed', e))
      }
    }

    document.addEventListener('click', unlockAudio)
    document.addEventListener('touchstart', unlockAudio) // 兼容手机端

    return () => {
      document.removeEventListener('click', unlockAudio)
      document.removeEventListener('touchstart', unlockAudio)
    }
  }, [currentIndex])

  const togglePlay = () => {
    if (!audioRef.current || !track.url) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
      hasInteracted.current = true
    }
  }

  const playSpecific = (index: number) => {
    setCurrentIndex(index)
    setIsPlaying(true)
    hasInteracted.current = true
  }

  const nextTrack = () => {
    if (playlist.length === 0) return
    const nextIdx = (currentIndex + 1) % playlist.length
    setCurrentIndex(nextIdx)
    setIsPlaying(true)
  }

  const prevTrack = () => {
    if (playlist.length === 0) return
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length
    setCurrentIndex(prevIdx)
    setIsPlaying(true)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime
      const dur = audioRef.current.duration
      setCurrentTime(cur)
      setDuration(dur)
      if (dur > 0) setProgress((cur / dur) * 100)
      if (dur > 0 && dur < 40 && cur > 5) nextTrack()
    }
  }

  return (
    <MusicContext.Provider value={{ 
      track, isPlaying, progress, currentTime, duration, isLoading, playlist, currentIndex,
      togglePlay, nextTrack, prevTrack, playSpecific 
    }}>
      {children}
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={nextTrack}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        referrerPolicy="no-referrer"
      />
    </MusicContext.Provider>
  )
}

export function useMusic() {
  const v = useContext(MusicContext)
  if (!v) throw new Error('useMusic must be used within MusicProvider')
  return v
}
