# CompliRoAI — Product Context Pack pentru GPT 5.5 Pro

**Data:** 2026-05-26  
**Repo:** `/Users/vaduvageorge/Desktop/eu-ai-act`  
**GitHub:** `vaduvel/CompliRoAI`  
**Branch curent:** `codex/ds-orchestrator-readiness`  
**Produs:** CompliRoAI = AI Act + GDPR Compliance OS pentru 3 workspace-uri: Cabinet, IMM Classic, AI Builder.

Acest document este pentru cercetare externă cu GPT 5.5 Pro. Scopul este să înțeleagă exact aplicația, ce ICP-uri avem, ce funcționalități există, ce va exista în varianta finală și unde trebuie completate gap-urile.

---

## 1. Rezumat produs

CompliRoAI transformă obligațiile EU AI Act + GDPR în pași operaționali, dovezi, documente și audit pack-uri. Nu este un simplu chatbot și nu este doar o bibliotecă de documente. Este un workspace de execuție compliance:

- inventariezi sistemele AI;
- clasifici rolul legal și riscul;
- generezi documente și registre;
- creezi findings și task-uri de remediere;
- atașezi dovezi;
- rulezi monitorizare preventivă;
- exporți un Audit Pack verificabil.

Produsul este RO-first, dar arhitectura este EU-wide. Textul și workflow-urile sunt în română, cu referințe la Regulamentul (UE) 2024/1689, GDPR și module conexe DORA/NIS2/ePrivacy/consumer protection unde AI-ul le activează.

### Stack

- Next.js 15 App Router + React 19.
- Supabase pentru auth/state multi-tenant prin `org_state` JSONB + tabele auxiliare.
- Vercel pentru preview/production.
- Resend pentru emailuri operaționale.
- Stripe pentru billing tiers.
- Vitest + Playwright pentru testare.
- Audit Pack ZIP cu hash-chain / verificare publică.

### Principiu

Law-first. Nu inventăm obligații și nu ascundem decizia legală într-un LLM. Engine-urile deterministe, findings, coverage matrix și audit trail sunt sursa de adevăr. AI Guidance poate prioritiza/explica, dar nu execută și nu schimbă verdictul legal fără validare.

---

## 2. Cele 3 ICP-uri / workspace-uri

### ICP 1 — Cabinet / DPO extern / consultant AI compliance

**Cine este:** DPO extern, avocat tech/IT/AI, consultant GDPR+AI Act, consultant cyber/NIS2, consultant fintech/DORA, auditor AI, agenție AI/automation care livrează compliance pack pentru clienți.

**Nu este:** contabil, consultant fiscal, HR generic, pay transparency, whistleblowing. Aceste verticale sunt intenționat excluse din aplicația `eu-ai-act`.

**Durere:** are mai mulți clienți, fiecare cu date incomplete, multe obligații AI Act/GDPR și muncă manuală în Excel/Word/Drive. Are nevoie să livreze un serviciu repetabil, white-label, auditabil.

**Promisiune:** “import client, creez workspace izolat, triez obligațiile, cer date prin magic link, rezolv findings, export Audit Pack pentru client.”

**Funcționalități existente pentru Cabinet:**

- Portofoliu multi-client: `/dashboard/portofoliu`.
- Registru + import clienți: `/dashboard/clienti`.
- Workspace switch / execuție pe client: `/api/workspaces/switch`, `/api/workspaces/exit-execution`.
- Import CSV/TSV clienți cu coloane RO/EN, preview, validări, duplicate, CUI/email.
- Creare workspace client + `clientMeta`.
- Acțiuni inițiale generate din import în `De rezolvat`: intake, inventar AI, DPIA/GDPR review, AI Literacy, role/risk review.
- Magic links și public share: `/dashboard/magic-links`, `/share/[token]`.
- Client Intake: `/dashboard/client-intake`.
- Approval queue: `/dashboard/approvals`.
- Calendar deadline-uri: `/dashboard/calendar`.
- White-label: `/dashboard/setari/branding`.
- Trust Center public: `/dashboard/trust-center`, `/trust/[token]`.
- Audit Log: `/dashboard/audit-log`.
- Dosar/evidence vault: `/dashboard/dosar`.
- Audit Pack per client: `/dashboard/audit-pack`.
- Rapoarte: `/dashboard/rapoarte`.
- Module compliance client-scoped: Inventar AI, Role Assessment, Vendor Review, AI Discovery, FRIA, Oversight, Logging, PMM, AI Incidents, QMS, AI Ads, DPIA, RoPA, DSAR, Breach, Resolve, Preventive.

