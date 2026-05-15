import type { Metadata } from "next"
import { Space_Grotesk, Inter_Tight, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
})

export const metadata: Metadata = {
  title: {
    default: "AI Act Compliance — Conformitate EU AI Act pentru IMM-uri din România",
    template: "%s · AI Act Compliance",
  },
  description:
    "Singura platformă în limba română pentru AI Inventory, Annex IV, EU Database registration și AI Literacy (Art. 4 EU AI Act). Construită pentru IMM-uri.",
  keywords: ["EU AI Act", "conformitate AI", "AI Inventory", "Annex IV", "AI Literacy", "IMM România"],
  openGraph: {
    title: "AI Act Compliance — Conformitate EU AI Act pentru IMM-uri",
    description:
      "Inventory AI, Annex IV, EU Database registration și AI Literacy pentru firmele din România.",
    locale: "ro_RO",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" className={`${spaceGrotesk.variable} ${interTight.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
