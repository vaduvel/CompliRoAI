// /api/branding — white-label config pentru cabinete consultanță.
//
//   GET    → returnează config-ul curent (sau null) + DEFAULT_BRANDING ca fallback.
//   PATCH  → actualizează parțial. Doar cabinet (workspaceMode === "cabinet").
//   DELETE → reset la default (șterge override-ul).

import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import {
  DEFAULT_BRANDING,
  clearWhiteLabelConfig,
  getEffectiveBranding,
  getWhiteLabelConfig,
  isValidContactEmail,
  isValidHexColor,
  isValidLogoUrl,
  updateWhiteLabelConfig,
  type WhiteLabelConfig,
} from "@/lib/server/white-label"

export const dynamic = "force-dynamic"

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ ok: false, error: message, ...(code ? { code } : {}) }, { status })
}

async function requireCabinet(): Promise<
  | { ok: true; orgId: string; orgName: string }
  | { ok: false; response: NextResponse }
> {
  const ctx = await getOrgContext()
  if (ctx.workspaceMode !== "cabinet") {
    return {
      ok: false,
      response: jsonError(
        "Setările de branding sunt disponibile doar pentru cabinete.",
        403,
        "BRANDING_CABINET_ONLY"
      ),
    }
  }
  return { ok: true, orgId: ctx.orgId, orgName: ctx.orgName }
}

// GET — solo poate citi tot pentru transparență (cabinetName fallback)
export async function GET() {
  try {
    const ctx = await getOrgContext()
    const config = await getWhiteLabelConfig(ctx.orgId)
    const effective = await getEffectiveBranding(ctx.orgId)
    return NextResponse.json({
      ok: true,
      config,
      effective,
      defaults: DEFAULT_BRANDING,
      isCabinet: ctx.workspaceMode === "cabinet",
      orgName: ctx.orgName,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Eroare la citirea brandingului."
    return jsonError(msg, 500, "BRANDING_GET_FAILED")
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireCabinet()
    if (!guard.ok) return guard.response

    const body = (await request.json().catch(() => ({}))) as Partial<
      Omit<WhiteLabelConfig, "updatedAtISO">
    >

    const patch: Partial<Omit<WhiteLabelConfig, "updatedAtISO">> = {}

    if (body.brandName !== undefined) {
      if (typeof body.brandName !== "string" || !body.brandName.trim()) {
        return jsonError("Numele brand-ului nu poate fi gol.", 400, "INVALID_BRAND_NAME")
      }
      patch.brandName = body.brandName.trim().slice(0, 120)
    }

    if (body.primaryColor !== undefined) {
      if (typeof body.primaryColor !== "string" || !isValidHexColor(body.primaryColor)) {
        return jsonError(
          "Culoarea primară trebuie să fie hex valid (#rrggbb).",
          400,
          "INVALID_PRIMARY_COLOR"
        )
      }
      patch.primaryColor = body.primaryColor
    }

    if (body.secondaryColor !== undefined) {
      if (typeof body.secondaryColor !== "string" || !isValidHexColor(body.secondaryColor)) {
        return jsonError(
          "Culoarea secundară trebuie să fie hex valid (#rrggbb).",
          400,
          "INVALID_SECONDARY_COLOR"
        )
      }
      patch.secondaryColor = body.secondaryColor
    }

    if (body.logoUrl !== undefined) {
      if (body.logoUrl === null || body.logoUrl === "") {
        patch.logoUrl = null
      } else if (typeof body.logoUrl !== "string" || !isValidLogoUrl(body.logoUrl)) {
        return jsonError(
          "URL-ul logo-ului trebuie să înceapă cu https:// sau http://.",
          400,
          "INVALID_LOGO_URL"
        )
      } else {
        patch.logoUrl = body.logoUrl.trim()
      }
    }

    if (body.contactEmail !== undefined) {
      if (body.contactEmail === null || body.contactEmail === "") {
        patch.contactEmail = null
      } else if (typeof body.contactEmail !== "string" || !isValidContactEmail(body.contactEmail)) {
        return jsonError(
          "Emailul de contact nu este valid.",
          400,
          "INVALID_CONTACT_EMAIL"
        )
      } else {
        patch.contactEmail = body.contactEmail.trim()
      }
    }

    if (body.website !== undefined) {
      if (body.website === null || body.website === "") {
        patch.website = null
      } else if (typeof body.website !== "string" || !isValidLogoUrl(body.website)) {
        return jsonError(
          "Website-ul trebuie să înceapă cu https:// sau http://.",
          400,
          "INVALID_WEBSITE"
        )
      } else {
        patch.website = body.website.trim()
      }
    }

    if (body.signerName !== undefined) {
      patch.signerName =
        typeof body.signerName === "string" && body.signerName.trim()
          ? body.signerName.trim().slice(0, 120)
          : null
    }

    if (body.signerTitle !== undefined) {
      patch.signerTitle =
        typeof body.signerTitle === "string" && body.signerTitle.trim()
          ? body.signerTitle.trim().slice(0, 120)
          : null
    }

    if (body.address !== undefined) {
      patch.address =
        typeof body.address === "string" && body.address.trim()
          ? body.address.trim().slice(0, 240)
          : null
    }

    const config = await updateWhiteLabelConfig(guard.orgId, patch)
    const effective = await getEffectiveBranding(guard.orgId)
    return NextResponse.json({ ok: true, config, effective })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Eroare la salvarea brandingului."
    return jsonError(msg, 500, "BRANDING_PATCH_FAILED")
  }
}

export async function DELETE() {
  try {
    const guard = await requireCabinet()
    if (!guard.ok) return guard.response

    await clearWhiteLabelConfig(guard.orgId)
    return NextResponse.json({
      ok: true,
      config: null,
      effective: { ...DEFAULT_BRANDING, isCustom: false },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Eroare la resetarea brandingului."
    return jsonError(msg, 500, "BRANDING_DELETE_FAILED")
  }
}
