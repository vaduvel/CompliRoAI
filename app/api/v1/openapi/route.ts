// Sprint 023 — OpenAPI 3.1 spec for the /api/v1 surface.
//
// Public (no auth, no rate limit). Returned as JSON. Consumers:
//   - Swagger/Redoc UIs at /docs/api
//   - openapi-typescript or openapi-generator for SDK regeneration
//   - integration tests against the live spec contract

import { NextResponse } from "next/server"

import {
  VALID_AUTONOMY_LEVELS,
  VALID_DEPLOYMENT_CONTEXTS,
  VALID_PURPOSES,
  VALID_SECTORS,
  VALID_VENDOR_REGIONS,
} from "@/lib/compliance/api-v1-schema"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "CompliRoAI API",
      description:
        "Developer-facing API for AI builders integrating CompliRoAI into their build/deploy workflow. EU AI Act + GDPR compliance classification, gate verdict (pass/review/blocked), and deployment registration.",
      version: "1.0.0",
      contact: {
        name: "CompliRoAI",
        url: "https://eu-ai-act-beige.vercel.app",
      },
      license: { name: "Proprietary" },
    },
    servers: [
      { url: "/", description: "Same-origin" },
    ],
    tags: [
      { name: "classify", description: "Classify AI systems against EU AI Act." },
      { name: "gate", description: "Compliance Gate verdict (pass/review/blocked)." },
      { name: "deployment", description: "Register a deployment + emit findings on review/blocked." },
      { name: "keys", description: "API key management (session-auth only)." },
      { name: "meta", description: "Health + spec endpoints." },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API key in format cra_<32 hex>",
        },
      },
      schemas: {
        ClassifyInput: {
          type: "object",
          required: ["systemName", "purpose"],
          properties: {
            systemName: { type: "string", maxLength: 256 },
            purpose: { type: "string", enum: VALID_PURPOSES },
            sector: { type: "string", enum: VALID_SECTORS, nullable: true },
            userGroups: { type: "array", items: { type: "string" }, maxItems: 32 },
            dataCategories: { type: "array", items: { type: "string" }, maxItems: 32 },
            processesPersonalData: { type: "boolean", nullable: true },
            processesSpecialCategories: { type: "boolean", nullable: true },
            autonomyLevel: { type: "string", enum: VALID_AUTONOMY_LEVELS, nullable: true },
            humanOversightDocumented: { type: "boolean", nullable: true },
            loggingEnabled: { type: "boolean", nullable: true },
            vendorRegion: { type: "string", enum: VALID_VENDOR_REGIONS, nullable: true },
            modelProvider: { type: "string", maxLength: 128, nullable: true },
            deploymentContext: { type: "string", enum: VALID_DEPLOYMENT_CONTEXTS, nullable: true },
            dpaSigned: { type: "boolean", nullable: true },
          },
        },
        ClassifyResponse: {
          type: "object",
          properties: {
            systemName: { type: "string" },
            riskClass: { type: "string", enum: ["prohibited", "high", "limited", "minimal", "unknown"] },
            aiActArticle: { type: "string" },
            aiActReason: { type: "string" },
            aiActDeadline: { type: "string", nullable: true },
            aiActRole: { type: "string" },
            obligations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  article: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
            nextActions: { type: "array", items: { type: "string" } },
            apiVersion: { type: "string", enum: ["v1"] },
            classifiedAtISO: { type: "string", format: "date-time" },
          },
        },
        GateResponse: {
          type: "object",
          properties: {
            verdict: { type: "string", enum: ["pass", "review_required", "blocked"] },
            riskClass: { type: "string" },
            aiActRole: { type: "string" },
            reasons: { type: "array", items: { $ref: "#/components/schemas/GateReason" } },
            obligations: { type: "array", items: { $ref: "#/components/schemas/GateObligation" } },
            missingEvidence: { type: "array", items: { type: "string" } },
            nextActions: { type: "array", items: { type: "string" } },
            auditPackHints: { type: "array", items: { type: "string" } },
            apiVersion: { type: "string", enum: ["v1"] },
            classifiedAtISO: { type: "string", format: "date-time" },
          },
        },
        GateReason: {
          type: "object",
          properties: {
            category: { type: "string" },
            articleRef: { type: "string" },
            severity: { type: "string", enum: ["info", "warning", "error"] },
            message: { type: "string" },
            nextAction: { type: "string" },
          },
        },
        GateObligation: {
          type: "object",
          properties: {
            article: { type: "string" },
            description: { type: "string" },
            status: { type: "string", enum: ["met", "missing", "not_applicable"] },
          },
        },
        DeploymentInput: {
          allOf: [
            { $ref: "#/components/schemas/ClassifyInput" },
            {
              type: "object",
              required: ["deploymentRef"],
              properties: {
                deploymentRef: { type: "string", maxLength: 128 },
              },
            },
          ],
        },
        DeploymentResponse: {
          type: "object",
          properties: {
            deploymentRef: { type: "string" },
            systemName: { type: "string" },
            gate: { $ref: "#/components/schemas/GateResponse" },
            findingEmitted: { type: "boolean" },
            apiVersion: { type: "string", enum: ["v1"] },
            loggedAtISO: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string" },
            apiVersion: { type: "string", enum: ["v1"] },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/v1/health": {
        get: {
          tags: ["meta"],
          summary: "Service health check",
          security: [],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      version: { type: "string" },
                      docsUrl: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/openapi": {
        get: {
          tags: ["meta"],
          summary: "OpenAPI 3.1 spec",
          security: [],
          responses: { "200": { description: "OpenAPI JSON" } },
        },
      },
      "/api/v1/classify": {
        post: {
          tags: ["classify"],
          summary: "Classify an AI system against EU AI Act + GDPR.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ClassifyInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Classification + obligations",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ClassifyResponse" },
                },
              },
            },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "429": { description: "Rate-limited" },
          },
        },
      },
      "/api/v1/gate": {
        post: {
          tags: ["gate"],
          summary: "Compliance Gate verdict (pass / review_required / blocked).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ClassifyInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Gate response",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/GateResponse" },
                },
              },
            },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
            "429": { description: "Rate-limited" },
          },
        },
      },
      "/api/v1/deployment": {
        post: {
          tags: ["deployment"],
          summary: "Register a deployment + emit findings on review/blocked.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeploymentInput" },
              },
            },
          },
          responses: {
            "200": {
              description: "Deployment registered",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/DeploymentResponse" },
                },
              },
            },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
            "429": { description: "Rate-limited" },
          },
        },
      },
      "/api/v1/keys": {
        get: {
          tags: ["keys"],
          summary: "List API keys for the current org (session auth only).",
          responses: { "200": { description: "Array of keys (no full tokens)" } },
        },
        post: {
          tags: ["keys"],
          summary: "Create a new API key. Returns the full token ONCE.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["label", "scopes"],
                  properties: {
                    label: { type: "string" },
                    scopes: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: ["classify", "gate", "deployment", "read_state"],
                      },
                    },
                    expiresAtISO: { type: "string", format: "date-time", nullable: true },
                    notes: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Created — full token in response, never shown again" },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized (session required)" },
          },
        },
      },
      "/api/v1/keys/{id}": {
        delete: {
          tags: ["keys"],
          summary: "Revoke an API key.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Revoked" },
            "401": { description: "Unauthorized (session required)" },
            "404": { description: "Not found" },
          },
        },
      },
    },
  } as const

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  })
}
