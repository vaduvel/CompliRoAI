import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { BrandingSettingsClient } from "./branding-client"
import { getEffectiveBranding, getWhiteLabelConfig, suggestBrandNameForCabinet } from "@/lib/server/white-label"

export const dynamic = "force-dynamic"

export default async function BrandingSettingsPage() {
  const h = await headers()
  const workspaceMode = h.get("x-aiact-workspace-mode")
  if (workspaceMode !== "cabinet") {
    redirect("/dashboard/module-unavailable?module=branding")
  }
  const orgId = h.get("x-aiact-org-id")
  const orgName = h.get("x-aiact-org-name") ?? ""

  if (!orgId) {
    redirect("/login")
  }

  const [config, effective] = await Promise.all([
    getWhiteLabelConfig(orgId),
    getEffectiveBranding(orgId),
  ])

  const suggestedBrandName = suggestBrandNameForCabinet(orgName)

  return (
    <BrandingSettingsClient
      initialConfig={config}
      initialEffective={effective}
      suggestedBrandName={suggestedBrandName}
      orgName={orgName}
    />
  )
}
