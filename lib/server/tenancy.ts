// Tenancy primitives — multi-org + role-based memberships for CompliRoAI.
//
// Roles (subset reused from CompliAI for shared Supabase schema compatibility):
//   - owner           : user owns this org (solo IMM, or cabinet over its own workspace)
//   - partner_manager : cabinet/consultant managing a client org
//   - compliance      : internal compliance role
//   - reviewer        : read + comment
//   - viewer          : read-only
//
// Workspace mode (per session): "solo" | "cabinet"
//   - "cabinet" is true when the user has at least one membership with role=partner_manager
//   - Otherwise "solo".
//
// Active workspace: the orgId stored in the current session token.
// Switching workspace = re-issue session token with target orgId.
import { hasSupabaseConfig, supabaseSelect, supabaseUpsert, supabaseDelete } from "@/lib/server/supabase-rest"

export type UserRole = "owner" | "partner_manager" | "compliance" | "reviewer" | "viewer"
/**
 * Sprint 6.5 — extins de la 2 la 3 segmente comerciale.
 * "imm-classic" = IMM clasic (folosește AI cumpărat).
 * "ai-builder"  = construiește cu AI (provider+deployer dual).
 * "cabinet"     = consultant/contabil multi-client.
 *
 * Re-exportăm canonical type-ul din `auth.ts` ca să rămână o singură sursă.
 */
export type WorkspaceMode = "imm-classic" | "ai-builder" | "cabinet"

export type MembershipSummary = {
  membershipId: string
  orgId: string
  orgName: string
  role: UserRole
  status: "active" | "inactive"
  createdAtISO: string
}

type OrganizationRow = {
  id: string
  name: string | null
  slug?: string | null
  created_at?: string | null
}

type MembershipRow = {
  id: string
  user_id: string
  org_id: string
  role: string | null
  status: string | null
  created_at?: string | null
}

const ORG_LOOKUP_BATCH_SIZE = 50

function isUserRole(value: unknown): value is UserRole {
  return (
    value === "owner" ||
    value === "partner_manager" ||
    value === "compliance" ||
    value === "reviewer" ||
    value === "viewer"
  )
}

function rolePriority(role: UserRole): number {
  switch (role) {
    case "owner":
      return 0
    case "partner_manager":
      return 1
    case "compliance":
      return 2
    case "reviewer":
      return 3
    case "viewer":
      return 4
  }
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "org"
  )
}

/**
 * Load every active+inactive membership a user has, joined with org name.
 * Returns sorted: active first, then by role priority, then by org name.
 */
export async function listUserMemberships(userId: string): Promise<MembershipSummary[]> {
  if (!hasSupabaseConfig()) return []

  const memberships = await supabaseSelect<MembershipRow>(
    "memberships",
    `select=id,user_id,org_id,role,status,created_at&user_id=eq.${encodeURIComponent(
      userId
    )}&order=created_at.asc`,
    "public"
  )
  if (memberships.length === 0) return []

  const orgIds = [...new Set(memberships.map((m) => m.org_id))]
  const orgs: OrganizationRow[] = []
  for (let index = 0; index < orgIds.length; index += ORG_LOOKUP_BATCH_SIZE) {
    const batch = orgIds.slice(index, index + ORG_LOOKUP_BATCH_SIZE)
    const orgIdsParam = `(${batch.map((id) => `"${id}"`).join(",")})`
    const batchOrgs = await supabaseSelect<OrganizationRow>(
      "organizations",
      `select=id,name,slug,created_at&id=in.${orgIdsParam}`,
      "public"
    )
    orgs.push(...batchOrgs)
  }
  const orgById = new Map(orgs.map((o) => [o.id, o]))

  const summaries: MembershipSummary[] = memberships
    .filter((m) => isUserRole(m.role))
    .map((m) => {
      const org = orgById.get(m.org_id)
      return {
        membershipId: m.id,
        orgId: m.org_id,
        orgName: org?.name?.trim() || m.org_id,
        role: m.role as UserRole,
        status: m.status === "inactive" ? "inactive" : "active",
        createdAtISO: m.created_at || new Date().toISOString(),
      }
    })

  summaries.sort((a, b) => {
    const byStatus = (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1)
    if (byStatus !== 0) return byStatus
    const byRole = rolePriority(a.role) - rolePriority(b.role)
    if (byRole !== 0) return byRole
    return a.orgName.localeCompare(b.orgName, "ro")
  })

  return summaries
}

/**
 * Find the membership for `(userId, orgId)`; returns null if not present.
 */
export async function getMembership(
  userId: string,
  orgId: string
): Promise<MembershipSummary | null> {
  const all = await listUserMemberships(userId)
  return all.find((m) => m.orgId === orgId) ?? null
}

/**
 * Resolve workspace mode for a user.
 *
 * Cabinet = at least one ACTIVE partner_manager membership.
 * Otherwise: NU forțăm imm-classic vs ai-builder aici — alegerea e stocată în
 * `state.onboarding.workspaceMode` și (după onboarding) re-emisă în token. Acest
 * helper e folosit doar pentru "upgrade" la cabinet după un add-client; pentru
 * solo flow returnăm `"imm-classic"` ca fallback safe.
 */
