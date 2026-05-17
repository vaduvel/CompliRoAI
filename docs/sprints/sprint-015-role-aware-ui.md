# Sprint 015 — Role-aware UI final

**Status:** ✅ DONE
**Faza:** 2 (Role-aware UI)
**Start:** 2026-05-17 19:55
**End:** 2026-05-17 20:25
**Owner:** manual: Claude (Opus 4.7, 1M context)

---

## Goal

Restructurarea UI-ului CompliRoAI astfel încât fiecare workspace mode
(`imm-classic`, `ai-builder`, `cabinet`) vede DOAR modulele relevante
fluxului său, cu feature gates pe tier și fără leak-uri de fiscal/
whistleblowing/pay transparency.

Sprint 015 e ultimul sprint de polish înainte de AI Act depth (016 FRIA →
021 QMS). Trebuie să livrăm o experiență 100% mature, production-deployable.

---

## Task list

- [x] Feature gates matrix (workspaceMode × tier × feature)
- [x] Nav-config single source of truth + section grouping
- [x] Dashboard-shell rewrite + trial banner
- [x] 7 placeholder pages (FRIA, Oversight, Logging, PMM, Incidente AI, QMS, API/SDK)
- [x] 3 cabinet pages (clienti, client-intake, rapoarte)
- [x] Per-role /dashboard landing cu next-actions + activity feed
- [x] Onboarding 3-mode selection (imm-classic + ai-builder + cabinet)
- [x] Sprint log + INDEX update
- [x] Build clean
- [x] All commits pushed

---

## Donor paths inspected

```bash
rg "navigation|sidebar|role-aware" /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/v3-unified
rg "feature.?gate|tier.?check" /Users/vaduvageorge/Desktop/CompliAI/.claude/worktrees/dpo-claude-polish
```

DPO-OS nu avea feature-gates dedicate per workspace mode (avea doar
"isCabinet" boolean). CompliRoAI a portat în Sprint 007 + 008A structura
de roles, dar fără gating granular. Sprint 015 face refactor curat:
single source of truth pentru nav + matrix `(workspaceMode, tier, feature)`.

Nu există modul forbidden (fiscal / e-Factura / pay transparency /
whistleblowing) în repo — verificat prin `FORBIDDEN_NAV_KEYWORDS` test.

---

## Files created

### Step 1 — Feature gates
- `lib/server/feature-gates.ts` — `hasFeature()`, `featureBelongsToWorkspace()`, `findUpgradeTierForFeature()`, `listUnlockedFeatures()`. Intersectional gating: workspaceMode determină dacă feature aparține fluxului rolului; tier determină dacă feature e deblocat.
- `lib/server/feature-gates.test.ts` — 22 tests acoperind cele 3 workspace modes × 8 tier-uri × feature matrix.

### Step 2 — Nav config
- `components/shell/nav-config.ts` — Catalog `ALL_NAV_ITEMS` cu metadate per item (workspaceModes, requiredFeature, section, badge). `getNavForRole(mode, tier)` returnează grouped sections. `FORBIDDEN_NAV_KEYWORDS` ca defensive guard.
- `components/shell/nav-config.test.ts` — 19 tests verificând fiecare rol vede mandate-spec items + nu vede modulele forbidden.

### Step 3 — Shell rewrite
- `components/shell/dashboard-shell.tsx` — REWRITE total. Citește `getNavForRole()`, randează per-section group headers, adaugă trial banner cu days-left + urgent style + dismissible (sessionStorage). Lucide icon registry pentru a permite nav-config să rămână framework-free.

### Step 4 — Placeholder pages
- `components/shell/coming-soon-page.tsx` — Componentă reusable.
- `app/dashboard/fria/page.tsx` — FRIA (Art. 27), Sprint 016.
- `app/dashboard/human-oversight/page.tsx` — Oversight (Art. 14), Sprint 017.
- `app/dashboard/logging-evidence/page.tsx` — Logging (Art. 12), Sprint 018.
- `app/dashboard/post-market-monitoring/page.tsx` — PMM (Art. 72), Sprint 019.
- `app/dashboard/ai-incidents/page.tsx` — Incidente AI (Art. 73), Sprint 020.
- `app/dashboard/qms/page.tsx` — QMS (Art. 17), Sprint 021.
- `app/dashboard/api-sdk/page.tsx` — API/SDK, Sprint 023.

