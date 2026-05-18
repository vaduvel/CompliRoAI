# Sprint 026 — EU AI Act Legal Coverage Matrix & Final Legal Hardening

**Status:** DONE
**Faza:** 5 — Commercial / final hardening
**Start:** 2026-05-18
**End:** 2026-05-18
**Owner:** manual: Claude

---

## Goal (1 propoziție)

Produce un document juridic-grade care mapează articol-cu-articol EU AI Act la modulele CompliRoAI și închide cele 3 `GAP_BLOCKER` rămase (Art. 21 — cooperare cu autoritățile, Art. 47 — EU Declaration of Conformity, Art. 48 — CE marking) prin extensii minime ale modulelor existente.

---

## Task list

- [x] Citește mandate Sprint 026 + legal source RO + recent sprints (016-025)
- [x] Scanează toate modulele existente → mapează la articole
- [x] Identifică `GAP_BLOCKER` reale (vs. fals-pozitive)
- [x] Build Art. 47 EU DoC generator (Anexa V — 7 câmpuri) ca extensie a Annex IV surface
- [x] Build Art. 48 CE marking checklist (7 itemuri context-aware: physical / digital / NB-route)
- [x] Build Art. 21 + Art. 26(11) Authority Cooperation Request log (store + 4 API endpoints + UI panel)
- [x] Wire toate cele 3 noi artifacte în Audit Pack (`documents/eu-declaration-art-47/`, `documents/ce-marking-art-48/`, `cooperation/cooperation-log.md`)
- [x] Extinde manifest counts (eu DoC, CE checklist, cooperation requests)
- [x] Audit trail log: include `documentType` real + 3 evenimente noi pentru cooperation requests
- [x] Add tests pentru toate cele 3 generatoare + store
- [x] tsc clean
- [x] vitest 1302 → 1329 (+27 verzi)
- [x] build clean
- [x] Forbidden framework scan: clean
- [x] Copy hygiene scan: clean
- [x] Write `docs/legal/eu-ai-act-coverage-matrix-2026-05-18.md` (matricea completă)
- [x] Write sprint log + update INDEX
- [x] Commit + push

---

## Files created

### Legal coverage matrix
- `docs/legal/eu-ai-act-coverage-matrix-2026-05-18.md` — matrice articol-cu-articol pe toate Titlurile + toate Anexele; surse, precedență, aggregate stats, gaps închise, justificări PARTIAL, citate articole-cheie.

### Sprint 026 — Art. 47 EU Declaration of Conformity (Annex V)
- `app/api/ai-act/eu-declaration/route.ts` — POST `/api/ai-act/eu-declaration` (creează `eu-doc-art-47` document în `generatedDocuments` + returnează markdown).

### Sprint 026 — Art. 48 CE marking checklist
- `app/api/ai-act/ce-marking/route.ts` — POST `/api/ai-act/ce-marking` (creează `ce-marking-art-48-checklist` document + returnează evaluation result).

### Sprint 026 — Art. 21 + Art. 26(11) Authority Cooperation
- `lib/server/authority-cooperation-store.ts` — store complet (CRUD + audit-pack markdown builder + type guards + label maps).
- `app/api/authority-cooperation/route.ts` — GET (list + schema) + POST (create).
- `app/api/authority-cooperation/[id]/route.ts` — GET (fetch by id) + PATCH (update / status transition with auto-stamping) + DELETE.

### Tests
- `lib/compliance/ai-conformity-assessment.test.ts` — 9 teste pentru `buildEUDeclarationOfConformity` (7 câmpuri Anexa V, AR non-EU, NB present/absent) + `evaluateCEMarkingChecklist` (context-aware filtering, verdict logic) + `buildCEMarkingChecklistDocument` (markdown rendering).
- `lib/server/authority-cooperation-store.test.ts` — 18 teste pentru type guards, labels, create (cu validări `other` + responsibleEmail + subject), update (auto-stamp respondedAtISO + closedAtISO la status change), delete, list, markdown builder (empty + with records).

## Files modified

### Schema extensions
- `lib/compliance/types.ts`:
  - `AIActGeneratedDocumentRecord.documentType`: union extins de la `"annex-iv"` la `"annex-iv" | "eu-doc-art-47" | "ce-marking-art-48-checklist"`.
  - `ComplianceState.authorityCooperationRequests?: AuthorityCooperationRequest[]` adăugat.
  - Tipurile noi: `AuthorityCooperationAuthority` (8 valori), `AuthorityCooperationStatus` (4 valori), `AuthorityCooperationRequest`.

