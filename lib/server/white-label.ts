// White-label branding for cabinet orgs.
//
// Cabinetele de consultanță (workspaceMode === "cabinet") pot suprascrie
// brand-ul CompliRoAI pentru documente, emailuri și pagini publice de share.
//
// Stocare: `org_state.state.whiteLabel` (JSONB) — re-folosim pattern-ul deja
// existent, fără tabel nou. Cu fallback la fișier local pentru dev.
//
// Funcții publice:
//   - getWhiteLabelConfig(orgId)        → config curent (poate fi gol)
//   - updateWhiteLabelConfig(orgId, …)  → patch + persist
//   - clearWhiteLabelConfig(orgId)      → șterge override-ul (reset la default)
//   - getEffectiveBranding(orgId)       → returnează ce trebuie aplicat în UI
//                                          (default CompliRoAI dacă nu există config)

import { promises as fs } from "node:fs"
import path from "node:path"

import { writeFileSafe } from "@/lib/server/fs-safe"
import {
  hasSupabaseConfig,
  supabaseSelect,
  supabaseUpsert,
} from "@/lib/server/supabase-rest"

// ────────────────────────────────────────────────────────────────────────────
//   Types
// ────────────────────────────────────────────────────────────────────────────

export type WhiteLabelConfig = {
  /** Logo public URL (https://…). Null = fără logo (fallback la inițială). */
  logoUrl: string | null
  /** Culoare primară (header, butoane). Hex #rrggbb. */
  primaryColor: string
  /** Culoare secundară (accent, badge-uri). Hex #rrggbb. */
  secondaryColor: string
  /** Numele brand-ului afișat ("Cabinet X" sau "Smith & Associates"). */
  brandName: string
  /** Numele celui care semnează documentele ("Diana Popescu"). */
  signerName: string | null
  /** Funcția semnatarului ("DPO Manager", "Compliance Lead", …). */
  signerTitle: string | null
  /** Email de contact afișat în footer. */
  contactEmail: string | null
  /** Adresa fizică a cabinetului. */
  address: string | null
  /** Website cabinet ("https://cabinet.ro"). */
  website: string | null
  /** Ultima modificare (informativ). */
  updatedAtISO: string | null
}

export type EffectiveBranding = WhiteLabelConfig & {
  /** True dacă cabinetul a setat propriul branding (vs default CompliRoAI). */
  isCustom: boolean
}

// ────────────────────────────────────────────────────────────────────────────
//   Default CompliRoAI branding (fallback)
// ────────────────────────────────────────────────────────────────────────────

export const DEFAULT_BRANDING: WhiteLabelConfig = {
  logoUrl: null,
  primaryColor: "#3b5bdb", // CompliRoAI cobalt
  secondaryColor: "#0ea5e9", // sky
  brandName: "CompliRoAI",
  signerName: null,
  signerTitle: null,
  contactEmail: null,
  address: null,
  website: null,
  updatedAtISO: null,
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
const URL_RE = /^https?:\/\/[^\s]+$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ────────────────────────────────────────────────────────────────────────────
//   Validation helpers (exported pentru API route)
// ────────────────────────────────────────────────────────────────────────────

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value)
}

export function isValidLogoUrl(value: string): boolean {
  return URL_RE.test(value)
}

export function isValidContactEmail(value: string): boolean {
  return EMAIL_RE.test(value)
}

function sanitizeString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLen)
}

function coerceColor(value: unknown, fallback: string): string {
  if (typeof value === "string" && HEX_COLOR_RE.test(value)) return value
  return fallback
}