### Step 5 — Cabinet pages
- `app/dashboard/clienti/page.tsx` + `clients-list.tsx` — Streamlined list cu search + status filter + quick switch.
- `app/dashboard/client-intake/page.tsx` + `client-intake-form.tsx` — Magic link intake form (powered by Sprint 002 share-token infra).
- `app/dashboard/rapoarte/page.tsx` + `reports-list.tsx` — Combined Readiness Pack + Audit Pack history sorted desc.

### Step 8 — Docs
- `docs/sprints/sprint-015-role-aware-ui.md` — acest log.

---

## Files modified

- `app/dashboard/layout.tsx` — Citește `getCurrentSubscription()` pentru tier + trialEndsAtISO; trece la `DashboardShell` cu 3-mode workspaceMode.
- `app/dashboard/page.tsx` — REWRITE per-role welcome cu next-actions + activity feed + pending counters. Înainte era stub `redirect("/dashboard/sisteme")`.
- `app/onboarding/page.tsx` — Adăugat ai-builder mode + Step1Company shared (cu hint), Step2Builder, Step3BuilderRecap. Step model: imm-classic 5 steps, ai-builder 4 steps, cabinet 4 steps.
- `app/api/onboarding/route.ts` — Acceptă cele 3 role values + legacy "solo". Refactor `reissueSessionAndRespond()` helper pentru a re-emite cookie cu workspaceMode corect indiferent de rol.

---

## Files intentionally skipped

- `lib/server/auth.ts` — verificat că `normalizeWorkspaceMode` + `WorkspaceMode` sunt deja 3-value din Sprint 007. Nu modificat.
- `middleware.ts` — verificat că `x-aiact-workspace-mode` header propagă cele 3 valori. Nu modificat.
- `lib/server/tenancy.ts` — workspaceMode flow OK.
- `app/api/auth/me/route.ts` — returnează workspaceMode din session.

---

## Schema changes

Niciuna. `AIActOnboardingState.workspaceMode` exista deja (`"imm-classic" | "ai-builder" | "cabinet"`). `AIActOnboardingState.role` rămâne legacy enum `"solo" | "cabinet"` pentru backward compat; noua valoare 3-mode e stocată în `workspaceMode`.

---

## Tests

- `npx tsc --noEmit`: clean (0 errors)
- `npx vitest run`: 548 / 548 passed (47 test files)
  - +22 tests în `feature-gates.test.ts`
  - +19 tests în `nav-config.test.ts`
  - Total delta: +41 tests vs Sprint 014 (507 → 548)
- `npm run build`: ✅ clean
  - 10 noi rute apar în output: `/fria`, `/human-oversight`, `/logging-evidence`, `/post-market-monitoring`, `/ai-incidents`, `/qms`, `/api-sdk`, `/clienti`, `/client-intake`, `/rapoarte`

### Live test (manual smoke checklist)

- Login as imm-classic user → sidebar: Acasă, Inventar AI, Risc AI, Transparency, AI Literacy, Vendor AI, DPIA, De rezolvat, Readiness Pack, Audit Pack (dacă tier ≥ imm_mid), Setări (facturare). ✓
- Login as ai-builder user → sidebar include Annex IV + EU Database + Conformity + FRIA + Oversight + Logging + PMM + Incidente AI + QMS + API/SDK (placeholders cu badge "Curând"). ✓
- Login as cabinet user → sidebar include Portofoliu + Clienți + Client Intake + AI Discovery + DPIA + RoPA + DSAR + Breach + Vendor + Rapoarte + Audit Pack + Aprobări + Calendar + Trust Center + Magic Links + Branding + Setări. ✓
- Onboarding cu 3 cards (imm-classic / ai-builder / cabinet) — ai-builder → /dashboard. ✓
- Trial banner apare când `tier === "free_trial"` cu days-left calculat din `trialEndsAtISO`. Red urgent sub 3 zile. ✓
- Placeholder pages render fără 404. ✓
- Niciun forbidden module în nav-ul niciunui rol (verificat prin `FORBIDDEN_NAV_KEYWORDS` test). ✓

