import BorderGlow from '../components/BorderGlow'
import DomeGallery from '../components/DomeGallery'
import { AntDesign } from '../icons/AntDesign'
import { CSSNew } from '../icons/CSSNew'
import { Ethereum } from '../icons/Ethereum'
import { Expo } from '../icons/Expo'
import { Git } from '../icons/Git'
import { GitHub } from '../icons/GitHub'
import { HTML5 } from '../icons/HTML5'
import { MetaMask } from '../icons/MetaMask'
import { Nginx } from '../icons/Nginx'
import { Nextjs } from '../icons/Nextjs'
import { NPM } from '../icons/NPM'
import { Nuxt } from '../icons/Nuxt'
import { OpenClaw } from '../icons/OpenClaw'
import { ReactLogo } from '../icons/ReactLogo'
import { Solana } from '../icons/Solana'
import { Telegram } from '../icons/Telegram'
import { Vercel } from '../icons/Vercel'
import { Vite } from '../icons/Vite'
import { Vue } from '../icons/Vue'
import { XformerlyTwitter } from '../icons/XformerlyTwitter'

type SkillsDomeSectionProps = {
  themeColors: string[]
}

export function SkillsDomeSection({ themeColors }: SkillsDomeSectionProps) {
  return (
    <section
      id="skills"
      data-section
      className="scroll-mt-24 border-t border-white/10 py-16 md:py-20"
    >
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Skills
          </h2>
        </div>
      </div>

      <div className="mt-8">
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
          <div className="relative h-[420px] w-full overflow-hidden rounded-[20px] bg-black/20 ring-1 ring-inset ring-white/10 md:h-[520px]">
            <DomeGallery
              fit={0.8}
              minRadius={600}
              maxVerticalRotationDeg={0}
              segments={34}
              dragDampening={2}
              grayscale={false}
              autoRotate
              autoRotateDegPerSec={7}
              autoRotateIdleMs={900}
              enableEnlarge={false}
              tileBgColors={themeColors}
              tileBgOpacity={0.22}
              tiles={[
                { node: <HTML5 className="h-full w-full" />, alt: 'HTML5' },
                { node: <CSSNew className="h-full w-full" />, alt: 'CSS' },
                { node: <ReactLogo className="h-full w-full" />, alt: 'React' },
                { node: <Vue className="h-full w-full" />, alt: 'Vue' },
                { node: <Vite className="h-full w-full" />, alt: 'Vite' },
                { node: <Nextjs className="h-full w-full" />, alt: 'Next.js' },
                { node: <Nuxt className="h-full w-full" />, alt: 'Nuxt' },
                { node: <NPM className="h-full w-full" />, alt: 'NPM' },
                { node: <Vercel className="h-full w-full" />, alt: 'Vercel' },
                { node: <Git className="h-full w-full" />, alt: 'Git' },
                { node: <GitHub className="h-full w-full" />, alt: 'GitHub' },
                { node: <Nginx className="h-full w-full" />, alt: 'Nginx' },
                { node: <AntDesign className="h-full w-full" />, alt: 'Ant Design' },
                { node: <Expo className="h-full w-full" />, alt: 'Expo' },
                { node: <Telegram className="h-full w-full" />, alt: 'Telegram' },
                { node: <XformerlyTwitter className="h-full w-full" />, alt: 'X' },
                { node: <MetaMask className="h-full w-full" />, alt: 'MetaMask' },
                { node: <Ethereum className="h-full w-full" />, alt: 'Ethereum' },
                { node: <Solana className="h-full w-full" />, alt: 'Solana' },
                { node: <OpenClaw className="h-full w-full" />, alt: 'OpenClaw' },
              ]}
            />
          </div>
        </BorderGlow>
      </div>
    </section>
  )
}

