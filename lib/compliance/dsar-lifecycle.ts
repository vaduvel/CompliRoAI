import type { DsarRequest, DsarStatus } from "@/lib/compliance/types"

export type DsarLifecycleStepId =
  | "intake"
  | "identity"
  | "scope_systems"
  | "data_search"
  | "draft_response"
  | "human_review"
  | "send_response"
  | "archive"

export type DsarLifecycleStepStatus = "done" | "current" | "blocked" | "pending"

export type DsarLifecycleStep = {
  id: DsarLifecycleStepId
  label: string
  description: string
  status: DsarLifecycleStepStatus
}

export type DsarLifecycleAction =
  | "verify-identity"
  | "scope-systems"
  | "complete-data-search"
  | "generate-draft"
  | "review-response"
  | "mark-responded"
  | "archive"
  | "start-processing"
  | "await-verification"
  | "refuse"
  | "extend-deadline"

export type DsarLifecycle = {
  steps: DsarLifecycleStep[]
  progressPercent: number
  canRespond: boolean
  blockedReasons: string[]
  currentStepId: DsarLifecycleStepId
  legalClock: {
    deadlineISO: string
    daysLeft: number
    status: "closed" | "overdue" | "urgent" | "on_track"
  }
}

const STEP_DEFS: Array<Omit<DsarLifecycleStep, "status">> = [
  {
    id: "intake",
    label: "Cerere înregistrată",
    description: "Solicitarea este în registrul DSAR și are deadline legal calculat.",
  },
  {
    id: "identity",
    label: "Identitate verificată",
    description: "Confirmă că persoana este îndreptățită să primească datele.",
  },
  {
    id: "scope_systems",
    label: "Sisteme mapate",
    description: "Diana a decis unde caută datele: CRM, HR, facturare, email, suport.",
  },
  {
    id: "data_search",
    label: "Căutare date completă",
    description: "Datele au fost căutate/colectate sau inexistența lor a fost documentată.",
  },
  {
    id: "draft_response",
    label: "Draft răspuns",
    description: "Există draft de răspuns sau decizie motivată de refuz/restricționare.",
  },
  {
    id: "human_review",
    label: "Review uman DPO",
    description: "Consultantul a verificat răspunsul înainte de trimitere.",
  },
  {
    id: "send_response",
    label: "Răspuns trimis",
    description: "Răspunsul a fost transmis și dovada intră în Audit Pack.",
  },
  {
    id: "archive",
    label: "Arhivare caz",
    description: "Cazul este închis, cu dovezi și notă de retenție.",
  },
]

export function buildDsarLifecycle(
  request: Pick<
    DsarRequest,
    | "status"
    | "deadlineISO"
    | "extendedDeadlineISO"
    | "identityVerified"
    | "systemsScoped"
    | "dataSearchCompleted"
    | "draftResponseGenerated"
    | "responseReviewedByHuman"
    | "responseSentAtISO"
    | "archivedAtISO"
  >,
  nowISO = new Date().toISOString(),
): DsarLifecycle {
  const doneByStep: Record<DsarLifecycleStepId, boolean> = {
    intake: true,
    identity: Boolean(request.identityVerified),
    scope_systems: Boolean(request.systemsScoped),
    data_search: Boolean(request.dataSearchCompleted),
    draft_response: Boolean(request.draftResponseGenerated),
    human_review: Boolean(request.responseReviewedByHuman),
    send_response: Boolean(request.responseSentAtISO) || request.status === "responded" || request.status === "refused",
    archive: Boolean(request.archivedAtISO),
  }
  const firstMissing = STEP_DEFS.find((step) => !doneByStep[step.id])?.id ?? "archive"
  const steps = STEP_DEFS.map((step, index) => {
    const previousDone = STEP_DEFS.slice(0, index).every((prev) => doneByStep[prev.id])
    const status: DsarLifecycleStepStatus = doneByStep[step.id]
      ? "done"
      : step.id === firstMissing
        ? "current"
        : previousDone
          ? "pending"
          : "blocked"
    return { ...step, status }
  })
  const requiredBeforeSend: Array<[boolean, string]> = [
    [Boolean(request.identityVerified), "identitatea solicitantului"],
    [Boolean(request.systemsScoped), "sistemele unde se caută datele"],
    [Boolean(request.dataSearchCompleted), "căutarea datelor"],
    [Boolean(request.draftResponseGenerated), "draftul de răspuns"],
    [Boolean(request.responseReviewedByHuman), "review-ul uman DPO"],
  ]
  const blockedReasons = requiredBeforeSend.flatMap(([ok, label]) => ok ? [] : [label])
  const canRespond = blockedReasons.length === 0
  const completedBeforeArchive = STEP_DEFS
    .filter((step) => step.id !== "archive")
    .filter((step) => doneByStep[step.id]).length
  const progressPercent = Math.round((completedBeforeArchive / (STEP_DEFS.length - 1)) * 100)
  const deadlineISO = request.extendedDeadlineISO ?? request.deadlineISO
  const daysLeft = Math.ceil((new Date(deadlineISO).getTime() - new Date(nowISO).getTime()) / 86_400_000)
  const isClosed = request.status === "responded" || request.status === "refused"

  return {
    steps,
    progressPercent,
    canRespond,
    blockedReasons,
    currentStepId: firstMissing,
    legalClock: {
      deadlineISO,
      daysLeft,
      status: isClosed ? "closed" : daysLeft < 0 ? "overdue" : daysLeft <= 5 ? "urgent" : "on_track",
    },
  }
}

export function resolveDsarLifecycleAction(
  action: DsarLifecycleAction,
  request?: Partial<DsarRequest>,
  now = new Date(),
): Partial<DsarRequest> | null {
  const nowISO = now.toISOString()
  const extendedDeadlineISO = request?.receivedAtISO
    ? new Date(new Date(request.receivedAtISO).getTime() + 60 * 86_400_000).toISOString()
    : new Date(now.getTime() + 60 * 86_400_000).toISOString()

  const actions: Record<DsarLifecycleAction, Partial<DsarRequest>> = {
    "verify-identity": { identityVerified: true, status: "in_progress" },
    "scope-systems": { systemsScoped: true, status: "in_progress" },
    "complete-data-search": { dataSearchCompleted: true, status: "in_progress" },
    "generate-draft": { draftResponseGenerated: true, status: "in_progress" },
    "review-response": { responseReviewedByHuman: true, status: "in_progress" },
    "mark-responded": { status: "responded", responseSentAtISO: nowISO },
    "archive": { archivedAtISO: nowISO },
    "start-processing": { status: "in_progress" },
    "await-verification": { status: "awaiting_verification" },
    "refuse": { status: "refused", responseSentAtISO: nowISO },
    "extend-deadline": { extendedDeadlineISO },
  }

  const patch = actions[action]
  return patch ? { ...patch } : null
}

export function isValidDsarStatus(status: unknown): status is DsarStatus {
  return (
    status === "received" ||
    status === "in_progress" ||
    status === "awaiting_verification" ||
    status === "responded" ||
    status === "refused"
  )
}
