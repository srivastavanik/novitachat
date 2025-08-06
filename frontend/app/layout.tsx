import type { Metadata } from 'next'
import { Inter, Manrope, Orbitron, Audiowide, Space_Mono, Exo_2, Electrolize, Major_Mono_Display, Michroma, Oxanium } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/components/ThemeProvider'
import './globals.css'
import '../styles/design-tokens.css'

const inter = Inter({ subsets: ['latin'] })
const manrope = Manrope({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-manrope' })
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' })
const audiowide = Audiowide({ subsets: ['latin'], weight: '400', variable: '--font-audiowide' })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-space-mono' })
const exo2 = Exo_2({ subsets: ['latin'], variable: '--font-exo2' })
const electrolize = Electrolize({ subsets: ['latin'], weight: '400', variable: '--font-electrolize' })
const majorMono = Major_Mono_Display({ subsets: ['latin'], weight: '400', variable: '--font-major-mono' })
const michroma = Michroma({ subsets: ['latin'], weight: '400', variable: '--font-michroma' })
const oxanium = Oxanium({ subsets: ['latin'], variable: '--font-oxanium' })

export const metadata: Metadata = {
  title: 'Nova - AI-Powered Chat',
  description: 'Chat with AI powered by Novita',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${manrope.className} ${orbitron.variable} ${audiowide.variable} ${spaceMono.variable} ${exo2.variable} ${electrolize.variable} ${majorMono.variable} ${michroma.variable} ${oxanium.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