**Pricing curent:** Cabinet Solo 399 EUR/lună, Cabinet Pro 799 EUR/lună, Cabinet Enterprise 1499 EUR/lună.

**Flow client-ready verificat:**

1. Creează cont Cabinet.
2. Importă client CSV.
3. Client apare în Portofoliu cu acțiuni inițiale.
4. Intră în execuția clientului.
5. Deschide finding, atașează dovadă, marchează rezolvat.
6. Iese înapoi în cabinet.
7. Exportă Audit Pack pentru client.

**Research necesar pentru GPT 5.5 Pro:**

- Care sunt cele mai bune sub-segmente de cabinet în România/CEE care chiar plătesc pentru AI Act + GDPR?
- Cum ar trebui poziționată oferta: “AI compliance service kit”, “white-label evidence OS”, “audit pack factory” sau alt wedge?
- Ce pachet minim de livrabile vinde un consultant la 799-1500 EUR one-off?
- Ce workflow de onboarding reduce fricțiunea când consultantul are doar lista de clienți, nu datele AI ale clientului?
- Ce integrare ar conta prima: Excel/Sheets, Microsoft 365, Google Workspace, Jira/Linear/Notion, GitHub/GitLab, Vercel?

---

### ICP 2 — IMM Classic / deployer pasiv

**Cine este:** firmă 10-250 angajați care folosește AI cumpărat: ChatGPT, Copilot, Gemini, SaaS cu AI, chatbot suport, marketing automation, HR tools, analytics, vendor AI.

**Rol probabil AI Act:** de obicei deployer, uneori provider dacă modifică/substanțializează sau livrează sistemul mai departe.

**Durere:** nu știe ce AI folosește, ce date procesează, dacă există risc high-risk, ce trebuie documentat și ce cere un client enterprise/auditor.

**Promisiune:** “îmi inventariez AI-ul, văd obligațiile, primesc pași de lucru, atașez dovezi și export dosar readiness/audit.”

**Funcționalități existente pentru IMM Classic:**

- Onboarding rol IMM + companie + primul sistem AI.
- Dashboard cu AI Guidance.
- Inventar AI: `/dashboard/sisteme`.
- Clasificare risc și practici interzise: `/dashboard/conformitate` ca “Risc AI” pentru IMM.
- Transparency notices Art. 50: `/dashboard/transparency`.
- AI Literacy Art. 4: `/dashboard/literacy`.
- Vendor Review: `/dashboard/vendor-review`.
- AI Ads & Claims: `/dashboard/ai-ads`.
- DPIA: `/dashboard/dpia`.
- De rezolvat / findings: `/dashboard/resolve`.
- Dosar readiness: `/dashboard/readiness-pack`.
- Audit Pack pe tierurile care îl includ: `/dashboard/audit-pack`.
- Monitor preventiv: `/dashboard/preventive`.

**Pricing curent:** IMM Solo 99 EUR/lună, IMM Mid 249 EUR/lună. Free trial 14 zile.

**Important:** IMM Solo nu vede toate feature-urile premium. IMM Mid include Audit Pack + AI Ads.

**Research necesar pentru GPT 5.5 Pro:**

- Ce segmente IMM din România folosesc deja AI suficient cât să plătească: e-commerce, SaaS, agenții marketing, clinici, HR/recrutare, servicii financiare, educație, logistică?
- Ce trigger de cumpărare e mai puternic: frica de amendă, cerință enterprise procurement, reputație/trust, audit intern, DPO extern?
- Ce “minimum viable compliance pack” trebuie să primească un IMM în 30 minute?
- Cum explicăm AI Act fără să pară juridic greu?
- Ce câmpuri poate completa un IMM singur și ce trebuie colectat prin intake intern?

---

### ICP 3 — AI Builder / agenție AI / startup AI-native

**Cine este:** firmă care construiește produse, agenți, chatboturi, automatizări, copilots sau sisteme AI pentru clienți. Include startup-uri AI, agenții de automatizare, SaaS cu funcții AI, consultanți tehnici care livrează sisteme AI.

**Rol probabil AI Act:** provider, deployer, uneori distributor/importer, în funcție de cine pune sistemul pe piață, cine controlează intended purpose și cine face modificări substanțiale.

