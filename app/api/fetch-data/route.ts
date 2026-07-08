import { NextRequest, NextResponse } from "next/server"

interface SegmentItem {
  segment_code: string
  message_source: string
  create_time: string
}

interface DetailItem {
  question: string
  answer: string
  create_time: string
  message_source: string
}

export interface DataRow {
  id: string
  createTime: string
  rawData: Record<string, unknown>
  historyDialogue: string
}

// Parse the "question" field (a JSON string) and extract historyDialogue text.
// Falls back to regex extraction when the JSON is truncated/incomplete.
function parseHistoryDialogue(question: string): string {
  if (!question || typeof question !== "string") return ""

  // 1) Try strict JSON parse first (clean, complete payloads)
  try {
    const parsed = JSON.parse(question)
    if (parsed && typeof parsed === "object" && typeof parsed.historyDialogue === "string") {
      return decodeDialogue(parsed.historyDialogue)
    }
  } catch {
    // Ignore and fall through to manual extraction
  }

  // 2) Fallback: manually locate "historyDialogue" and read until the value ends.
  // Handles truncated JSON where the closing quote/brace is missing.
  const keyMatch = question.match(/"historyDialogue"\s*:\s*"/)
  if (keyMatch && keyMatch.index !== undefined) {
    const valueStart = keyMatch.index + keyMatch[0].length
    let end = valueStart
    // Walk forward until we hit an unescaped closing double quote, or the end of string
    while (end < question.length) {
      if (question[end] === '"' && question[end - 1] !== "\\") {
        break
      }
      end++
    }
    const rawValue = question.slice(valueStart, end)
    return decodeDialogue(rawValue)
  }

  return ""
}

// Convert escaped sequences (\n, \r, \t, \", \\) into their real characters
function decodeDialogue(value: string): string {
  return value
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim()
}

// Escape raw control characters (newlines, tabs, etc.) that appear *inside*
// JSON string literals. The Dyna.AI "answer" payload sometimes embeds literal
// line breaks inside values (e.g. a multi-line WillingToPay analysis), which
// makes JSON.parse throw "Invalid control character". We walk the string and
// only escape control chars that occur while we are inside a quoted string,
// leaving structural whitespace between tokens untouched.
function sanitizeJsonControlChars(input: string): string {
  let result = ""
  let inString = false
  let escaped = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const code = input.charCodeAt(i)

    if (escaped) {
      result += char
      escaped = false
      continue
    }

    if (char === "\\") {
      result += char
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      result += char
      continue
    }

    // Escape raw control characters only when inside a string literal
    if (inString && code <= 0x1f) {
      if (char === "\n") result += "\\n"
      else if (char === "\r") result += "\\r"
      else if (char === "\t") result += "\\t"
      else result += "\\u" + code.toString(16).padStart(4, "0")
      continue
    }

    result += char
  }

  return result
}

// The known string fields contained in the Dyna.AI "answer" payload.
const KNOWN_ANSWER_FIELDS = [
  "phoneNumber",
  "vehicleWeb",
  "gradeWeb",
  "paymentTypeWeb",
  "callAnswered",
  "ifGuestBusySuitableCallbackTime",
  "modelSelection",
  "gradeSelection",
  "colorPreference",
  "purchaseType",
  "budgetIfCash",
  "financialEntityIfFinance",
  "purchaseTimeline",
  "confirmToCreateOrder",
  "accessories",
  "postCallLeadClassification",
  "followUpRequired",
  "summaryContent",
  "historyDialogue",
  "audio",
]

