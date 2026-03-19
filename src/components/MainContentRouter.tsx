import { type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import BorderGlow from './BorderGlow'
import { ContactMap } from './ContactMap'
import { UserDetailsPage } from '../pages/UserDetailsPage'
import { MusicPlayerPage } from '../pages/MusicPlayerPage'

type ChatMsg = { id: string; from: 'system' | 'you'; text: string }

export function MainContentRouter({
  children,
  chatMessages,
  setChatMessages,
  chatInput,
  setChatInput,
  makeId,
}: {
  children: ReactNode
  chatMessages: ChatMsg[]
  setChatMessages: Dispatch<SetStateAction<ChatMsg[]>>
  chatInput: string
  setChatInput: Dispatch<SetStateAction<string>>
  makeId: () => string
}) {
  const location = useLocation()
  const pathname = location.pathname.replace(/\/+$/, '')
  const isMapDetails = pathname === '/map'
  const isUserDetails = pathname === '/user'
  const isMusicDetails = pathname === '/music'

  return (
    <main
      id="top"
      className={
        isMapDetails || isUserDetails || isMusicDetails
          ? 'mx-auto w-full max-w-6xl px-5 pt-[56px] pb-[40px] md:pt-[80px] md:pb-[64px]'
          : 'mx-auto w-full max-w-6xl px-5 pt-16 pb-20 md:pt-[72px]'
      }
    >
      {isMapDetails ? (
        <section className="relative flex h-[calc(100dvh-56px-40px)] flex-col md:h-[calc(100dvh-80px-64px)]">
          <div className="flex h-full w-full flex-col gap-4 md:grid md:grid-cols-[70%_30%]">
            <BorderGlow
              className="flex-1 md:flex-none md:h-full"
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
              <div className="h-full overflow-hidden rounded-[16px] ring-1 ring-white/10">
                <ContactMap
                  zoom={12}
                  showControlsBelow
                  onAction={(action) => {
                    if (action.type === 'pick') {
                      const text = `你点击了地图：${
                        action.label ?? `${action.lat.toFixed(4)},${action.lon.toFixed(4)}`
                      }`
                      setChatMessages((prev) => [...prev, { id: makeId(), from: 'system', text }])
                    } else if (action.type === 'search') {
                      setChatMessages((prev) => [...prev, { id: makeId(), from: 'system', text: `搜索完成：${action.query}` }])
                    } else if (action.type === 'layer') {
                      const layerKey = String(action.layer)
                      const layerName = layerKey.includes('light')
                        ? '浅色'
                        : layerKey.includes('dark')
                          ? '暗色'
                          : layerKey
                      setChatMessages((prev) => [...prev, { id: makeId(), from: 'system', text: `图层切换：${layerName}` }])
                    } else if (action.type === 'reset') {
                      setChatMessages((prev) => [...prev, { id: makeId(), from: 'system', text: '已重置视角' }])
                    }
                  }}
                />
              </div>
            </BorderGlow>

            <BorderGlow
              className="flex-1 min-h-0 md:flex-none md:h-full"
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
              <div className="flex h-full flex-col overflow-hidden rounded-[16px] ring-1 ring-white/10">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="text-sm font-medium text-white/80">聊天列表</div>
                  <div className="text-[11px] text-white/40">本地模拟</div>
                </div>

                <div className="flex-1 overflow-auto px-4 py-3">
                  <div className="flex flex-col gap-2">
                    {chatMessages.map((m) => (
                      <div
                        key={m.id}
                        className={
                          m.from === 'you'
                            ? 'self-end max-w-[85%] rounded-[14px] bg-white/10 px-3 py-2 text-xs text-white/90 ring-1 ring-white/10'
                            : 'self-start max-w-[85%] rounded-[14px] bg-white/5 px-3 py-2 text-xs text-white/80 ring-1 ring-white/10'
                        }
                      >
                        {m.text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="输入消息…"
                    className="w-full rounded-[14px] bg-white/5 px-3 py-2 text-xs text-white/90 ring-1 ring-white/10 outline-none placeholder:text-white/35"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      const v = chatInput.trim()
                      if (!v) return
                      setChatMessages((prev) => [...prev, { id: makeId(), from: 'you', text: v }])
                      setChatInput('')
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = chatInput.trim()
                      if (!v) return
                      setChatMessages((prev) => [...prev, { id: makeId(), from: 'you', text: v }])
                      setChatInput('')
                    }}
                    className="shrink-0 rounded-[14px] bg-white/5 px-3 py-2 text-xs text-white/85 ring-1 ring-white/10 hover:bg-white/10"
                  >
                    发送
                  </button>
                </div>
              </div>
            </BorderGlow>
          </div>
        </section>
      ) : isUserDetails ? (
        <section className="relative">
          <UserDetailsPage />
        </section>
      ) : isMusicDetails ? (
        <section className="relative">
          <MusicPlayerPage />
        </section>
      ) : (
        children
      )}
    </main>
  )
}

