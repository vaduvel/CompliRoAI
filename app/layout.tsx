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
    default: "CompliRoAI — AI Act + GDPR workspace pentru conformare AI",
    template: "%s · CompliRoAI",
  },
  description:
    "Workspace operațional pentru DPO-uri, cabinete, firme și AI builders care trebuie să transforme AI Act + GDPR în inventar, dovezi, acțiuni și dosare auditabile.",
  keywords: [
    "CompliRoAI",
    "EU AI Act",
    "conformitate AI",
    "DPO AI Act",
    "AI Inventory",
    "Annex IV",
    "FRIA",
    "AI Literacy",
    "audit pack AI",
  ],
  openGraph: {
    title: "CompliRoAI — AI Act + GDPR workspace pentru conformare AI",
    description:
      "Inventar AI, clasificare de rol și risc, FRIA, DPIA, Annex IV, monitorizare și audit pack pentru conformare AI.",
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