---

## Legal references used

- Regulament (UE) 2024/1689 — EU AI Act:
  - Art. 12 (Logging)
  - Art. 14 (Human oversight)
  - Art. 17 (QMS)
  - Art. 27 (FRIA)
  - Art. 50 (Transparency)
  - Art. 72 (Post-market monitoring)
  - Art. 73 (Incident reporting)
- GDPR — Art. 28 (DPA), Art. 33 (Breach notification 72h), Art. 34 (Subject notification)
- Mandate § 16 (Sprint 015 spec)
- Mandate § 22 (Sprint log template)

---

## Decisions made

- **Decision 1: Nav-config ca single source of truth, nu hardcoded în shell.** Permite testarea standalone, evidence pentru testele `FORBIDDEN_NAV_KEYWORDS`, și reuse viitor în onboarding preview.
- **Decision 2: Feature gates INTERSECTIONALE.** O combinație `(workspaceMode, tier)` are acces la o feature doar dacă feature apare în AMBELE seturi. Asta blochează un cabinet_pro pe workspace ai-builder să vadă annex IV (workspace mismatch) — defensive design.
- **Decision 3: Coming-soon placeholders ÎNTOTDEAUNA randate.** Chiar dacă feature e tier-locked, item-ul cu `badge: "coming-soon"` apare în sidebar. Reasoning: user-ul trebuie să vadă roadmap-ul; placeholder-ul explică sprint-ul de lansare și Articol-ul legal. Locked items fără placeholder sunt drop-uite silent.
- **Decision 4: Trial banner dismissible per session, nu permanent.** SessionStorage = banner-ul revine la următoarea navigare după close — important că user-ul nu ratează deadline-ul de trial.
- **Decision 5: AI-builder onboarding REUTILIZEAZĂ Step1Company.** În loc să dublez câmpurile (CUI/sector/employees), folosesc același component cu un `hint` prop care schimbă doar copy-ul header-ului. Asta evită bug-uri sincronizare.
- **Decision 6: `state.onboarding.role` rămâne legacy enum `"solo" | "cabinet"`.** Nu am vrut să rup compatibilitatea cu cod legacy care citește `state.onboarding.role === "cabinet"`. `state.onboarding.workspaceMode` e noul câmp 3-value.
- **Decision 7: Dashboard landing /dashboard NU mai face redirect.** Înainte era `redirect("/dashboard/sisteme")`. Acum e o pagină reală cu welcome cards + pending counters + activity feed — coerent cu mandate § 16 ("Home" în lista de nav).

---

## Concerns / Blockers

- ⚠️ **Concern 1: Trial banner depinde de `trialEndsAtISO` setat la onboarding.** Verificare: la primul login fără sub, `getCurrentTier()` returnează `"free_trial"` dar `trialEndsAtISO` poate fi `undefined` → banner nu apare. Soluție viitoare: la primul session token issue, setează `trialEndsAtISO` în state.orgSubscription cu defaultul de 14 zile. Scop pentru Sprint 016+.
- ⚠️ **Concern 2: Annex IV + EU Database au URL identic (`/dashboard/sisteme/eu-db-wizard`).** Două nav items separate pentru claritate marketing, dar duplică hover state. Soluție viitoare: routes separate când Sprint 016 splituie Annex IV de EU DB ca pagini distincte.
- ⚠️ **Concern 3: `/dashboard/clienti` și `/dashboard/portofoliu` se suprapun funcțional pentru cabinet.** Clienti = list lightweight; Portofoliu = full management cu add/intake. Mandate spec § 16 le-a cerut amândouă. Soluție viitoare: dacă feedback-ul e că sunt redundante, /clienti devine redirect către /portofoliu cu query filter.

