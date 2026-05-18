# Sprint 023 — API / SDK pentru AI Builders

**Status:** ✅ DONE
**Faza:** 5 (Commercial readiness — ultimul sprint înainte de faza comercială)
**Start:** 2026-05-18 12:50
**End:** 2026-05-18 13:25
**Owner:** manual: Claude

---

## Goal

Transformă CompliRoAI dintr-un UI tool într-un *compliance layer* pe care AI
builderii îl integrează în CI/CD. Surface: REST API stable v1 + SDK TypeScript
zero-dep cu autentificare prin API key, rate limiting real, audit logging
end-to-end, Compliance Gate engine determinist + explainable.

---

## Task list

- [x] Types pentru ApiKey, ApiCallLog, ComplianceGateResponse + extensii ComplianceState
- [x] api-v1-schema cu validare + redactare (summariseClassifyInput)
- [x] compliance-gate engine — 10 reguli (R1-R10) cu Art. references
- [x] api-key-store (HMAC, cross-org reverse index)
- [x] api-rate-limit (sliding window 60s, 60 req/min)
- [x] api-audit (logApiCall, emitDeploymentFinding)
- [x] api-context resolver (Bearer + session) + runWithOrgContext (AsyncLocalStorage)
- [x] POST /api/v1/classify
- [x] POST /api/v1/gate
- [x] POST /api/v1/deployment (emits findings on review/blocked)
- [x] GET /api/v1/keys + POST /api/v1/keys + DELETE /api/v1/keys/[id]
- [x] GET /api/v1/health
- [x] GET /api/v1/openapi (OpenAPI 3.1 spec)
- [x] CompliRoAIClient SDK + CompliRoAIError + types re-export
- [x] /dashboard/api-sdk rewrite (key mgmt + endpoint reference + recent calls)
- [x] /docs/api public page (curl + Python + Node + GitHub Actions examples)
- [x] docs/api/README.md + EXAMPLES.md
- [x] nav-config: badge "coming-soon" removed
- [x] Audit Pack: pushApiSdkFiles wired (api-keys-registry + recent-calls + gate-results)
- [x] Build clean (npm run build)
- [x] tsc clean
- [x] vitest: 1052 → 1151 (+99 tests)
- [x] 9 commits + push

---

## Files created

### Engine / library
- `lib/compliance/api-v1-schema.ts` — input validators + V1_API_VERSION
- `lib/compliance/api-v1-schema.test.ts` — 16 tests
- `lib/compliance/compliance-gate.ts` — pure deterministic gate engine R1-R10
- `lib/compliance/compliance-gate.test.ts` — 19 tests covering every rule path

### Server adapters
- `lib/server/api-key-store.ts` — create/verify/revoke/list + cross-org index
- `lib/server/api-key-store.test.ts` — 12 tests
- `lib/server/api-rate-limit.ts` — sliding window
- `lib/server/api-rate-limit.test.ts` — 11 tests
- `lib/server/api-audit.ts` — logApiCall + emitDeploymentFinding
- `lib/server/api-audit.test.ts` — 7 tests
- `lib/server/api-context.ts` — Bearer/session auth resolver

### API routes
- `app/api/v1/classify/route.ts` + test (4 tests)
- `app/api/v1/gate/route.ts` + test (4 tests)
- `app/api/v1/deployment/route.ts` + test (3 tests)
- `app/api/v1/keys/route.ts` + test (5 tests)
- `app/api/v1/keys/[id]/route.ts`
- `app/api/v1/health/route.ts` + test (2 tests)
- `app/api/v1/openapi/route.ts` + test (1 test)

### SDK
- `lib/sdk/client.ts` — CompliRoAIClient + CompliRoAIError
- `lib/sdk/index.ts` — public re-exports for future `@compliroai/client` npm
- `lib/sdk/client.test.ts` — 9 tests against mock fetch

### UI
- `app/dashboard/api-sdk/page.tsx` — full rewrite (key mgmt + endpoints + log)
- `app/docs/api/page.tsx` — public docs (static, no auth)

### Docs
- `docs/api/README.md`
- `docs/api/EXAMPLES.md`

### Audit Pack
- `tests/audit-pack-builder-sprint-023.test.ts` — 4 tests (incl. hmacHash leak guard)

### Sprint log
- `docs/sprints/sprint-023-api-sdk-ai-builders.md`

## Files modified