// Extract the recording URL and file name from the answer's "audio" field.
// The audio value is a string containing Python-style dict syntax (single
// quotes), e.g. "[{'file_name': 'x.mp3', 'file_url': 'https://...'}]".
// We use regex so it works regardless of JSON validity or quote style.
function parseAudioInfo(audio: unknown): { url: string; fileName: string } | null {
  if (typeof audio !== "string" || audio.trim() === "") return null

  const urlMatch = audio.match(/['"]file_url['"]\s*:\s*['"]([^'"]+)['"]/)
  if (!urlMatch || !urlMatch[1]) return null

  const nameMatch = audio.match(/['"]file_name['"]\s*:\s*['"]([^'"]+)['"]/)
  const fileName = nameMatch && nameMatch[1] ? nameMatch[1] : "recording.mp3"

  return { url: urlMatch[1], fileName }
}

// Lenient extractor used as a last resort when strict JSON.parse fails.
// Some answers contain UNESCAPED double quotes inside string values
// (e.g. ... "سمة" ...), which breaks any JSON parser. For each known field
// we locate `"key":"` and then read forward until we find the value's real
// closing quote: an unescaped `"` that is immediately followed (ignoring
// whitespace) by a `,` or `}`. Inner unescaped quotes are tolerated because
// they are not followed by those structural characters.
function extractFieldsLeniently(input: string): Record<string, unknown> | null {
  const result: Record<string, unknown> = {}
  let foundAny = false

  for (const key of KNOWN_ANSWER_FIELDS) {
    const keyPattern = new RegExp(`"${key}"\\s*:\\s*"`)
    const match = input.match(keyPattern)
    if (!match || match.index === undefined) continue

    const valueStart = match.index + match[0].length
    let i = valueStart
    let value = ""

    while (i < input.length) {
      const char = input[i]

      // Preserve escape sequences verbatim so decodeDialogue can handle them
      if (char === "\\" && i + 1 < input.length) {
        value += char + input[i + 1]
        i += 2
        continue
      }

      if (char === '"') {
        // Look ahead past whitespace to decide if this quote closes the value
        let j = i + 1
        while (j < input.length && /\s/.test(input[j])) j++
        const next = input[j]
        if (next === "," || next === "}" || next === undefined) {
          break // real closing quote
        }
        // Otherwise it's an inner unescaped quote: keep it as part of the value
        value += char
        i++
        continue
      }

      value += char
      i++
    }

    result[key] = decodeDialogue(value)
    foundAny = true
  }

  return foundAny ? result : null
}

function parseAnswer(answer: string): Record<string, unknown> | null {
  try {
    // First attempt: try parsing the sanitized payload directly
    let parsed = JSON.parse(sanitizeJsonControlChars(answer))

    // If it's an array, get the first element (e.g., ["{ ... }"])
    if (Array.isArray(parsed) && parsed.length > 0) {
      parsed = parsed[0]
    }

    // If the result is still a string, it may be double-encoded JSON
    // e.g., "{\"phoneNumber\":\"123\"}" or with escaped newlines
    if (typeof parsed === "string") {
      parsed = JSON.parse(sanitizeJsonControlChars(parsed))
    }

    // Final check: ensure it's a valid object
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // Strict parsing failed (often due to unescaped quotes inside values).
    // Fall through to the lenient field-by-field extractor below.
  }

  // Fallback: tolerant extraction of the known fields. This also handles the
  // double-encoded case where the payload is wrapped in array/string syntax.
  return extractFieldsLeniently(answer)
}

interface FetchOptions {
  robotKey: string
  robotToken: string
  username: string
  page: number
  pagesize: number
  startTime?: string
  endTime?: string
  // Prefix to keep row ids unique across the two data sources
  idPrefix: string
}

// Fetch a set of records via API 1 (segment list) + API 2 (segment detail)
// for a given key/token (and optional time range). Returns parsed DataRows.
async function fetchRecords(options: FetchOptions): Promise<DataRow[]> {
  const { robotKey, robotToken, username, page, pagesize, startTime, endTime, idPrefix } = options

  const headers = {
    "Content-Type": "application/json",
    "cybertron-robot-key": robotKey,
    "cybertron-robot-token": robotToken,
  }

  // API 1: Get segment list
  const api1Body = {
    username,
    filter_mode: 0,
    filter_user_code: "",
    create_start_time: startTime || "",
    create_end_time: endTime || "",
    page,
    pagesize,
  }
  console.log("[v0] API 1 URL:", "https://agents.dyna.ai/openapi/v1/conversation/segment/get_list/")
  console.log("[v0] API 1 Headers:", { "cybertron-robot-key": robotKey, "cybertron-robot-token": robotToken })
  console.log("[v0] API 1 Body:", JSON.stringify(api1Body, null, 2))

  const segmentListResponse = await fetch(
    "https://agents.dyna.ai/openapi/v1/conversation/segment/get_list/",
    {
      method: "POST",
      headers,
      body: JSON.stringify(api1Body),
    }
  )

  if (!segmentListResponse.ok) {
    throw new Error(`Failed to fetch segment list (status ${segmentListResponse.status})`)
  }

  const segmentData = await segmentListResponse.json()
  console.log("[v0] API 1 Response:", JSON.stringify(segmentData, null, 2))

  if (segmentData.code !== "000000") {
    throw new Error(segmentData.message || "API 1 returned an error")
  }

  const segments: SegmentItem[] = segmentData.data?.list || []

  // Filter only openapi-ws segments
  const openapiWsSegments = segments.filter(
    (seg) => seg.message_source === "openapi-ws"
  )

  // API 2: Get details for each segment
  const detailPromises = openapiWsSegments.map(async (segment) => {
    const api2Body = {
      username,
      segment_code: segment.segment_code,
      page: 1,
      pagesize: 100,
    }
    console.log("[v0] API 2 URL:", "https://agents.dyna.ai/openapi/v1/conversation/segment/detail_list/")
    console.log("[v0] API 2 Body:", JSON.stringify(api2Body, null, 2))

    const detailResponse = await fetch(
      "https://agents.dyna.ai/openapi/v1/conversation/segment/detail_list/",
      {
        method: "POST",
        headers,
        body: JSON.stringify(api2Body),
      }
    )

    if (!detailResponse.ok) {
      return []
    }

    const detailData = await detailResponse.json()
    console.log("[v0] API 2 Response (segment:", segment.segment_code, "):", JSON.stringify(detailData, null, 2))

    if (detailData.code !== "000000") {
      return []
    }

    const details: DetailItem[] = detailData.data?.list || []

    // Filter only openapi-ws messages with valid JSON answers
    return details
      .filter((detail) => detail.message_source === "openapi-ws")
      .map((detail, index) => {
        const parsed = parseAnswer(detail.answer)

        // Skip rows where answer is not valid JSON
        if (!parsed) {
          return null
        }

        // Prefer historyDialogue from the parsed answer; fall back to question.
        const answerDialogue =
          typeof parsed.historyDialogue === "string"
            ? decodeDialogue(parsed.historyDialogue)
            : ""

        // Parse the optional recording info from the "audio" field
        const audioInfo = parseAudioInfo(parsed.audio)

        const row: DataRow = {
          id: `${idPrefix}-${segment.segment_code}-${index}`,
          createTime: detail.create_time,
          rawData: parsed,
          historyDialogue: answerDialogue || parseHistoryDialogue(detail.question),
          audioUrl: audioInfo?.url,
          audioFileName: audioInfo?.fileName,
        }

        return row
      })
      .filter((row): row is DataRow => row !== null)
  })

  const allDetails = await Promise.all(detailPromises)
  return allDetails.flat()
}

export async function POST(request: NextRequest) {
  try {
    const { robotKey, robotToken, username, page = 1, pagesize = 100, startTime, endTime } = await request.json()

    const effectiveUsername = username || "rena.lee@dyna.ai"

    if (!robotKey || !robotToken) {
      return NextResponse.json(
        { error: "Robot Key and Robot Token are required." },
        { status: 400 }
      )
    }

    // Fetch records using the user-configured credentials and time range
    const configuredRecords = await fetchRecords({
      robotKey,
      robotToken,
      username: effectiveUsername,
      page,
      pagesize,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      idPrefix: "config",
    }).catch((err) => {
      console.error("Error fetching configured records:", err)
      return [] as DataRow[]
    })

    // Deduplicate by record content (phone + time + dialogue)
    const merged = [...configuredRecords]
    const seen = new Set<string>()
    const deduped: DataRow[] = []
    for (const row of merged) {
      const phone = (row.rawData as Record<string, unknown>).phoneNumber ?? ""
      const dedupeKey = `${phone}|${row.createTime}|${row.historyDialogue.slice(0, 50)}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      deduped.push(row)
    }

    // Sort by create_time descending (newest first)
    deduped.sort((a, b) => {
      return new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    })

    return NextResponse.json({
      success: true,
      data: deduped,
      total: deduped.length,
    })
  } catch (error) {
    console.error("Error fetching data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