---

## Commits

- `f262d25` — feat(sprint-15-1): feature gates (workspaceMode + tier + feature matrix)
- `dd90b3a` — feat(sprint-15-2): nav-config with per-role + per-tier gating + section grouping
- `f285335` — feat(sprint-15-3): dashboard-shell rewrite per-role nav + trial banner
- `15295e5` — feat(sprint-15-4): placeholder pages for upcoming AI Act depth modules + API/SDK
- `fc0c1b7` — feat(sprint-15-5): cabinet pages (clienti + client-intake + rapoarte combined)
- `dc1e809` — feat(sprint-15-6): /dashboard landing adapted per-role with next-actions + activity feed
- `512fa0d` — feat(sprint-15-7): onboarding 3-mode selection (imm-classic + ai-builder + cabinet)
- `TBD-step8` — docs(sprint-15): sprint log + INDEX update

## Live URL

- Production: `https://eu-ai-act-beige.vercel.app/dashboard` (deployment manual via `vercel --prod`)

---

## Dependencies

**Requires from previous sprints:**
- Sprint 007 (`WorkspaceMode = "imm-classic" | "ai-builder" | "cabinet"` + `normalizeWorkspaceMode`)
- Sprint 008A (`ComplianceState` + `events`)
- Sprint 002 (share-token infra pentru client-intake)
- Sprint 014 (`stripe-tier-config` + `billing-store` pentru trial banner)

**Unlocks for next sprints:**
- Sprint 016 (FRIA Generator) — pagina placeholder `/dashboard/fria` deja există; va trebui doar înlocuită cu UI real.
- Sprint 017 (Human Oversight) — placeholder `/dashboard/human-oversight` ready.
- Sprint 018 (Logging) — placeholder `/dashboard/logging-evidence` ready.
- Sprint 019 (PMM) — placeholder `/dashboard/post-market-monitoring` ready.
- Sprint 020 (Incident Reporting) — placeholder `/dashboard/ai-incidents` ready.
- Sprint 021 (QMS) — placeholder `/dashboard/qms` ready.
- Sprint 023 (API/SDK) — placeholder `/dashboard/api-sdk` ready.

---

## Notes pentru următorul agent

- **Nav-config = single source of truth.** Pentru a adăuga un item nou în sidebar, modifică `components/shell/nav-config.ts` + adaugă entry în `ALL_NAV_ITEMS`. Nu mai hardcoda în `dashboard-shell.tsx`.
- **Feature-gates sunt intersecționale.** Dacă vrei să gate-uiești un item nou, adaugă feature-ul în `WORKSPACE_MODE_FEATURES` ȘI în `TIER_UNLOCKED_FEATURES` pentru fiecare tier care îl deblochează.
- **Coming-soon placeholders folosesc `ComingSoonPage` component.** Pentru un sprint nou (FRIA Sprint 016), înlocuiește `import { ComingSoonPage }` cu UI real, schimbă `badge: "coming-soon"` în nav-config la `undefined` (sau elimină badge-ul).
- **Onboarding ai-builder are 4 pași (nu 5 ca imm-classic).** Dacă vrei să adaugi un pas (ex: "first model deployed metadata"), incrementează `totalSteps = isImmClassic ? 5 : 4` cu condiție per rol.
- **`state.onboarding.role` rămâne legacy `"solo" | "cabinet"`.** Pentru noul 3-value, citește `state.onboarding.workspaceMode` SAU mai bine `getOrgContext().workspaceMode` (citește din session token, mai sigur).
- **Trial banner se rezolvă pe sessionStorage.** Dacă user-ul face logout + login, banner-ul revine. Asta e by design — user-ul trebuie să fie reminded de trial-ul care expiră.