### Conformity assessment library extension
- `lib/compliance/ai-conformity-assessment.ts`:
  - Adăugate `EUDeclarationInputs`, `EUDeclarationDocument`, `buildEUDeclarationOfConformity` (7 câmpuri Anexa V + retention Art. 18 + cooperation Art. 21 references + AR Art. 22 support).
  - Adăugate `CEMarkingChecklistItem`, `CE_MARKING_CHECKLIST` (7 itemuri cu `appliesTo` filtering), `CEMarkingChecklistAnswers`, `CEMarkingChecklistResult`, `evaluateCEMarkingChecklist` (verdict: `ready-for-ce` / `fixes-needed` / `blocked-critical`), `buildCEMarkingChecklistDocument`.

### UI — Conformitate page
- `app/dashboard/conformitate/page.tsx`:
  - Adăugate state-uri pentru EU DoC form + CE checklist form.
  - Adăugate handler-e `handleGenerateEuDoc` + `handleGenerateCeChecklist`.
  - Adăugate 2 secțiuni collapsible după butonul "Generează Anexa IV": EU DoC (form Anexa V 6 câmpuri) + CE Marking (toggles physical/NB + checklist context-aware + yes/no/na pills).
  - Adăugat helper `EuDocField` component.

### UI — AI Incidents page (cooperation panel)
- `app/dashboard/ai-incidents/page.tsx`:
  - Import-uri tipuri `AuthorityCooperationAuthority`, `AuthorityCooperationRequest`, `AuthorityCooperationStatus`.
  - Inserat `<AuthorityCooperationPanel />` imediat după `<StatsBar>` (collapsible, default closed; badge cu open-count când există solicitări deschise).
  - Append `AuthorityCooperationPanel` component (~280 linii) — form de creare + listă + status dropdown (auto-stamp prin API).

### Audit Pack builder
- `lib/server/audit-pack-builder.ts`:
  - Import `buildAuthorityCooperationMarkdown`.
  - Manifest summary extins cu `authorityCooperationRequestsCount`, `euDocArt47Count`, `ceMarkingChecklistArt48Count`.
  - Block nou pentru `documents/eu-declaration-art-47/_index.json` + per-document `.md`.
  - Block nou pentru `documents/ce-marking-art-48/_index.json` + per-document `.md`.
  - Nou helper `pushAuthorityCooperationFiles` → `cooperation/cooperation-log.md`.
  - Audit trail log: `DOCUMENT_GENERATED` event acum folosește `doc.documentType` real (nu hardcoded `annex-iv`). Plus 3 evenimente noi: `AUTHORITY_COOPERATION_REQUEST_LOGGED`, `AUTHORITY_COOPERATION_RESPONSE_SENT`, `AUTHORITY_COOPERATION_CASE_CLOSED`.
  - File-name helpers: `buildEuDocFileName`, `buildCEMarkingFileName`.

## Files removed

— Nimic.

---

## Schema changes

- `AIActGeneratedDocumentRecord.documentType` — union extins. Compatibil backward (existing `annex-iv` records continuă să funcționeze).
- `ComplianceState.authorityCooperationRequests` — nou câmp opțional. Lipsa lui într-un state existent este sigură (toate cite-urile folosesc `?? []`).
- Supabase: nothing (state-ul este JSONB; nu necesită migrație separată).

---

## Tests

- `npx tsc --noEmit`: clean (0 errors).
- `npx vitest run`: **1329 / 1329 pass** (era 1302 + 27 noi).
- `npm run build`: clean (0 warnings, 0 errors).
- Live test:
  - Build exits 0; route-uri noi listate corect (`/api/ai-act/eu-declaration`, `/api/ai-act/ce-marking`, `/api/authority-cooperation`, `/api/authority-cooperation/[id]`).
  - `/dashboard/conformitate` bundle a crescut de la ~10kB la 11.7kB — în limita razonabilă pentru 2 secțiuni adăugate.
  - `/dashboard/ai-incidents` rămas ~15.7kB (panel-ul nou e auto-fetched on mount).

---

## Decisions made

