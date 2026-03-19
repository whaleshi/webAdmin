import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccount, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import bs58 from 'bs58'
import { BNB } from '../icons/BNB'
import { Solana } from '../icons/Solana'
import { useAuth } from '../state/AuthContext'

type ChainKey = 'bnb' | 'sol'

function shortAddress(a: string, head = 4, tail = 4) {
  if (!a) return ''
  if (a.length <= head + tail) return a
  return `${a.slice(0, head)}...${a.slice(-tail)}`
}

export function Web3Login() {
  const [chain, setChain] = useState<ChainKey>('bnb')
  const navigate = useNavigate()

  const { openConnectModal } = useConnectModal()

  const { connected, publicKey, disconnect, signMessage } = useWallet()
  const { setVisible } = useWalletModal()

  // BNB wallet state (only used when chain === 'bnb')
  const { address, isConnected } = useAccount()
  const { disconnect: disconnectBnb } = useDisconnect()
  const { setAuthFromBackendResponse, clearAuth } = useAuth()

  const [chainDropdownOpen, setChainDropdownOpen] = useState(false)
  const chainWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!chainDropdownOpen) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = chainWrapRef.current
      if (!el) return
      const target = e.target as Node | null
      if (target && el.contains(target)) return
      setChainDropdownOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [chainDropdownOpen])

  const solAddress = useMemo(() => {
    const pk = publicKey?.toBase58()
    return pk ? shortAddress(pk, 4, 4) : ''
  }, [publicKey])

  const bnbAddress = address ?? ''
  const bnbShortAddress = useMemo(() => shortAddress(bnbAddress, 4, 4), [bnbAddress])

  const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000')

  const [pendingLoginChain, setPendingLoginChain] = useState<ChainKey | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  const loginMessage = (nonce: string) => `Welcome to AdminRust! Nonce: ${nonce}`

  const signEvm = async (message: string, walletAddress: string) => {
    const ethereum = (window as any).ethereum as undefined | { request: Function }
    if (!ethereum?.request) throw new Error('No window.ethereum provider')

    // 与你给的示例一致：personal_sign(message, walletAddress)
    const signature = (await ethereum.request({
      method: 'personal_sign',
      params: [message, walletAddress],
    })) as string
    return signature
  }

  const signSol = async (message: string) => {
    if (!signMessage) throw new Error('Current Solana wallet does not support signMessage()')
    const encoded = new TextEncoder().encode(message)
    const sigBytes = await signMessage(encoded)
    return bs58.encode(sigBytes)
  }

  const doBackendLogin = async (targetChain: ChainKey) => {
    // 为了和你给的示例后端兼容：先使用固定 nonce
    // 后续你后端如果支持“获取 nonce”接口，再改成服务端 nonce + 防重放
    const nonce = '123456'
    const message = loginMessage(nonce)

    if (targetChain === 'bnb') {
      const walletAddress = address ?? ''
      if (!walletAddress) throw new Error('BNB address missing')
      const signature = await signEvm(message, walletAddress)

      const res = await fetch(`${apiBaseUrl}/login/web3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          wallet_address: walletAddress,
          chain: 'BSC',
          signature,
          message,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `EVM login failed: HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => null)
      if (data && typeof data === 'object') {
        setAuthFromBackendResponse(data)
      }
    } else {
      const walletAddress = publicKey?.toBase58() ?? ''
      if (!walletAddress) throw new Error('Solana publicKey missing')
      const signature = await signSol(message)

      const res = await fetch(`${apiBaseUrl}/login/web3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          wallet_address: walletAddress,
          chain: 'SOL',
          signature,
          message,
        }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Sol login failed: HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => null)
      if (data && typeof data === 'object') {
        setAuthFromBackendResponse(data)
      }
    }
  }

  useEffect(() => {
    if (!pendingLoginChain || authLoading) return

    if (pendingLoginChain === 'bnb') {
      if (!isConnected || !address) return
      setAuthLoading(true)
      doBackendLogin('bnb')
        .then(() => navigate('/user?chain=bnb'))
        .catch((e) => {
          console.error(e)
          // 这里先用 console + alert，后续你要做 UI 提示我再帮你换成 toast
          alert('BNB 登录失败（签名或后端校验失败）')
        })
        .finally(() => {
          setAuthLoading(false)
          setPendingLoginChain(null)
        })
      return
    }

    if (pendingLoginChain === 'sol') {
      if (!connected || !publicKey) return
      setAuthLoading(true)
      doBackendLogin('sol')
        .then(() => navigate('/user?chain=sol'))
        .catch((e) => {
          console.error(e)
          alert('Solana 登录失败（签名或后端校验失败）')
        })
        .finally(() => {
          setAuthLoading(false)
          setPendingLoginChain(null)
        })
    }
  }, [pendingLoginChain, authLoading, isConnected, address, connected, publicKey, navigate])

  const handleLoginClick = () => {
    if (chain === 'bnb') {
      if (!isConnected) {
        setPendingLoginChain('bnb')
        openConnectModal?.()
        return
      }
      setPendingLoginChain('bnb')
      return
    }

    if (!connected) {
      setPendingLoginChain('sol')
      setVisible(true)
      return
    }

    setPendingLoginChain('sol')
  }

  const handleDisconnect = () => {
    if (chain === 'bnb') disconnectBnb()
    else disconnect()
    clearAuth()
  }

  return (
    <div className="flex items-center gap-3">
      <div ref={chainWrapRef} className="relative">
        <button
          type="button"
          onClick={() => setChainDropdownOpen((v) => !v)}
          aria-label="选择链"
          className="flex h-[36px] w-[56px] items-center justify-center gap-2 rounded-full bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
          title="选择链"
        >
          <span className="flex items-center justify-center">
            {chain === 'bnb' ? <BNB width={18} height={18} /> : <Solana width={18} height={18} />}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M7 10l5 5 5-5"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {chainDropdownOpen ? (
          <div className="absolute left-0 top-[44px] z-[60] w-[56px] rounded-[16px] bg-[#0b0f19]/90 p-1 ring-1 ring-white/10 backdrop-blur">
            <button
              type="button"
              onClick={() => {
                setChain('bnb')
                setChainDropdownOpen(false)
              }}
              className="flex h-[32px] w-full items-center justify-center rounded-[12px] hover:bg-white/10"
              title="BNB"
            >
              <BNB width={18} height={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setChain('sol')
                setChainDropdownOpen(false)
              }}
              className="mt-1 flex h-[32px] w-full items-center justify-center rounded-[12px] hover:bg-white/10"
              title="Solana"
            >
              <Solana width={18} height={18} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex h-[36px] items-center gap-2">
        <button
          type="button"
          onClick={handleLoginClick}
          className="h-[36px] rounded-full bg-white px-4 text-sm font-medium leading-[36px] text-neutral-950 transition hover:-translate-y-0.5"
          title="点击登录/进入用户详情"
        >
          {chain === 'bnb'
            ? isConnected
              ? bnbShortAddress
              : authLoading
                ? '登录中...'
                : '登录'
            : connected
              ? solAddress
              : authLoading
                ? '登录中...'
                : '登录'}
        </button>
        {(chain === 'bnb' && isConnected) || (chain === 'sol' && connected) ? (
          <button
            type="button"
            onClick={handleDisconnect}
            className="h-[36px] rounded-full bg-white/10 px-3 text-sm font-medium leading-[36px] text-white/90 ring-1 ring-white/10 transition hover:bg-white/15"
            title="断开钱包"
          >
            退出
          </button>
        ) : null}
      </div>
    </div>
  )
}

