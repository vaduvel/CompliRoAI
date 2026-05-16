import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { sendMagicLinkEmail } from "@/lib/server/share-magic-link-email"
import {
  buildShareUrl,
  createShareToken,
  type ShareTargetType,
} from "@/lib/server/share-token-store"
import { getMembership } from "@/lib/server/tenancy"
import { getEffectiveBranding } from "@/lib/server/white-label"

function isValidTargetType(value: unknown): value is ShareTargetType {
  return value === "intake" || value === "approval" || value === "report"
}

function cleanEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  // Cheap RFC-5322-lite check — enough to reject obvious garbage.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return undefined
  return trimmed
}

function cleanString(value: unknown, maxLength = 240): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext()
    const body = (await request.json().catch(() => ({}))) as {
      targetType?: unknown
      targetId?: unknown
      targetLabel?: unknown
      recipientEmail?: unknown
      recipientName?: unknown
      expiresInDays?: unknown
      note?: unknown
      sendEmail?: unknown
      cabinetName?: unknown
      /** Optional: cabinet user can issue a link bound to a client org from their portfolio. */
      clientOrgId?: unknown
    }

    if (!isValidTargetType(body.targetType)) {
      return NextResponse.json(
        { error: "targetType invalid. Așteptat: intake | approval | report." },
        { status: 400 }
      )
    }

    const expiresInDays =
      typeof body.expiresInDays === "number" &&
      body.expiresInDays > 0 &&
      body.expiresInDays <= 30
        ? body.expiresInDays
        : 7

    const targetId = cleanString(body.targetId, 120)
    const targetLabel = cleanString(body.targetLabel)
    const note = cleanString(body.note, 1000)
    const recipientEmail = cleanEmail(body.recipientEmail)
    const recipientName = cleanString(body.recipientName, 120)
    const cabinetName = cleanString(body.cabinetName, 120) ?? ctx.orgName
    const shouldSendEmail =
      body.sendEmail !== false && // default true when an email is provided
      Boolean(recipientEmail)

    if (body.targetType === "approval" && !targetId) {
      return NextResponse.json(
        { error: "targetId este obligatoriu pentru cererile de aprobare." },
        { status: 400 }
      )
    }

    // Default to current workspace org. Cabinet users can override with
    // `clientOrgId` to issue a link bound to a portfolio client without
    // switching workspaces — we verify the membership before allowing it.
    let targetOrgId = ctx.orgId
    const requestedClientOrgId = cleanString(body.clientOrgId, 120)
    if (requestedClientOrgId && requestedClientOrgId !== ctx.orgId) {
      if (ctx.workspaceMode !== "cabinet") {
        return NextResponse.json(
          { error: "Doar utilizatorii in mod cabinet pot emite linkuri pentru alte organizatii." },
          { status: 403 }
        )
      }
      const membership = await getMembership(ctx.userId, requestedClientOrgId)
      if (!membership || membership.role !== "partner_manager" || membership.status !== "active") {
        return NextResponse.json(
          { error: "Nu ai acces de cabinet pe aceasta organizatie." },
          { status: 403 }
        )
      }
      targetOrgId = requestedClientOrgId
    }

    // White-label branding belongs to the CABINET that issued the token
    // (ctx.orgId), not necessarily the org the token is bound to (targetOrgId
    // may be a client org). The public share page should display the cabinet's
    // brand to the client.
    const branding = await getEffectiveBranding(ctx.orgId)
    const cabinetDisplayName = branding.isCustom ? branding.brandName : cabinetName

    const record = await createShareToken({
      orgId: targetOrgId,
      createdByUserId: ctx.userId,
      createdByEmail: ctx.email,
      targetType: body.targetType,
      targetId,
      targetLabel,
      recipientEmail,
      expiresInDays,
      metadata: {
        ...(note ? { note } : {}),
        ...(recipientName ? { recipientName } : {}),
        ...(cabinetDisplayName ? { cabinetName: cabinetDisplayName } : {}),
        // Snapshot the cabinet's branding into token metadata so the public
        // share page can render it without needing to look up the cabinet org.
        branding: {
          isCustom: branding.isCustom,
          brandName: branding.brandName,
          logoUrl: branding.logoUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          signerName: branding.signerName,
          signerTitle: branding.signerTitle,
          contactEmail: branding.contactEmail,
          website: branding.website,
        },
      },
    })

    if (!record.token) {
      return NextResponse.json(
        { error: "Token-ul nu a putut fi generat." },
        { status: 500 }
      )
    }

    const shareUrl = buildShareUrl(request.url, record.token)

    let emailStatus:
      | { ok: boolean; channel: "resend" | "console"; error?: string }
      | null = null
    if (shouldSendEmail && recipientEmail) {
      emailStatus = await sendMagicLinkEmail({
        toEmail: recipientEmail,
        recipientName,
        cabinetName: cabinetDisplayName,
        targetType: body.targetType,
        targetLabel,
        shareUrl,
        expiresAtISO: record.expiresAtISO,
        note,
        branding,
      })
    }

    return NextResponse.json({
      ok: true,
      record: {
        id: record.id,
        orgId: record.orgId,
        targetType: record.targetType,
        targetId: record.targetId,
        targetLabel: record.targetLabel,
        recipientEmail: record.recipientEmail,
        status: record.status,
        createdAtISO: record.createdAtISO,
        expiresAtISO: record.expiresAtISO,
        metadata: record.metadata,
      },
      token: record.token,
      url: shareUrl,
      email: emailStatus,
    })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Eroare la generarea linkului."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