function normalizeConfig(partial: Partial<WhiteLabelConfig> | null | undefined): WhiteLabelConfig {
  if (!partial) return { ...DEFAULT_BRANDING }
  return {
    logoUrl: typeof partial.logoUrl === "string" && URL_RE.test(partial.logoUrl) ? partial.logoUrl : null,
    primaryColor: coerceColor(partial.primaryColor, DEFAULT_BRANDING.primaryColor),
    secondaryColor: coerceColor(partial.secondaryColor, DEFAULT_BRANDING.secondaryColor),
    brandName: sanitizeString(partial.brandName, 120) ?? DEFAULT_BRANDING.brandName,
    signerName: sanitizeString(partial.signerName, 120),
    signerTitle: sanitizeString(partial.signerTitle, 120),
    contactEmail:
      typeof partial.contactEmail === "string" && EMAIL_RE.test(partial.contactEmail)
        ? partial.contactEmail.trim()
        : null,
    address: sanitizeString(partial.address, 240),
    website:
      typeof partial.website === "string" && URL_RE.test(partial.website) ? partial.website.trim() : null,
    updatedAtISO: typeof partial.updatedAtISO === "string" ? partial.updatedAtISO : null,
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Storage — org_state.state.whiteLabel JSONB (with local fallback)
// ────────────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), ".data")
const cache = new Map<string, WhiteLabelConfig | null>()

function getLocalFile(orgId: string): string {
  const safe = orgId.replace(/[^a-zA-Z0-9._-]+/g, "-")
  return path.join(DATA_DIR, `white-label-${safe}.json`)
}

type OrgStateRow = {
  org_id: string
  state: { whiteLabel?: Partial<WhiteLabelConfig> } & Record<string, unknown>
}

async function readFromSupabase(orgId: string): Promise<WhiteLabelConfig | null> {
  if (!hasSupabaseConfig()) return null
  try {
    const rows = await supabaseSelect<OrgStateRow>(
      "org_state",
      `select=org_id,state&org_id=eq.${encodeURIComponent(orgId)}&limit=1`,
      "public"
    )
    const wl = rows[0]?.state?.whiteLabel
    if (!wl) return null
    return normalizeConfig(wl)
  } catch {
    return null
  }
}

async function writeToSupabase(orgId: string, config: WhiteLabelConfig | null): Promise<boolean> {
  if (!hasSupabaseConfig()) return false
  try {
    // Read current state, merge whiteLabel, write back. Avoid clobbering other keys.
    const rows = await supabaseSelect<OrgStateRow>(
      "org_state",
      `select=org_id,state&org_id=eq.${encodeURIComponent(orgId)}&limit=1`,
      "public"
    )
    const current = rows[0]?.state ?? {}
    const nextState: Record<string, unknown> = { ...current }
    if (config === null) {
      delete nextState.whiteLabel
    } else {
      nextState.whiteLabel = config
    }
    await supabaseUpsert(
      "org_state",
      {
        org_id: orgId,
        state: nextState,
        updated_at: new Date().toISOString(),
      },
      "public"
    )
    return true
  } catch {
    return false
  }
}

async function readFromLocal(orgId: string): Promise<WhiteLabelConfig | null> {
  try {
    const raw = await fs.readFile(getLocalFile(orgId), "utf8")
    const parsed = JSON.parse(raw) as Partial<WhiteLabelConfig>
    return normalizeConfig(parsed)
  } catch {
    return null
  }
}

async function writeToLocal(orgId: string, config: WhiteLabelConfig | null): Promise<void> {
  if (config === null) {
    try {
      await fs.unlink(getLocalFile(orgId))
    } catch {
      // not present — fine
    }
    return
  }
  await writeFileSafe(getLocalFile(orgId), JSON.stringify(config, null, 2))
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returnează config-ul white-label salvat de cabinet, sau `null` dacă nu există.
 * Pentru cazul în care vrei direct branding-ul de aplicat (cu fallback default),
 * folosește `getEffectiveBranding`.
 */
export async function getWhiteLabelConfig(orgId: string): Promise<WhiteLabelConfig | null> {
  if (cache.has(orgId)) return cache.get(orgId) ?? null

  const supa = await readFromSupabase(orgId)
  if (supa) {
    cache.set(orgId, supa)
    return supa
  }
  const local = await readFromLocal(orgId)
  cache.set(orgId, local)
  return local
}

/**
 * Salvează (merge cu existing) un set de câmpuri.
 * Returnează config-ul nou.
 */
export async function updateWhiteLabelConfig(
  orgId: string,
  patch: Partial<Omit<WhiteLabelConfig, "updatedAtISO">>
): Promise<WhiteLabelConfig> {
  const existing = (await getWhiteLabelConfig(orgId)) ?? { ...DEFAULT_BRANDING }
  const merged = normalizeConfig({
    ...existing,
    ...patch,
  })
  merged.updatedAtISO = new Date().toISOString()

  cache.set(orgId, merged)
  // Best-effort persist to Supabase + local. Both are non-fatal.
  await writeToSupabase(orgId, merged)
  await writeToLocal(orgId, merged)
  return merged
}

/**
 * Șterge config-ul (reset la default CompliRoAI).
 */
export async function clearWhiteLabelConfig(orgId: string): Promise<void> {
  cache.set(orgId, null)
  await writeToSupabase(orgId, null)
  await writeToLocal(orgId, null)
}

/**
 * Returnează branding-ul efectiv pentru `orgId` — cu fallback la default
 * CompliRoAI dacă nu există override custom. Folosit de email-uri, share
 * pages, PDF, etc.
 */
export async function getEffectiveBranding(orgId: string): Promise<EffectiveBranding> {
  const config = await getWhiteLabelConfig(orgId)
  if (!config) {
    return { ...DEFAULT_BRANDING, isCustom: false }
  }
  // Merge with defaults to ensure colors / brandName are present.
  return {
    logoUrl: config.logoUrl,
    primaryColor: config.primaryColor || DEFAULT_BRANDING.primaryColor,
    secondaryColor: config.secondaryColor || DEFAULT_BRANDING.secondaryColor,
    brandName: config.brandName || DEFAULT_BRANDING.brandName,
    signerName: config.signerName,
    signerTitle: config.signerTitle,
    contactEmail: config.contactEmail,
    address: config.address,
    website: config.website,
    updatedAtISO: config.updatedAtISO,
    isCustom: true,
  }
}

/**
 * Variant pentru contexte unde cunoaștem `orgName` (ex: layout dashboard)
 * și vrem ca brandName implicit să fie "Cabinet {orgName}" în loc de "CompliRoAI"
 * pe pagina de setări white-label (pre-fill).
 */
export function suggestBrandNameForCabinet(orgName: string | null | undefined): string {
  const trimmed = orgName?.trim()
  if (!trimmed) return "Cabinet"
  if (/^cabinet\b/i.test(trimmed)) return trimmed
  return `Cabinet ${trimmed}`
}
