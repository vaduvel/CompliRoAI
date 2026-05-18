# CompliRoAI API v1 — Developer Documentation

> Stable developer-facing surface released in **Sprint 023**. AI builders
> integrate this API into their CI/CD or backend to receive an EU AI Act +
> GDPR compliance verdict for every system / deployment.

## Versioning

- `/api/v1/*` is stable. Existing fields are never renamed or removed.
- Additive changes (new optional fields) are released under v1.
- Breaking changes ship at `/api/v2`. v1 stays live ≥ 12 months after v2 GA.
- Every response carries `apiVersion: "v1"` — check it defensively.

## Authentication

All endpoints except `/api/v1/health` and `/api/v1/openapi` require a Bearer
API key:

```
Authorization: Bearer cra_<32 hex chars>
```

Tokens are generated in [/dashboard/api-sdk](../../app/dashboard/api-sdk/page.tsx).
The full token is displayed **once**; only its SHA-256 hash + first 8-character
prefix are persisted. Lost tokens cannot be recovered — generate a new one
and revoke the lost one.

## Rate limit

60 requests / minute / organisation / endpoint. Excess returns
`429 Too Many Requests` with a `Retry-After` header in seconds.

## Endpoints

| Method | Path                       | Scope        | Description                                              |
| ------ | -------------------------- | ------------ | -------------------------------------------------------- |
| POST   | `/api/v1/classify`         | `classify`   | Risk class + AI Act article + obligations                |
| POST   | `/api/v1/gate`             | `gate`       | Compliance Gate verdict (pass / review_required / blocked) |
| POST   | `/api/v1/deployment`       | `deployment` | Register a deployment, emit findings on review/blocked    |
| GET    | `/api/v1/keys`             | session      | List org keys (no full tokens returned)                   |
| POST   | `/api/v1/keys`             | session      | Create a new key — returns full token **once**            |
| DELETE | `/api/v1/keys/{id}`        | session      | Revoke a key                                              |
| GET    | `/api/v1/health`           | public       | Service health check                                     |
| GET    | `/api/v1/openapi`          | public       | OpenAPI 3.1 spec JSON                                    |

## Compliance Gate — verdict ladder

The gate is **deterministic and explainable**. No 0-100 score — the verdict
is derived from 10 rules (R1-R10), each tied to a specific legal article.
Worst-wins ladder: `pass` < `review_required` < `blocked`.

| Rule | Trigger                                                        | Verdict           | Article            |
| ---- | -------------------------------------------------------------- | ----------------- | ------------------ |
| R1   | Prohibited purpose (biometric ID, image-manipulation-intimate) | blocked           | Art. 5             |
| R2   | High-risk + fully_autonomous + no oversight                     | blocked           | Art. 14(1)         |
| R3   | Biometric ID + no two-person rule                              | blocked           | Art. 14(4)         |
| R4   | Human-facing + no transparency notice                          | review_required   | Art. 50(1)         |
| R5   | High-risk deployer without FRIA                                | review_required   | Art. 27            |
| R6   | High-risk + personal data + no DPIA                            | review_required   | GDPR 35            |
| R7   | Personal data + no DPA                                         | review_required   | GDPR 28            |
| R8   | Non-EU vendor + personal data + no transfer mech.              | review_required   | GDPR 44-49         |
| R9   | High-risk + logging not enabled                                | review_required   | Art. 12            |
| R10  | Special categories without justification                       | review_required   | GDPR 9             |

## SDK

```ts
import { CompliRoAIClient } from "@compliroai/client"

const client = new CompliRoAIClient({ apiKey: process.env.COMPLIROAI_KEY! })
const gate = await client.gate({
  systemName: "HR Screener",
  purpose: "hr-screening",
  humanOversightDocumented: true,
  loggingEnabled: true,
})
if (gate.verdict !== "pass") process.exit(1)
```

See [EXAMPLES.md](./EXAMPLES.md) for curl + Python + GitHub Actions snippets.

## Audit Pack integration

Every API call is logged in `state.apiCallLogs` (capped at 1000 newest-first)
with a SHA-256-chained event. On Audit Pack export, the `api-sdk/` section
contains:

- `api-keys-registry.md` — active keys (label + prefix + status, never full token)
- `recent-calls.md` — last 100 API calls
- `compliance-gate-results.md` — aggregated verdict counts

## Error responses

All non-2xx responses share this shape:

```json
{
  "error": "Câmpul 'purpose' este obligatoriu.",
  "code": "REQUIRED_ENUM",
  "apiVersion": "v1",
  "errors": [
    { "field": "purpose", "message": "...", "code": "REQUIRED_ENUM" }
  ]
}
```

| Code              | Status | Cause                                       |
| ----------------- | ------ | ------------------------------------------- |
| `INVALID_JSON`    | 400    | Body is not JSON                            |
| `INVALID_INPUT`   | 400    | Validation failed                           |
| `INVALID_API_KEY` | 401    | Token revoked / unknown / wrong format      |
| `MISSING_AUTH`    | 401    | No Bearer + no session cookie               |
| `SCOPE_FORBIDDEN` | 403    | Key lacks required scope                    |
| `SESSION_REQUIRED`| 401    | `/keys` requires session (cookie) auth      |
| `RATE_LIMITED`    | 429    | 60 req/min cap exceeded                     |
| `NOT_FOUND`       | 404    | Key id not found / already revoked          |