- `lib/compliance/types.ts` — added ApiKey, ApiCallLog, ComplianceGateResponse types + extended ComplianceState with `apiKeys?` + `apiCallLogs?`
- `lib/server/org-context.ts` — added `runWithOrgContext` (AsyncLocalStorage override) so /api/v1/* routes (excluded from session middleware) can still call readState/writeState
- `lib/server/audit-pack-builder.ts` — added `pushApiSdkFiles()` emitting 3 markdown files under `api-sdk/`
- `components/shell/nav-config.ts` — removed `badge: "coming-soon"` from /dashboard/api-sdk item
- `components/shell/nav-config.test.ts` — replaced "coming-soon" assertion with live state + new test on badge undefined
- `lib/server/feature-gates.test.ts` — added explicit assertion that `api_sdk` belongs to ai-builder ONLY (imm-classic + cabinet excluded)

---

## Schema changes

- State extension: `ComplianceState.apiKeys?: ApiKey[]` + `ComplianceState.apiCallLogs?: ApiCallLog[]`
- No Supabase migration — both arrays are optional on the JSON state blob
- Reverse index for cross-org token lookup is in-memory only (rebuilt from disk on cold start)

---

## Tests

- `npx tsc --noEmit`: clean
- `npm run build`: clean (all 8 /api/v1/* routes + /docs/api Static registered)
- vitest: **1052 → 1151 (+99 new tests)**, all green
- Live verifications via tests:
  - `/api/v1/health` → 200 with `version: "v1"`
  - `/api/v1/openapi` → 200 with OpenAPI 3.1 paths for every endpoint
  - `/api/v1/gate` with `biometric-identification` → `verdict: "blocked"` + Art. 5
  - `/api/v1/gate` with high-risk deployer + no FRIA → `verdict: "review_required"` + Art. 27
  - `/api/v1/gate` with `document-assistant` (minimal risk) → `verdict: "pass"`
  - `/api/v1/deployment` with non-pass verdict → `findingEmitted: true`

---

## Decisions made

- **Token format `cra_<32 hex>`**: 16 random bytes hex-encoded. Full token shown ONCE on creation; only SHA-256 hash + first 8 chars persisted. CompliRoAI brand prefix avoids collision with other ecosystems.
- **Scope model**: 4 scopes (`classify`, `gate`, `deployment`, `read_state`). Session auth bypasses scope checks (UI is fully privileged). API-key auth enforces per-scope access via `requireScope()`.
- **Cross-org auth path**: in-memory `Map<hmacHash, {orgId, apiKeyId}>` populated eagerly on key creation + lazily from disk scan on first miss. Cleaner than scanning every state file per request.
- **AsyncLocalStorage for org context**: `/api/v1/*` is excluded from the session middleware, so handlers resolve auth manually then run downstream code inside `runWithOrgContext(ctx, fn)`. `getOrgContext()` checks the ALS override first before falling back to request headers. Zero risk of cross-request bleed (AsyncLocalStorage is request-scoped by Node runtime).
- **Compliance Gate verdict ladder, not score**: 10 named rules (R1-R10), each tied to an EU AI Act / GDPR article. Worst-wins ladder (pass < review_required < blocked). NO 0-100 score — every verdict can be explained via `reasons[]` with `articleRef`. Defensible against developer scrutiny.
- **Redaction**: `summariseClassifyInput` is the redaction boundary. Audit logs store only purpose + sector + boolean flags. NEVER systemName / userGroups / dataCategories / modelProvider — those can carry PII or customer secrets.
- **API response language**: keys in English (developer ergonomics); human-facing `message` / `nextAction` strings in Romanian by default. Documented in /docs/api so SDK consumers know what to expect.
- **OpenAPI 3.1 served from /api/v1/openapi**: no separate Swagger UI yet — the JSON is enough for openapi-generator users and Postman imports.
- **Backward compat with /api/v1/clasifica**: legacy simple endpoint preserved untouched. New /api/v1/classify is the upgrade path; the old one stays alive for the public landing-page widget.

---

## Concerns / Blockers

- ⚠️ Rate-limit is in-memory per serverless instance — same trade-off as the rest of the store layer. Cross-instance perfect coordination requires Redis/Upstash and is deferred to the commercial phase (Sprint 24+).
- ⚠️ `@compliroai/client` is not yet published to npm. SDK is distributed by copy until Sprint 24 ships the package.

---

## Commits

- `79b13c9` — feat(sprint-23-1): API v1 types + ComplianceGate + ApiKey + ApiCallLog
- `1ff64c5` — feat(sprint-23-2): API v1 input schema + validation
- `b1ebf3d` — feat(sprint-23-3): Compliance Gate engine (pass|review|blocked, explainable, Art. references)
- `780e702` — feat(sprint-23-4): API key store + rate limit + audit logging
- `ccaa868` — feat(sprint-23-5): API v1 endpoints (classify + gate + deployment + keys + health + openapi)
- `be3b2b7` — feat(sprint-23-6): TypeScript SDK client (CompliRoAIClient + types)
- `9fe3001` — feat(sprint-23-7): /dashboard/api-sdk + /docs/api UI cu API keys management + endpoint reference + quickstart
- `16057fc` — feat(sprint-23-8): API/SDK in Audit Pack + nav-config coming-soon removed + visibility tests
- _(this commit)_ — docs(sprint-23): sprint log + INDEX update

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A foundation (ComplianceState + events + findings store)
- Sprint 005.5 role-classifier (used by /classify + /gate to resolve aiActRole)
- Sprint 015 feature-gates (api_sdk feature key already in workspace map)
- Sprint 016-021 modules — gate engine references FRIA / DPIA / Oversight / Logging obligations

**Unlocks for next sprints:**
- Sprint 24+ commercial phase — `@compliroai/client` npm publish; AI Ads / LLM Commerce surfaces can reuse `/api/v1/gate` as deployment guard

---

## Notes pentru următorul agent

- API surface is **stable v1**: never rename or remove fields. Add optional fields freely; ship breaking changes at `/api/v2`.
- `compliance-gate.ts` is a pure function. Add new rules R11+ by following the same pattern: tie each rule to a specific article, populate `obligations[]`, push `missingEvidence[]` + `nextActions[]`, and update verdict via `worse()`. Add tests.
- The reverse hash index (`api-key-store.ts`) only contains `active` keys. On `revokeApiKey`, the entry is removed eagerly. If you add a new auth surface, call `verifyApiKey` — don't reimplement.
- `runWithOrgContext` is the only correct way to call `readState/writeState/mutateFreshStateForOrg` from an unauthenticated route handler. The middleware doesn't inject headers for /api/v1/*.
- Rate limiter is keyed per (org + endpoint). If you ship a heavier endpoint, override `limit` in the call to `checkRateLimit({ key, limit: 10 })`.
- Audit Pack `api-sdk/` section reads from `state.apiCallLogs` + `state.apiKeys`. The cap of 1000 log entries is enforced in `api-audit.ts`. Never weaken the redaction in `summariseClassifyInput` — it's the only line between API logs and customer PII.

**STOP — Sprint 24 NOT touched.** AI Ads / LLM Commerce work belongs to the commercial phase.
