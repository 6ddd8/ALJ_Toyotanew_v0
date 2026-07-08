// Dynamic data row - supports any JSON structure
export interface DataRow {
  id: string
  createTime: string
  rawData: Record<string, unknown>
  historyDialogue: string
  // Recording download info parsed from the answer's "audio" field (optional)
  audioUrl?: string
  audioFileName?: string
}

export interface ApiConfig {
  robotKey: string
  robotToken: string
  startTime: string
  endTime: string
}

function getNowString(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export const DEFAULT_CONFIG: ApiConfig = {
  robotKey: "ld5DUU9nIHm3mQXKcXMqoEgdi2Q%3D",
  robotToken: "MTc3NzI4MDA4ODk1MQp4a2l6UVlYY1BzMENrTEF3alhINFgraGN0YU09",
  startTime: "2026-07-07 00:00:00",
  endTime: getNowString(),
}

export const DEFAULT_USERNAME = "william.pang@dyna.ai"