**Durere:** clienții enterprise cer dovadă că produsul AI e compliant; obligațiile provider/deployer sunt multe: Annex IV, QMS, logging, oversight, PMM, incidents, EU DB, CE/DoC, vendor/model chain.

**Promisiune:** “livrez proiecte AI cu compliance pack inclus, API/SDK și evidence pentru cumpărător.”

**Funcționalități existente pentru AI Builder:**

- Onboarding AI Builder.
- Inventar AI: `/dashboard/sisteme`.
- Role Assessment Art. 3: `/dashboard/role-assessment`.
- Evaluare conformitate + Annex IV + EU DoC + CE Marking: `/dashboard/conformitate`.
- EU Database Wizard: `/dashboard/sisteme/eu-db-wizard`.
- API/SDK: `/dashboard/api-sdk`, `/docs/api`, `/api/v1/*`.
- FRIA: `/dashboard/fria`.
- Human Oversight: `/dashboard/human-oversight`.
- Logging Evidence: `/dashboard/logging-evidence`.
- Post-Market Monitoring: `/dashboard/post-market-monitoring`.
- AI Incident Reporting: `/dashboard/ai-incidents`.
- QMS Workspace: `/dashboard/qms`.
- AI Ads & Claims: `/dashboard/ai-ads`.
- DPIA, RoPA, Resolve, Audit Pack, Preventive.

**API/SDK existent:**

- `/api/v1/health`
- `/api/v1/openapi`
- `/api/v1/classify`
- `/api/v1/gate`
- `/api/v1/deployment`
- `/api/v1/keys`
- API key store + rate limit + audit logging.
- Zero-dependency TypeScript SDK `CompliRoAIClient`.

**Pricing curent:** AI Builder 399 EUR/lună, include API/SDK.

**Research necesar pentru GPT 5.5 Pro:**

- Care este diferența de messaging pentru AI Builder: “provider compliance”, “enterprise trust pack”, “procurement-ready AI”, “compliance API”?
- Ce artefacte cer clienții enterprise când cumpără AI de la startup/agenție?
- Ce trebuie să conțină un “AI project handover pack” pentru beneficiar?
- Ce obligații sunt reale pentru agenții mici vs provider high-risk vs GPAI provider?
- Unde trebuie să integrăm direct: GitHub/GitLab, Vercel, OpenAI/Mistral/Anthropic billing, model registry, logs, evals, CI/CD?

---

## 3. Funcționalități existente — harta completă

### 3.1 Auth, tenancy, workspace-uri

- Login/register: `/login`.
- Onboarding 3 moduri: `imm-classic`, `ai-builder`, `cabinet`.
- Session token include `workspaceMode`, `orgId`, `orgName`, `userId`.
- Supabase/local/hybrid state prin `lib/server/store.ts`, `supabase-org-state.ts`, `tenancy.ts`.
- Cabinet poate comuta în workspace client și reveni la cabinet.

### 3.2 AI Inventory + classification

- `/dashboard/sisteme`
- CRUD sisteme AI.
- Clasificare AI Act: minimal/limited/high/prohibited candidate.
- Role/risk cues: personal data, automated decisions, impact rights, human review, vendor/model type.
- Banners către logging/oversight/FRIA/QMS când sistemul o cere.
- Audit Pack include inventarul.

### 3.3 Role Assessment + risk/classification

- `/dashboard/role-assessment`
- Engine Art. 3 pentru provider/deployer/importer/distributor.
- Immediate next steps.
- Integrare în guidance/readiness/audit.

### 3.4 AI Guidance Orchestrator

- Vizibil pe dashboard ca “Plan de lucru AI”.
- Cod principal: `lib/compliance/guidance-orchestrator.ts`.
- API: `/api/ai-guidance`.
- Store: `lib/server/guidance-plan-store.ts`.
- Surse: findings, preventive scanner, role classifier, AI project obligations, state-ul orgului.
- Produce acțiuni prioritizate, acțiuni omise, diff față de planul anterior, fingerprint, prompt version.
- Nu execută automat acțiuni.
- Status curent: determinist. Mistral-assisted composer este gap/roadmap imediat, dacă se decide păstrarea strictă a guardrail-urilor.

### 3.5 Findings / Resolve / Dosar / Audit trail

- `/dashboard/resolve`
- `/dashboard/dosar`
- `/dashboard/audit-log`
- Findings pot fi create de module, import, engine preventiv, stores.
- User poate atașa evidence, marca resolved, dismiss/delete unde e permis.
- Audit event hash-chain cu `prevHash` / `selfHash`.
- Evidence Vault + Audit Log export.

