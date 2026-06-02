# CompliRoAI — GPT Laptop Continuation Prompt

**Date:** 2026-05-28  
**Repo:** `/Users/vaduvageorge/Desktop/eu-ai-act`  
**Branch:** `codex/ds-orchestrator-readiness`  
**GitHub:** `vaduvel/CompliRoAI`  
**Last pushed commit:** `ed649a7` — `add orchestrator knowledge governance and e2e fixtures`

Acesta este prompt-ul de handoff pentru instanța GPT care va continua munca de pe laptop. Citește-l ca pe o stare de produs, nu ca pe o conversație.

---

## 1. Rolul tău

Ești instanța de continuitate pentru CompliRoAI.

Treaba ta este să continui produsul real, nu să reinventezi direcția și nu să reiei cercetarea de la zero. CompliRoAI este un AI Act + GDPR Compliance OS cu trei workspace-uri:

- Cabinet
- IMM Classic
- AI Builder

**Adevărul juridic și operațional rămâne în engine-urile deterministe, findings, evidence rules, review gates, audit trail și export readiness.**

Mistral este planner/composer de execuție. Nu este sursă de adevăr final. Nu marchează verdict legal final, nu auto-aprobă, nu auto-rezolvă.

---

## 2. Ce este deja confirmat și verde

Până la commit-ul `ed649a7`, următoarele sunt deja construite și validate:

- orchestrator knowledge governance
- monography corpus
- fixture pack E2E
- import flows
- live Mistral fixture matrix
- UI checks peste fixture pack
- retry logic pentru timeout la Mistral
- browser verification pe build stabil

### Baseline verificat

- `42/42` live fixture matrix passed
- `43/43` UI checks passed
- vizual, dashboard-ul orchestration flow este sănătos în browser

### Reguli deja fixate

- no final legal verdict in AI
- no auto-resolve
- no auto-approval
- source grounding strict
- tenant isolation strict
- unknown is not no
- high-risk candidate is not final high-risk
- prohibited candidate is not final prohibited practice

---

## 3. Ce trebuie citit înainte de orice lucru nou

Ca să continui corect, citește întâi:

- `docs/strategic/compliroai-final-execution-bible-2026-05-27.md`
- `docs/strategic/compliroai-gpt55-product-context-pack-2026-05-26.md`
- `docs/strategic/compliroai-analiza-strategica-icp-fluxuri-2026-05-26.md`
- `docs/strategic/compliroai-import-center-role-aware-2026-05-25.md`
- `docs/sprints/sprint-025-full-product-e2e-qa-production-hardening.md`
- `docs/superpowers/plans/2026-05-27-mistral-compliance-orchestrator.md`
- `data/research/ai-act-monographies/README.md`

Dacă trebuie să alegi un singur document ca adevăr de produs, folosește `compliroai-final-execution-bible-2026-05-27.md`.

---

## 4. Ce a fost împins deja pe GitHub

Acest branch conține deja:

- docs de direcție strategică
- monography corpus
- fixture pack complet E2E
- orchestrator knowledge governance
- Mistral planner / validator / state snapshot / guidance plan stack
- import endpoints și flows
- migrații Supabase
- UI și browser tests pentru fluxurile live

Nu reface ce este deja verde. Nu porni de la zero.

---

## 5. Ce este miezul produsului

CompliRoAI nu este:

- chatbot juridic
- generator de texte
- "AI care decide legea"
- raport PDF static

CompliRoAI este:

- client facts
- AI Act / GDPR truth
- deterministic classification
- Mistral execution planning
- human validation
- evidence lifecycle
- review gates
- audit pack export

Formula corectă:

`Date client -> fapte canonice -> clasificare preliminară -> obligații aplicabile -> findings -> dovezi -> plan de rezolvare -> review uman -> export dosar`

---

## 6. Cum trebuie să folosești Mistral

Mistral trebuie tratat ca:

- planner
- composer
- prioritizer
- explainer
- draft generator

Mistral NU trebuie să:

- seteze verdict legal final
- aprobe evidence
- marcheze finding ca resolved singur
- marcheze high-risk final
- ceară date din afara RAG-ului
- amestece tenant-uri
- spună "fully compliant"

