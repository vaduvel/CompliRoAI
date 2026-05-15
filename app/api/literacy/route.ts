import { NextResponse } from "next/server"
import { nanoid } from "nanoid"

import { readState, writeState } from "@/lib/server/store"
import type { LiteracyRecord } from "@/lib/compliance/types"

const VALID_TRAINING_TYPES: LiteracyRecord["trainingType"][] = [
  "intern",
  "extern",
  "platforma-online",
  "workshop",
]

function isValidTrainingType(value: unknown): value is LiteracyRecord["trainingType"] {
  return VALID_TRAINING_TYPES.includes(value as LiteracyRecord["trainingType"])
}

export async function GET() {
  try {
    const state = await readState()
    return NextResponse.json({ records: state.literacyRecords ?? [] })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      employeeName,
      role,
      trainingDate,
      trainingType,
      topicsCovered,
      trainerName,
      durationHours,
      attestationSigned,
      notes,
    } = body

    if (!employeeName || !trainingDate || !trainingType) {
      return NextResponse.json(
        { error: "employeeName, trainingDate și trainingType sunt obligatorii" },
        { status: 400 }
      )
    }

    if (!isValidTrainingType(trainingType)) {
      return NextResponse.json(
        {
          error: `trainingType trebuie să fie unul din: ${VALID_TRAINING_TYPES.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const record: LiteracyRecord = {
      id: nanoid(),
      employeeName,
      role: role ?? "",
      trainingDate,
      trainingType,
      topicsCovered: topicsCovered ?? [],
      trainerName: trainerName ?? "",
      durationHours: durationHours ?? 1,
      attestationSigned: !!attestationSigned,
      notes: notes ?? undefined,
      createdAtISO: new Date().toISOString(),
    }

    const state = await readState()
    if (!state.literacyRecords) state.literacyRecords = []
    state.literacyRecords.push(record)
    await writeState(state)

    return NextResponse.json({ record })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id lipsește" }, { status: 400 })

    const state = await readState()
    state.literacyRecords = (state.literacyRecords ?? []).filter((r) => r.id !== id)
    await writeState(state)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