### 3.6 GDPR bridge

- DPIA: `/dashboard/dpia`, `lib/compliance/dpia-schema.ts`.
- RoPA / data map: `/dashboard/ropa`, `lib/compliance/ropa-risk-engine.ts`.
- DSAR: `/dashboard/dsar`, `lib/compliance/dsar-lifecycle.ts`.
- Breach GDPR 72h: `/dashboard/breach`, `lib/compliance/breach-narrative.ts`.
- PII discovery: `/dashboard/ai-discovery/pii-scan`.

### 3.7 Vendor AI assessment

- `/dashboard/vendor-review`
- Vendor library: OpenAI, Anthropic, Mistral, Microsoft, Google, Meta, Cohere etc.
- DPA/subprocessors/region/role/risk review.
- Vendor lifecycle și findings.

### 3.8 AI Discovery + policy pack

- `/dashboard/ai-discovery`
- Data map / exposure report / PII discovery.
- AI policy pack: acceptable use, vendor, incident, logging, oversight.
- Discovery triggers orchestrator.

### 3.9 Transparency Art. 50 + Content Register

- `/dashboard/transparency`
- Notices per AI system.
- Content Register per asset: image/video/audio/text/deepfake/public interest text/chatbot interaction.
- Machine-readable marking / watermark evidence.
- Audit Pack `transparency/`.

### 3.10 AI Ads & Claims

- `/dashboard/ai-ads`
- Campanii, claims, creative approvals, tracking review, export.
- Legal-mapped rules: platform terms, DPA, conversion tracking, evidence missing, ad transparency, vulnerable targeting, geo/LLM source registry, approval gaps.
- Audit Pack `ai-ads/`.

### 3.11 AI Act depth modules

- FRIA Art. 27: `/dashboard/fria`, 24 fundamental rights, risk matrix, notification workflow.
- Human Oversight Art. 14: `/dashboard/human-oversight`, 5 capabilities, escalation, contestation, stop/fallback, two-person biometric rule.
- Logging Evidence Art. 12/19/26(6): `/dashboard/logging-evidence`, event categories, retention, integrity, access roles, evidence.
- Post-Market Monitoring Art. 72: `/dashboard/post-market-monitoring`, review cycle, version changes, anomalies, substantial modification marker.
- AI Incident Reporting Art. 73: `/dashboard/ai-incidents`, serious incidents, deadlines 2/10/15 days, authority notification, root cause, PMM escalation, GDPR breach linking.
- QMS Art. 17: `/dashboard/qms`, 13 sections, SME simplified mode, cross-module references, lessons learned, system attestations.

### 3.12 Conformity / Annex IV / EU DoC / CE / EU Database

- `/dashboard/conformitate`
- Annex IV Generator.
- Conformity Assessment.
- EU Declaration of Conformity Art. 47 + Annex V.
- CE Marking checklist Art. 48.
- EU Database Wizard `/dashboard/sisteme/eu-db-wizard`.
- Authority Cooperation Log Art. 21/26(11) in AI incidents panel.

### 3.13 Preventive engine + renewal tracker

- `/dashboard/preventive`
- Scanner rules across modules.
- Legislative change log.
- Renewal reminders.
- Cron routes: `/api/cron/preventive-scan`, `/api/cron/renewal-reminders`.
- Email reminders/monthly digest.

### 3.14 Exporturi, colaborare și trust

- Readiness Pack: `/dashboard/readiness-pack`.
- Audit Pack: `/dashboard/audit-pack`.
- Public verify pack: `/verify-pack`.
- Magic links/share: `/share/[token]`.
- Trust Center: `/dashboard/trust-center`, `/trust/[token]`.
- Approval queue: `/dashboard/approvals`.
- Calendar + iCal: `/dashboard/calendar`, `/api/calendar/ical`.
- Branding white-label.
- PDF generator.

### 3.15 Billing

- `/dashboard/setari/billing`
- Stripe checkout/portal/webhook.
- Tiers: Free Trial, IMM Solo, IMM Mid, AI Builder, Cabinet Solo, Cabinet Pro, Cabinet Enterprise, One-off Audit.

---

## 4. Legal coverage status

Coverage matrix internă: `docs/legal/eu-ai-act-coverage-matrix-2026-05-18.md`.

Status agregat:

