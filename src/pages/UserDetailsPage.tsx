import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import { useWallet } from '@solana/wallet-adapter-react'
import BorderGlow from '../components/BorderGlow'
import { useAuth } from '../state/AuthContext'
import { equipMeAsset, getMeAssets, type GroupedAssets } from '../lib/meApi'
import { AvatarDisplay } from '../components/AvatarDisplay'

function shortAddress(a: string, head = 6, tail = 4) {
  if (!a) return ''
  if (a.length <= head + tail) return a
  return `${a.slice(0, head)}...${a.slice(-tail)}`
}

export function UserDetailsPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const chain = (params.get('chain') === 'sol' ? 'sol' : 'bnb') as 'bnb' | 'sol'

  const { address, isConnected } = useAccount()
  const { connected, publicKey, disconnect } = useWallet()
  const { disconnect: disconnectBnb } = useDisconnect()

  const { auth, setAuthFromBackendResponse, clearAuth } = useAuth()

  const [assets, setAssets] = useState<GroupedAssets>({})
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [assetsError, setAssetsError] = useState<string | null>(null)
  const didInitialFetchRef = useRef(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editNickname, setEditNickname] = useState('')
  const [editSignature, setEditSignature] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')

  const addressText = useMemo(() => {
    if (chain === 'bnb') return isConnected ? shortAddress(address ?? '') : '未连接'
    return connected ? shortAddress(publicKey?.toBase58() ?? '') : '未连接'
  }, [chain, isConnected, address, connected, publicKey])

  const storedUser = useMemo(() => {
    // 兼容后端不同返回结构：既可能是 { user: {...}, equipped_assets: [...] }
    // 也可能是 { user: { user: {...}, ... } }
    const u = auth?.raw?.user
    if (!u) return null
    if (u?.user) return u.user
    return u
  }, [auth?.raw])

  // 默认头像：后端没有 avatar_url 时使用 whale.png
  const avatarUrl = (storedUser?.avatar_url as string | null | undefined) ?? '/whale.png'
  const nickname = storedUser?.nickname as string | null | undefined
  const walletAddressFromBackend = storedUser?.wallet_address as string | undefined
  const signature =
    (storedUser?.signature as string | undefined) ??
    (storedUser?.bio as string | undefined) ??
    (storedUser?.personal_signature as string | undefined) ??
    (storedUser?.motto as string | undefined) ??
    ''

  const displayName =
    nickname && nickname.trim()
      ? nickname.trim()
      : walletAddressFromBackend
        ? shortAddress(walletAddressFromBackend, 6, 4)
        : '未命名'

  const initials = useMemo(() => {
    const n = displayName.trim()
    if (!n) return 'U'
    // 中文/英文都尽量取前1-2个字符作为“缩写”
    const s = n.replace(/\s+/g, '')
    return (s.length <= 2 ? s : s.slice(0, 2)).toUpperCase()
  }, [displayName])

  // 动态获取已穿戴的头像框
  const avatarFrameUrl = useMemo(() => {
    // 结构：auth.raw.user.equipped_assets.avatar_frame.resource_url
    const equipped = auth?.raw?.user?.equipped_assets
    if (equipped?.avatar_frame?.resource_url) {
      return equipped.avatar_frame.resource_url as string
    }
    return '/head1.png'
  }, [auth?.raw])

  useEffect(() => {
    if (!editOpen) return
    setEditNickname(nickname ?? '')
    setEditSignature(signature ?? '')
    setEditAvatarUrl(avatarUrl ?? '')
  }, [editOpen, nickname, signature, avatarUrl])

  useEffect(() => {
    if (didInitialFetchRef.current) return
    didInitialFetchRef.current = true

    setAssetsLoading(true)
    setAssetsError(null)

    getMeAssets()
      .then((grouped) => setAssets(grouped))
      .catch((e: any) => {
        const msg = String(e?.message ?? e)
        if (msg === 'UNAUTHORIZED') {
          clearAuth()
          navigate('/')
          return
        }
        if (msg === 'NO_AUTH_TOKEN') {
          setAssetsError('未登录：请先点击右上角登录')
          return
        }
        setAssetsError(msg || '加载失败')
      })
      .finally(() => setAssetsLoading(false))
  }, [clearAuth, navigate])

  const handleEquip = async (assetId: string | number) => {
    try {
      await equipMeAsset(undefined, assetId)
      // 穿戴成功后刷新资产列表
      const grouped = await getMeAssets()
      setAssets(grouped)
    } catch (e: any) {
      const msg = String(e?.message ?? e)
      if (msg === 'UNAUTHORIZED') {
        clearAuth()
        navigate('/')
        return
      }
      alert(`穿戴失败：${msg}`)
    }
  }

  const handleLogout = () => {
    if (chain === 'bnb') disconnectBnb()
    else disconnect()
    clearAuth()
  }

  return (
    <section className="relative flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-white/60">用户详情</div>
          <div className="mt-1 text-[18px] font-semibold text-white/90">
            {chain === 'bnb' ? 'BNB' : 'Solana'} 登录账户
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-[36px] rounded-full bg-white/10 px-4 text-sm font-medium leading-[36px] text-white/90 ring-1 ring-white/10 transition hover:bg-white/15"
        >
          返回首页
        </button>
      </div>

      <BorderGlow
        className="w-full"
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
            <div className="flex items-start gap-4">
            <AvatarDisplay
              avatarUrl={avatarUrl}
              initials={initials}
              size={72}
              frameUrl={avatarFrameUrl}
              shape="square"
            />

            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-white/50">
                {chain === 'bnb' ? 'BNB (EVM)' : 'Solana'} · 用户
              </div>
              <div className="mt-1 text-[18px] font-semibold text-white/90 truncate">{displayName}</div>
              <div className="mt-2 line-clamp-2 text-[12px] text-white/55">
                {signature.trim() ? signature.trim() : '暂无个性签名'}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] text-white/40">登录地址</div>
                  <div className="mt-1 break-all font-mono text-[13px] text-white/80">
                    {storedUser?.wallet_address ? storedUser.wallet_address : addressText}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-white/40">用户ID</div>
                  <div className="mt-1 font-mono text-[13px] text-white/80">{storedUser?.id ?? '-'}</div>
                </div>
              </div>
            </div>

            <div className="hidden sm:block">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="h-[36px] rounded-full bg-white/10 px-4 text-sm font-medium leading-[36px] text-white/90 ring-1 ring-white/10 transition hover:bg-white/15"
                title="编辑资料（前端本地预览）"
              >
                编辑资料
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            {(chain === 'bnb' && isConnected) || (chain === 'sol' && connected) ? (
              <button
                type="button"
                onClick={handleLogout}
                className="h-[36px] rounded-full bg-white/10 px-4 text-sm font-medium leading-[36px] text-white/90 ring-1 ring-white/10 transition hover:bg-white/15"
              >
                退出登录
              </button>
            ) : null}
            <div className="text-[12px] text-white/50">
              你可以在右上角切换 `BNB / Sol` 并重新登录。
            </div>
          </div>

          <div className="mt-4 sm:hidden">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="h-[36px] w-full rounded-[12px] bg-white/10 px-4 text-sm font-medium leading-[36px] text-white/90 ring-1 ring-white/10 transition hover:bg-white/15"
              title="编辑资料（前端本地预览）"
            >
              编辑资料
            </button>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] text-white/55">我的资产</div>
                <div className="mt-1 text-[16px] font-semibold text-white/90">/me/assets</div>
              </div>
              <div className="text-[12px] text-white/40">{assetsLoading ? '加载中...' : ''}</div>
            </div>

            {assetsError ? (
              <div className="mt-3 text-[12px] text-rose-300">{assetsError}</div>
            ) : null}

            <div className="mt-6 flex flex-col gap-8">
              {assetsLoading ? null : Object.keys(assets).length === 0 ? (
                <div className="rounded-[14px] bg-white/5 p-4 text-[12px] text-white/50">暂无资产</div>
              ) : (
                Object.entries(assets).map(([category, list]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-[4px] w-[4px] rounded-full bg-cyan-400"></div>
                      <div className="text-[12px] font-bold text-white/40 uppercase tracking-widest">
                        {category.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {list.map((a) => {
                        const id = a.id
                        const name = a.name ?? `资产 ${String(id)}`
                        const isEquipped = a.is_equipped
                        return (
                          <div
                            key={String(id)}
                            className={`rounded-[14px] bg-white/5 p-4 ring-1 transition-all ${
                              isEquipped ? 'ring-cyan-500/50 bg-cyan-500/5' : 'ring-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-white/90 truncate">{name}</div>
                                {a.resource_url && (
                                  <div className="mt-1 text-[10px] text-white/30 truncate">
                                    {a.resource_url}
                                  </div>
                                )}
                              </div>
                              {isEquipped && (
                                <span className="flex-shrink-0 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                                  使用中
                                </span>
                              )}
                            </div>
                            
                            <button
                              type="button"
                              disabled={isEquipped}
                              onClick={() => handleEquip(id)}
                              className={`mt-4 h-[36px] w-full rounded-[12px] text-sm font-medium transition-all ${
                                isEquipped
                                  ? 'bg-white/5 text-white/30 cursor-default'
                                  : 'bg-white text-neutral-950 hover:bg-white/90'
                              }`}
                            >
                              {isEquipped ? '已穿戴' : '立即穿戴'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </BorderGlow>

      {editOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[20px] bg-[#0b0f19] ring-1 ring-white/10">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-medium text-white/85">编辑资料</div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="h-[32px] w-[32px] rounded-full bg-white/5 text-white/80 ring-1 ring-white/10 hover:bg-white/10"
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <div className="grid gap-3">
                <div>
                  <div className="mb-1 text-[12px] text-white/55">昵称</div>
                  <input
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="h-[36px] w-full rounded-[12px] bg-white/5 px-3 text-sm text-white/90 ring-1 ring-white/10 outline-none"
                    placeholder="例如：shijy"
                  />
                </div>

                <div>
                  <div className="mb-1 text-[12px] text-white/55">个性签名</div>
                  <textarea
                    value={editSignature}
                    onChange={(e) => setEditSignature(e.target.value)}
                    className="min-h-[92px] w-full resize-none rounded-[12px] bg-white/5 px-3 py-2 text-sm text-white/90 ring-1 ring-white/10 outline-none"
                    placeholder="写点你的风格..."
                  />
                </div>

                <div>
                  <div className="mb-1 text-[12px] text-white/55">头像 URL</div>
                  <input
                    value={editAvatarUrl}
                    onChange={(e) => setEditAvatarUrl(e.target.value)}
                    className="h-[36px] w-full rounded-[12px] bg-white/5 px-3 text-sm text-white/90 ring-1 ring-white/10 outline-none"
                    placeholder="可填图片地址（可选）"
                  />
                </div>

                {editAvatarUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="h-[44px] w-[44px] overflow-hidden rounded-full ring-1 ring-white/10">
                      <img src={editAvatarUrl} alt="preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="text-[12px] text-white/50">预览</div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="h-[36px] flex-1 rounded-[12px] bg-white/5 px-3 text-sm font-medium text-white/80 ring-1 ring-white/10 hover:bg-white/10"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // 先做“前端本地更新展示”
                    // 后续你给我后端保存接口，我再把这里改为真实 fetch。
                    if (!auth?.raw) return
                    const raw = auth.raw

                    const nextRaw = {
                      ...raw,
                      user: {
                        ...(raw?.user ?? {}),
                        user: {
                          ...((raw?.user as any)?.user ?? raw?.user ?? {}),
                          nickname: editNickname,
                          avatar_url: editAvatarUrl || null,
                          // 尽量同时写多个可能字段，保证渲染逻辑命中
                          signature: editSignature,
                          bio: editSignature,
                          personal_signature: editSignature,
                          motto: editSignature,
                        },
                      },
                    }

                    // 写回 AuthContext：复用登录接口返回结构
                    setAuthFromBackendResponse(nextRaw)
                    setEditOpen(false)
                  }}
                  className="h-[36px] flex-1 rounded-[12px] bg-white px-3 text-sm font-medium text-neutral-950 hover:bg-white/90"
                >
                  保存
                </button>
              </div>

              <div className="mt-3 text-[11px] text-white/45">
                保存目前为“前端本地预览”，如需持久化请给我你的后端保存接口。
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
