import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sprint 014 — pdfkit livrează fișiere binare (AFM/TTF) la runtime via
  // fs.readFileSync; Next.js trebuie să le tracească pentru serverless bundle.
  outputFileTracingIncludes: {
    "/api/exports/audit-pack/pdf": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/exports/readiness-pack/pdf": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/dpia/**": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/ropa/**": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/breach/**": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/vendor-review/**": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/ai-data-discovery/**": ["./node_modules/pdfkit/js/data/**/*"],
  },
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
