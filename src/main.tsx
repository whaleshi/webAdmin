import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './state/AuthContext'
import { MusicProvider } from './state/MusicContext'

import '@rainbow-me/rainbowkit/styles.css'
import '@solana/wallet-adapter-react-ui/styles.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { bsc } from 'wagmi/chains'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <QueryClientProvider client={new QueryClient()}>
      <WagmiProvider
        config={getDefaultConfig({
          appName: 'shijy.dev',
          projectId: String(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? ''),
          chains: [bsc],
          ssr: false,
        })}
      >
        <RainbowKitProvider>
          <ConnectionProvider endpoint={clusterApiUrl('mainnet-beta')}>
            <WalletProvider wallets={[new PhantomWalletAdapter(), new SolflareWalletAdapter()]} autoConnect>
              <WalletModalProvider>
                <AuthProvider>
                  <MusicProvider>
                    <App />
                  </MusicProvider>
                </AuthProvider>
              </WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </BrowserRouter>,
)
