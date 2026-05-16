import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "CompliRoAI — Link partajat",
  description:
    "Pagină publică CompliRoAI pentru completare date sau aprobare sisteme AI.",
  robots: { index: false, follow: false },
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
