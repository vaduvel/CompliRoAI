import { beforeEach, describe, expect, it, vi } from "vitest"

const hasSupabaseConfig = vi.fn()
const supabaseSelect = vi.fn()
const supabaseUpsert = vi.fn()

vi.mock("@/lib/server/supabase-rest", () => ({
  hasSupabaseConfig,
  supabaseSelect,
  supabaseUpsert,
}))

describe("ai-use-case-store batching", () => {
  beforeEach(() => {
    vi.resetModules()
    hasSupabaseConfig.mockReset()
    supabaseSelect.mockReset()
    supabaseUpsert.mockReset()
    hasSupabaseConfig.mockReturnValue(true)
  })

  it("batches org_id lookups when hydrating many client workspaces", async () => {
    const orgIds = Array.from({ length: 55 }, (_, index) => `org-${index + 1}`)
    supabaseSelect
      .mockResolvedValueOnce([
        {
          id: "uc-1",
          org_id: "org-1",
          workspace_mode: "cabinet",
          client_id: null,
          ai_project_id: null,
          linked_ai_system_id: null,
          linked_vendor_id: null,
          linked_model_id: null,
          linked_data_process_id: null,
          use_case_name: "Chatbot website",
          short_description: null,
          department: "customer_support",
          business_process: "customer_interaction",
          lifecycle_status: "active",
          owner_name: null,
          owner_email: null,
          owner_role: null,
          intended_purpose: "Support clienți",
          actual_use_description: null,
          out_of_scope_use: null,
          tool_name: null,
          vendor_name: null,
          model_name: null,
          deployment_mode: "saas",
          internal_users: [],
          affected_persons: [],
          vulnerable_groups: [],
          uses_personal_data: "unknown",
          uses_special_category_data: "no",
          uses_confidential_data: "unknown",
          uses_trade_secrets: "unknown",
          uses_children_data: "unknown",
          data_categories: [],
          input_data_source: [],
          data_region: null,
          transfer_outside_eea: "unknown",
          output_types: [],
          autonomy_level: "decision_support",
          human_review: "required_before_action",
          public_output: "no",
          direct_interaction_with_persons: "yes",
          automated_decision: "no",
          scoring_or_ranking: "no",
          impacts_people_rights: "unknown",
          annex_iii_domain: "none",
          prohibited_practice_flags: [],
          draft_role: "deployer",
          draft_risk_level: "limited_transparency",
          high_risk_candidate: false,
          prohibited_candidate: false,
          art50_transparency_trigger: true,
          gdpr_review_needed: false,
          dpi_needs_review: false,
          fria_candidate: false,
          vendor_review_needed: false,
          human_oversight_needed: false,
          logging_review_needed: false,
          qms_review_needed: false,
          pmm_review_needed: false,
          incident_process_needed: false,
          certainty_status: "self_reported",
          review_status: "draft",
          evidence_completeness_pct: 0,
          open_findings_count: 0,
          last_reviewed_at: null,
          last_reviewed_by: null,
          approved_at: null,
          approved_by: null,
          source: "import",
          source_import_id: null,
          source_row_number: null,
          source_magic_link_token: null,
          source_confidence_pct: null,
          consultant_notes: null,
          internal_notes: null,
          dedupe_key: "org-1::chatbot",
          audit_version: 1,
          created_at: "2026-01-01T00:00:00.000Z",
          created_by: "user-1",
          updated_at: "2026-01-01T00:00:00.000Z",
          updated_by: null,
          archived_at: null,
          archived_by: null,
        },
      ])
      .mockResolvedValueOnce([])

    const { loadAIUseCasesForOrgIds } = await import("./ai-use-case-store")
    const grouped = await loadAIUseCasesForOrgIds(orgIds)

    expect(supabaseSelect).toHaveBeenCalledTimes(2)
    expect(supabaseSelect.mock.calls[0]?.[1]).toContain('org_id=in.("org-1"')
    expect(supabaseSelect.mock.calls[1]?.[1]).toContain('org_id=in.("org-51"')
    expect(grouped.get("org-1")).toHaveLength(1)
  })

  it("batches large upserts to avoid long single Supabase requests", async () => {
    const records = Array.from({ length: 55 }, (_, index) => ({
      id: `uc-${index + 1}`,
      orgId: `org-${Math.floor(index / 5) + 1}`,
      workspaceMode: "cabinet",
      clientId: null,
      aiProjectId: null,
      linkedAiSystemId: null,
      linkedVendorId: null,
      linkedModelId: null,
      linkedDataProcessId: null,
      useCaseName: `Use case ${index + 1}`,
      shortDescription: null,
      department: "customer_support",
      businessProcess: "customer_interaction",
      lifecycleStatus: "active",
      ownerName: null,
      ownerEmail: null,
      ownerRole: null,
      intendedPurpose: "Support clienți",
      actualUseDescription: null,
      outOfScopeUse: null,
      toolName: null,
      vendorName: null,
      modelName: null,
      deploymentMode: "saas",
      internalUsers: [],
      affectedPersons: [],
      vulnerableGroups: [],
      usesPersonalData: "unknown",
      usesSpecialCategoryData: "no",
      usesConfidentialData: "unknown",
      usesTradeSecrets: "unknown",
      usesChildrenData: "unknown",
      dataCategories: [],
      inputDataSource: [],
      dataRegion: null,
      transferOutsideEea: "unknown",
      outputTypes: [],
      autonomyLevel: "decision_support",
      humanReview: "required_before_action",
      publicOutput: "no",
      directInteractionWithPersons: "yes",
      automatedDecision: "no",
      scoringOrRanking: "no",
      impactsPeopleRights: "unknown",
      annexIIIDomain: "none",
      prohibitedPracticeFlags: [],
      draftRole: "deployer",
      draftRiskLevel: "limited_transparency",
      highRiskCandidate: false,
      prohibitedCandidate: false,
      art50TransparencyTrigger: true,
      gdprReviewNeeded: false,
      dpiNeedsReview: false,
      friaCandidate: false,
      vendorReviewNeeded: false,
      humanOversightNeeded: false,
      loggingReviewNeeded: false,
      qmsReviewNeeded: false,
      pmmReviewNeeded: false,
      incidentProcessNeeded: false,
      certaintyStatus: "self_reported",
      reviewStatus: "draft",
      evidenceCompletenessPct: 0,
      openFindingsCount: 0,
      lastReviewedAtISO: null,
      lastReviewedBy: null,
      approvedAtISO: null,
      approvedBy: null,
      source: "import",
      sourceImportId: null,
      sourceRowNumber: null,
      sourceMagicLinkToken: null,
      sourceConfidencePct: null,
      consultantNotes: null,
      internalNotes: null,
      dedupeKey: `org-${Math.floor(index / 5) + 1}::${index + 1}`,
      auditVersion: 1,
      createdAtISO: "2026-01-01T00:00:00.000Z",
      createdBy: "user-1",
      updatedAtISO: "2026-01-01T00:00:00.000Z",
      updatedBy: null,
      archivedAtISO: null,
      archivedBy: null,
    }))

    const { upsertAIUseCasesToSupabase } = await import("./ai-use-case-store")
    await upsertAIUseCasesToSupabase(records as any)

    expect(supabaseUpsert).toHaveBeenCalledTimes(2)
    expect(supabaseUpsert.mock.calls[0]?.[1]).toHaveLength(50)
    expect(supabaseUpsert.mock.calls[1]?.[1]).toHaveLength(5)
  })
})