- 56 intrări COVERED.
- 1 PARTIAL: Art. 15 metric collection rămâne provider-specific; CompliRoAI track-uiește planul + reviewul + evidence.
- 0 GAP_BLOCKER după Sprint 026.
- ~25 NOT_TARGET: autorități, notified bodies, AI Office, instituții UE.
- GPAI systemic provider este FUTURE_TIER, nu target 2026 pentru piața RO.
- Art. 50(2) deadline are notă PROVISIONAL legată de Digital Omnibus.

Surse legale interne:

- OJEU Regulation (EU) 2024/1689 este sursa de precedență.
- `docs/legal/eu-ai-act-full-text-romanian-2026-05.md`.
- Coverage matrix menționează expres că OJEU prevalează peste sumarul RO intern.

---

## 5. Stadiu actual al branch-ului

Branch `codex/ds-orchestrator-readiness` este peste `origin/codex/ds-orchestrator-readiness` și are modificări locale necomise pentru Import Center / role-aware orchestration:

- import client extins;
- taburi import center pentru `Clienți`, `Sisteme AI`, `Furnizori / modele`, `RoPA / date`, `AI Literacy`;
- endpoint import sisteme AI pe clienți;
- exit execution din workspace client înapoi în cabinet;
- fixes pentru Audit Pack/Readiness empty states;
- Resolve lifecycle mai stabil.

Testele notate pentru ultima verificare Import Center:

- `npm test -- --run lib/client-import.test.ts` -> 7/7 PASS.
- Playwright Radu consultant E2E critic -> 1/1 PASS.
- Import Center v2 smoke UI -> PASS.
- `npm run build` -> PASS.

---

## 6. Ce trebuie să existe în aplicația finală client-ready

### Final pentru Cabinet

- Import Center complet: clienți, sisteme AI per client, vendors/models, RoPA, AI Literacy, proiecte AI Builder.
- “Nu am fișier” path pentru fiecare tab: generează intake/checklist, nu blochează userul.
- Execuție client fără confuzie între cabinet HQ și workspace client.
- Audit Pack per client cu toate secțiunile.
- White-label complet, Trust Center, approvals, magic links, calendar.
- Raport de progres cross-client și prioritizare AI Guidance.

### Final pentru IMM Classic

- Onboarding rapid și intern intake pentru AI inventory.
- Guided setup: primul sistem AI -> risc -> literacy -> vendor -> DPIA/RoPA -> transparency -> Audit Pack.
- Explicații simple, fără limbaj juridic excesiv.
- Monthly digest “ce s-a schimbat / ce trebuie făcut”.
- Import din M365/Google/HR/vendor billing ca opțiuni viitoare.

### Final pentru AI Builder

- Project import/handover pack.
- Annex IV + EU DoC + CE + EU DB flow complet.
- API/SDK în CI/CD.
- Logging/PMM/QMS/incident evidence per sistem.
- Vendor/model chain și model registry.
- Monitoring evidence layer: repo/config drift, runtime logging, eval metrics, model cards, dataset lineage.
- “Procurement-ready AI compliance pack” pentru clienți enterprise.

### Cross-product final

- AI Guidance cu Mistral-assisted phrasing strict guardrailed, dar deterministic facts rămân sursa de adevăr.
- Monitoring Evidence Foundation: `ai-compliance.yaml`, repo/config drift, runtime logging, model/eval evidence, drift -> finding -> guidance.
- Better data ingestion: CSV/Excel acum, integrări apoi.
- Cleaner gap scoring per module: what is complete, partial, missing, blocked.
- Full commercial website + onboarding conversion + self-serve billing.

---

## 7. Gaps / întrebări pentru GPT 5.5 Pro

### A. Research pe piață și ICP-uri

1. Care dintre cele 3 ICP-uri are cel mai rapid path la revenue în România/CEE în 2026?
2. Ce buyer titles exacte cumpără pentru fiecare ICP?
3. Ce trigger de cumpărare este cel mai puternic pe fiecare ICP?
4. Ce ofertă one-off poate vinde produsul înainte de abonament?
5. Ce prețuri sunt defensibile pentru România vs EU/CEE?
6. Ce competitori direcți/indirecți există pe fiecare ICP și cum se diferențiază CompliRoAI?

### B. Research legal/product gaps

