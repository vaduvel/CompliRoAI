/**
 * Sprint 010 — Vendor library catalog + prefill API.
 *
 * GET /api/vendor-review/library
 *   ?q=string (optional)  - search/filter library
 *   ?prefill=string       - returneaza prefill complet (draft + linkage)
 *
 * Cand prefill e prezent, returneaza un draft VendorRecord pre-completat
 * plus linkage automat la AI inventory + AI data map.
 */
import { NextResponse } from "next/server"

import { getOrgContext } from "@/lib/server/org-context"
import { readState } from "@/lib/server/store"
import {
  listVendorCategories,
  listVendorLibrary,
  searchVendorLibrary,
} from "@/lib/compliance/vendor-library"
import { prefillVendorFromLibrary } from "@/lib/compliance/vendor-prefill"
import type { AIDataMapRecord, AISystemRecord } from "@/lib/compliance/types"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const q = url.searchParams.get("q") ?? ""
    const prefill = url.searchParams.get("prefill")

    // Mode prefill: returneaza draft cu linkage automat
    if (prefill) {
      const ctx = await getOrgContext()
      const state = await readState()
      const result = prefillVendorFromLibrary({
        query: prefill,
        aiSystems: (state.aiSystems ?? []) as AISystemRecord[],
        aiDataMapRecords: (state.aiDataMapRecords ?? []) as AIDataMapRecord[],
      })
      return NextResponse.json({
        ...result,
        orgName: ctx.orgName,
      })
    }

    // Mode list: returneaza catalog complet (sau filtrat)
    const list = q ? searchVendorLibrary(q, 100) : listVendorLibrary()
    return NextResponse.json({
      total: listVendorLibrary().length,
      categories: listVendorCategories(),
      vendors: list,
    })
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi library-ul de vendori." },
      { status: 500 },
    )
  }
}