- **Decision A — Extindere vs. modul nou:** mandate § 026 interzice noi pagini /dashboard. Am ales să atașez Art. 47/48 la pagina `/dashboard/conformitate` existentă (collapsible sections) și Art. 21 la `/dashboard/ai-incidents` (panel deasupra listei). Niciun nou top-level nav item.
- **Decision B — Art. 21 plasare:** Approval Queue ar fi forțat un cuplaj artificial; AI Incidents este alegerea naturală pentru că autoritățile cer informații în legătură cu incidente / log-uri / tech doc. Panel-ul este însă distinct vizual și nu se confundă cu Art. 73.
- **Decision C — Authority Cooperation = state separat, nu sub `AIIncident.authorityCooperationLog`:** unele requesturi sunt independente de incidente (audit general, info pentru market surveillance). State separat permite cross-link explicit (`linkedIncidentIds`, `linkedDpiaIds`, `linkedFriaIds`).
- **Decision D — EU DoC + CE = sub `generatedDocuments`:** evită explozia de tipuri state separate; un singur câmp `documentType` discriminator. Audit Pack filtrează după `documentType` și plasează în subfoldere distincte.
- **Decision E — CE marking checklist context-aware:** itemii `physical-product` / `digital-only` / `notified-body-route` se filtrează la runtime în funcție de inputurile context-uale (boolean toggles). Acoperă cazul SaaS pur (digital) fără să forțeze itemi inaplicabili.
- **Decision F — Art. 10 / 13 / 18 / 19 considerate COVERED fără cod nou:** după audit detaliat, toate sunt acoperite operațional prin module existente. Matricea documentează exact unde (vezi tabel coloana "Modul").
- **Decision G — GPAI Art. 51-55 marcate NOT_TARGET / FUTURE_TIER:** piața RO 2026 nu are clienți la tier-ul ≥10^25 FLOPs. Build-out viitor la cerere, sprint dedicat.

---

## Concerns / Blockers

- ⚠️ **Digital Omnibus (mai 2026):** matricea conține un singur item `PROVISIONAL` (Art. 50(2) watermarking deadline 2 dec 2026 vs. 2 aug 2026). Dacă OJEU publică Omnibus diferit, schimbarea este o linie în `legislative-change-log.ts` + update entry matrice.
- ⚠️ **Art. 15 metric collection rămâne PARTIAL.** Acest tip de obligație (acuratețe / robustețe / cybersecurity măsurate live) cere integrare cu infrastructura clientului — nu poate fi automatizată de CompliRoAI. PMM Plan track-uiește planul + reviewul + anomaliile.
- (Niciun blocker.)

---

## Commits

(populated post-commit)

## Live URL

- Vercel preview: după push.

---

## Dependencies

**Requires from previous sprints:**
- Sprint 008A — Foundation Port (`AIActState`, `ComplianceState`, store adapter, events).
- Sprint 008B — Findings store (cross-linkage potențială cu Art. 21).
- Sprint 011 — Audit log + Audit Pack (manifest + hash chain).
- Sprint 020 — AI Incidents (Art. 73) — host pentru cooperation panel.
- Sprint 005.5 — Role Assessment (folosit pentru gate-uri ai-builder).
- Sprint 006 / 023.7 — Transparency (Art. 50).

**Unlocks for next sprints:**
- Niciuna prescrisă de mandate. Sprint 026 este STOP point conform § Stop condition.
- Eventual: dacă apar clienți GPAI provider tier (≥10^25 FLOPs), sprint dedicat pentru Art. 51-55 + Anexa XI/XII/XIII.

---

## Notes pentru următorul agent

- **Coverage matrix este sursa de adevăr legală.** Update obligatoriu la fiecare sprint care atinge un articol nou sau modifică implementarea existing.
- **Authority Cooperation panel** este collapsible default-closed; deschiderea declanșează `GET /api/authority-cooperation`. Dacă apar performance issues în viitor, panel-ul poate fi lazy-loaded (intersection observer).
- **EU DoC + CE checklist** generează markdown salvat în `state.generatedDocuments`. Pentru export PDF sau alte formate, există deja `lib/server/pdf-generator.ts` (Sprint 014) — poate fi extins fără să atingă logica de generare.
- **Audit Pack** rămâne sursa unică de evidence pentru audit extern. Nu adăuga sub-foldere noi fără să updatezi în paralel manifest summary + audit-trail log.
- **Mandate § Stop condition:** după Sprint 026, NU porni Sprint 027 fără mandate dedicat nou.