1. Verifică coverage matrix față de Regulamentul (UE) 2024/1689 și confirmă dacă `0 GAP_BLOCKER` este realist.
2. Identifică obligații AI Act care sunt prea “document-only” și au nevoie de workflow/evidence.
3. Identifică zone unde produsul promite prea mult pentru IMM-uri mici.
4. Confirmă ce este NOT_TARGET vs FUTURE_TIER pentru GPAI.
5. Confirmă Art. 50(2) deadline și orice impact Digital Omnibus.
6. Verifică dacă Art. 15 poate rămâne PARTIAL sau trebuie modul de metric evidence.

### C. Research onboarding/import

1. Pentru fiecare ICP, ce date are userul realist în ziua 1?
2. Ce date pot fi importate hard vs ce trebuie colectat prin intake?
3. Ce template-uri CSV/Excel ar trebui oferite?
4. Ce integrare ar aduce cel mai mult leverage prima?
5. Cum ar trebui arătat “data certainty” în UI?

### D. Research commercial packaging

1. Reformulează pachetele pentru landing: IMM, AI Builder, Cabinet.
2. Propune “deliverables list” pentru fiecare tier.
3. Propune sales narrative pentru consultanți: cum vând mai departe serviciul.
4. Propune objections + answers: “nu am AI”, “nu sunt high-risk”, “avem DPO”, “facem manual”.
5. Propune trial-to-paid activation moment.

### E. Research product gaps pentru client-ready

1. Ce lipsește înainte să putem da aplicația la 5 cabinete pilot?
2. Ce lipsește înainte să putem da aplicația la 20 IMM-uri?
3. Ce lipsește înainte să putem vinde AI Builder ca API/SDK compliance layer?
4. Ce flows trebuie testate e2e obligatoriu?
5. Ce module trebuie ascunse/gated ca să nu sperie userii noi?

---

## 8. Guardrails pentru cercetare

- Nu transforma produsul în fiscal/e-Factura/ANAF/SAF-T/pay transparency/whistleblowing.
- Nu propune verticală separată pentru fiecare use case AI; verticalele sunt overlays în același OS.
- Nu muta legal truth într-un LLM. LLM poate explica, nu decide singur.
- Nu cere utilizatorului dosar complet înainte de import; produsul trebuie să pornească din date incomplete.
- Nu trata GPAI systemic provider ca target principal România 2026.
- Nu promite consultanță juridică automată; poziționare sigură: workspace de execuție, evidence, audit readiness, human review.

---

## 9. Fișiere cheie pentru orientare în repo

- `components/shell/nav-config.ts` — harta modulelor vizibile per workspace.
- `lib/server/feature-gates.ts` — feature gates per workspace/tier.
- `lib/server/stripe-tier-config.ts` — pricing/tier configuration.
- `lib/compliance/types.ts` — state model.
- `lib/compliance/guidance-orchestrator.ts` — AI Guidance deterministic planner.
- `components/ai-guidance/guidance-plan-panel.tsx` — UI card “Plan de lucru AI”.
- `lib/client-import.ts` — Import Center parsing/mapping.
- `app/dashboard/clienti/clients-list.tsx` — Import Center UI.
- `app/dashboard/portofoliu/portfolio-client.tsx` — Cabinet portfolio.
- `lib/server/audit-pack-builder.ts` — Audit Pack export.
- `docs/legal/eu-ai-act-coverage-matrix-2026-05-18.md` — legal coverage.
- `docs/sprints/INDEX.md` — sprint history.
- `docs/strategic/compliroai-import-center-role-aware-2026-05-25.md` — import strategy.

---

## 10. Prompt sugerat pentru GPT 5.5 Pro

Folosește acest context pack ca descriere exactă a CompliRoAI. Fă research strategic și legal pentru cele 3 ICP-uri: Cabinet/DPO extern/consultant, IMM Classic deployer și AI Builder/agenție AI. Pentru fiecare ICP, explică:

1. cine este cumpărătorul real;
2. ce job-to-be-done are;
3. ce obligații EU AI Act/GDPR sunt cele mai relevante;
4. ce funcționalități CompliRoAI acoperă deja;
5. ce gap-uri produs/comercial/legal rămân;
6. ce pachet minim client-ready trebuie livrat;
7. ce integrare/import/workflow are prioritate;
8. ce pricing și messaging sunt cele mai probabile să convertească;
9. ce riscuri de overclaim trebuie evitate;
10. ce roadmap în 30/60/90 zile recomanzi pentru pilot plătit.

Returnează rezultatul în română, pragmatic, orientat spre decizii de produs și vânzare, nu eseu juridic.