Folosește Mistral cu grijă. Nu îl supra-solicita cu request-uri rapide inutile. Preferă batch-uri controlate și retry logic doar unde e nevoie.

---

## 7. Ce direcție urmează acum

Prioritatea imediată nu mai este cercetarea. Prioritatea este să transformi produsul din workflow logic în control plane operațional.

### Ordinea recomandată

1. external automation / evidence ingestion layer
2. webhook support pentru n8n / Grafana / GitHub / Vercel / CI-CD
3. monitoring capability model
4. evidence lifecycle și review gates
5. export readiness recalculation
6. hardening pentru validator, source grounding și tenant isolation
7. UX polish doar unde blochează fluxul real

### Dacă trebuie să alegi un singur lucru următor

Alege componenta care mută produsul din "user uploads everything manually" în "system accepts evidence/events from the real stack":

- webhook API
- evidence ingestion API
- monitoring evidence storage
- integration event audit trail

---

## 8. Reguli de execuție

### Nu face

- nu folosi mock data în fluxurile reale
- nu introduce hardcoded verdicts
- nu face demo-only shortcuts
- nu amesteca date între tenants
- nu comite artefacte generate în `output/`
- nu comite `docs/qa/`
- nu comite capturi din `.codex-test-screenshots/`

### Da, fă

- lucrează pe date și fluxuri reale
- verifică în browser local când schimbi UX sau flow-uri
- rulează testele țintite după modificări
- păstrează documentele strategice aliniate cu implementarea
- commit intentional după fiecare chunk mare de lucru
- împinge pe același branch

---

## 9. Cum să verifici munca

Folosește verificări reale, nu presupuneri:

- browser local pe app-ul curent
- Playwright pentru UI flow
- unit tests pentru orchestration / validator / import
- live fixture matrix pentru scenarii E2E
- audit trail verification când schimbi stări sau actions

Ce este important aici:

- dacă schimbi orchestration logic, verifici validatorul
- dacă schimbi importuri, verifici preview + commit + audit event
- dacă schimbi export readiness, verifici blocked/partial/ready states
- dacă schimbi tenant switching, verifici isolation

---

## 10. Repo hygiene

În worktree există și artefacte locale care nu trebuie împinse:

- `output/`
- `docs/qa/`
- `.codex-test-screenshots/`

Acestea rămân locale, cu excepția cazului în care cererea spune explicit altceva.

---

## 11. Ce ar trebui să fie făcut de următorul agent

Implementarea viitoare trebuie să continue cu:

### A. Ingestion / automation layer

- endpoint-uri pentru events și evidence
- suport pentru `source="n8n"` și alte integrări
- idempotency keys
- tenant scope validation
- audit pentru payload-uri acceptate și respinse

### B. Monitoring evidence

- dashboard URLs
- alert rules
- sample logs
- screenshots / snapshots
- webhook events
- review status

### C. Review orchestration

- DPO review
- legal review
- IT/security review
- management approval
- client approval

### D. Export readiness

- blocked / draft_only / partial / ready_for_review / approved / expired
- ce se poate exporta acum
- ce blochează exportul
- ce claims sunt interzise până la aprobare

### E. UX

- GuidedExecutionPlan UI
- evidence lifecycle UI
- monitoring capability UI
- import / intake / review / export flow clar

---

## 12. Unde te uiți când ai dubii

Păstrează ordinea asta:

1. docs strategice
2. sprint log
3. codebase current state
4. tests
5. browser verification

Nu începe cu re-interpretarea produsului.

---

## 13. Definiția de succes pentru această fază

Această fază este terminată corect când:

- produsul acceptă evidence și events din stack-ul real al clientului
- orchestration-ul rămâne tenant-safe și source-grounded
- export readiness se recalculează corect
- review gates sunt clare și enforceable
- Mistral rămâne planner, nu decident
- browser flow-ul rămâne stabil și verificabil
- commit-urile sunt curate și împinse pe GitHub

---

## 14. Mesaj scurt pentru tine, instanța de pe laptop

Nu reîncepe de la zero. Continuă de la ce este deja verde.

Ținta nu este un chatbot juridic.
Ținta este un orchestrator auditabil care transformă starea aplicației în:

- plan de execuție
- dovezi cerute
- review gates
- export readiness
- dosar auditabil

Acesta este CompliRoAI.