export async function resolveWorkspaceMode(userId: string): Promise<WorkspaceMode> {
  const memberships = await listUserMemberships(userId)
  const hasPartnerRole = memberships.some(
    (m) => m.status === "active" && m.role === "partner_manager"
  )
  return hasPartnerRole ? "cabinet" : "imm-classic"
}

/**
 * Create a new client organization owned by the cabinet user.
 * - Creates organization row
 * - Inserts membership for cabinet user with role=partner_manager
 *
 * Returns the new org + membership summary.
 */
export async function createClientOrg(input: {
  cabinetUserId: string
  orgName: string
  cui?: string
}): Promise<{ orgId: string; orgName: string; membershipId: string }> {
  if (!hasSupabaseConfig()) {
    throw new Error("SUPABASE_NOT_CONFIGURED")
  }
  const cleanName = input.orgName.trim()
  if (!cleanName) throw new Error("ORG_NAME_REQUIRED")

  // Generate stable IDs derived from a random seed.
  const randomHex = (length: number) => {
    const bytes = new Uint8Array(length)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  }
  const orgIdSuffix = randomHex(8)
  const orgId = `org-client-${orgIdSuffix}`
  const membershipId = `membership-${input.cabinetUserId.replace(/-/g, "").slice(0, 12)}-${orgIdSuffix}`
  const createdAtISO = new Date().toISOString()

  const slug = slugify(cleanName)

  // Insert org — retry with id-suffixed slug on uniqueness conflict.
  try {
    await supabaseUpsert(
      "organizations",
      {
        id: orgId,
        slug,
        name: cleanName,
        created_at: createdAtISO,
        updated_at: createdAtISO,
      },
      "public"
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg.includes("23505") && msg.includes("slug")) {
      await supabaseUpsert(
        "organizations",
        {
          id: orgId,
          slug: `${slug}-${orgIdSuffix}`,
          name: cleanName,
          created_at: createdAtISO,
          updated_at: createdAtISO,
        },
        "public"
      )
    } else {
      throw err
    }
  }

  // Insert membership for cabinet user
  await supabaseUpsert(
    "memberships",
    {
      id: membershipId,
      user_id: input.cabinetUserId,
      org_id: orgId,
      role: "partner_manager",
      status: "active",
      created_at: createdAtISO,
      updated_at: createdAtISO,
    },
    "public"
  )

  // Stash minimal client metadata in org_state for later lookup (CUI etc.)
  if (input.cui) {
    await supabaseUpsert(
      "org_state",
      {
        org_id: orgId,
        state: {
          onboarding: { completed: false, currentStep: 1 },
          aiSystems: [],
          literacyRecords: [],
          generatedDocuments: [],
          clientMeta: {
            cui: input.cui,
            createdByCabinet: input.cabinetUserId,
            createdAtISO,
          },
        },
        updated_at: createdAtISO,
      },
      "public"
    )
  }

  return { orgId, orgName: cleanName, membershipId }
}

/**
 * Soft-delete a client org from a cabinet's portfolio — marks the cabinet
 * user's membership as inactive (does NOT drop the org rows, to avoid losing
 * compliance data if the cabinet re-adds the client later).
 */
export async function removeClientFromPortfolio(input: {
  cabinetUserId: string
  orgId: string
}): Promise<void> {
  if (!hasSupabaseConfig()) {
    throw new Error("SUPABASE_NOT_CONFIGURED")
  }

  // Find the membership the cabinet has on that org
  const memberships = await supabaseSelect<MembershipRow>(
    "memberships",
    `select=id,user_id,org_id,role,status&user_id=eq.${encodeURIComponent(
      input.cabinetUserId
    )}&org_id=eq.${encodeURIComponent(input.orgId)}&limit=1`,
    "public"
  )
  const membership = memberships[0]
  if (!membership) throw new Error("MEMBERSHIP_NOT_FOUND")
  if (membership.role !== "partner_manager") {
    // Safety: cabinet can only remove client memberships, not their own owner workspace.
    throw new Error("NOT_A_PORTFOLIO_CLIENT")
  }

  await supabaseDelete(
    "memberships",
    `id=eq.${encodeURIComponent(membership.id)}`,
    "public"
  )
}

/**
 * Pick the default workspace for a user on login:
 * - If user has only one membership, use that org.
 * - If user has a partner_manager membership AND a personal owner one, prefer the OWNER one
 *   (cabinet starts in their personal workspace, then explicitly switches to a client).
 * - Otherwise the first active membership.
 */
export function pickDefaultWorkspace(
  memberships: MembershipSummary[]
): MembershipSummary | null {
  const active = memberships.filter((m) => m.status === "active")
  if (active.length === 0) return null
  const owner = active.find((m) => m.role === "owner")
  if (owner) return owner
  return active[0]
}
