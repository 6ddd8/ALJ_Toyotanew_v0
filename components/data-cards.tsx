"use client"

import { useState, useMemo, useCallback, useEffect } from "react"

import {
  Search, Calendar, X, Download, Phone,
  Headphones, Car, CreditCard, Clock,
  ShoppingCart, Palette, TrendingUp, CheckCircle, FileText, Tag, Star,
  ChevronLeft, ChevronRight
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import * as XLSX from "xlsx"
import type { DataRow } from "@/lib/types"


interface DataCardsProps {
  data: DataRow[]
  apiTotal?: number
}

interface AnswerData {
  phoneNumber: string
  vehicleWeb: string
  gradeWeb: string
  paymentTypeWeb: string
  callAnswered: string
  ifGuestBusySuitableCallbackTime: string
  modelSelection: string
  gradeSelection: { value: string; note: string }
  colorPreference: { first: string; second: string; third: string }
  purchaseType: { value: string; note: string }
  budgetIfCash: string
  financialEntityIfFinance: string
  purchaseTimeline: string
  confirmToCreateOrder: string
  accessories: string[]
  postCallLeadClassification: string
  followUpRequired: string
  summaryContent: string
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "-"
  if (typeof val === "string") return val.trim() || "-"
  return String(val)
}

function extractAnswerData(rawData: Record<string, unknown>): AnswerData {
  const raw = rawData as Record<string, unknown>

  // gradeSelection
  let gradeSelection = { value: "-", note: "-" }
  if (raw.gradeSelection && typeof raw.gradeSelection === "object" && !Array.isArray(raw.gradeSelection)) {
    const gs = raw.gradeSelection as Record<string, unknown>
    gradeSelection = { value: str(gs.value), note: str(gs.note) }
  } else if (typeof raw.gradeSelection === "string") {
    gradeSelection = { value: raw.gradeSelection || "-", note: "-" }
  }

  // colorPreference
  let colorPreference = { first: "-", second: "-", third: "-" }
  if (raw.colorPreference && typeof raw.colorPreference === "object" && !Array.isArray(raw.colorPreference)) {
    const cp = raw.colorPreference as Record<string, unknown>
    colorPreference = { first: str(cp.first), second: str(cp.second), third: str(cp.third) }
  }

  // purchaseType
  let purchaseType = { value: "-", note: "-" }
  if (raw.purchaseType && typeof raw.purchaseType === "object" && !Array.isArray(raw.purchaseType)) {
    const pt = raw.purchaseType as Record<string, unknown>
    purchaseType = { value: str(pt.value), note: str(pt.note) }
  } else if (typeof raw.purchaseType === "string") {
    purchaseType = { value: raw.purchaseType || "-", note: "-" }
  }

  // accessories
  let accessories: string[] = []
  if (Array.isArray(raw.accessories)) {
    accessories = (raw.accessories as unknown[]).map((a) => str(a)).filter((a) => a !== "-")
  } else if (typeof raw.accessories === "string" && raw.accessories.trim()) {
    accessories = [raw.accessories]
  }

  return {
    phoneNumber: str(raw.phoneNumber),
    vehicleWeb: str(raw.vehicleWeb),
    gradeWeb: str(raw.gradeWeb),
    paymentTypeWeb: str(raw.paymentTypeWeb),
    callAnswered: str(raw.callAnswered),
    ifGuestBusySuitableCallbackTime: str(raw.ifGuestBusySuitableCallbackTime),
    modelSelection: str(raw.modelSelection),
    gradeSelection,
    colorPreference,
    purchaseType,
    budgetIfCash: str(raw.budgetIfCash),
    financialEntityIfFinance: str(raw.financialEntityIfFinance),
    purchaseTimeline: str(raw.purchaseTimeline),
    confirmToCreateOrder: str(raw.confirmToCreateOrder),
    accessories,
    postCallLeadClassification: str(raw.postCallLeadClassification),
    followUpRequired: str(raw.followUpRequired),
    summaryContent: str(raw.summaryContent),
  }
}

function getBadgeStyle(value: string) {
  const v = value.toLowerCase()
  if (["yes", "y", "نعم"].includes(v)) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
  if (["no", "n", "لا"].includes(v)) return "bg-rose-500/10 text-rose-400 border-rose-500/30"
  return "bg-amber-500/10 text-amber-400 border-amber-500/30"
}

async function downloadRecording(row: DataRow) {
  if (!row.audioUrl) return
  const fileName = row.audioFileName || "recording.mp3"
  const params = new URLSearchParams({ url: row.audioUrl, fileName })
  try {
    const response = await fetch(`/api/download-audio?${params.toString()}`)
    if (!response.ok) throw new Error(`Download failed with status ${response.status}`)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = blobUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error("[v0] Recording download error:", error)
    alert("Failed to download the recording. Please try again.")
  }
}

function flattenForExcel(row: DataRow): Record<string, string> {
  const a = extractAnswerData(row.rawData)
  return {
    "Created Time": row.createTime,
    "Phone Number": a.phoneNumber,
    "Vehicle Web": a.vehicleWeb,
    "Grade Web": a.gradeWeb,
    "Payment Type Web": a.paymentTypeWeb,
    "Call Answered": a.callAnswered,
    "If Guest Busy Suitable Callback Time": a.ifGuestBusySuitableCallbackTime,
    "Model Selection": a.modelSelection,
    "Grade Selection Value": a.gradeSelection.value,
    "Grade Selection Note": a.gradeSelection.note,
    "Color Preference 1st": a.colorPreference.first,
    "Color Preference 2nd": a.colorPreference.second,
    "Color Preference 3rd": a.colorPreference.third,
    "Purchase Type Value": a.purchaseType.value,
    "Purchase Type Note": a.purchaseType.note,
    "Budget If Cash": a.budgetIfCash,
    "Financial Entity If Finance": a.financialEntityIfFinance,
    "Purchase Timeline": a.purchaseTimeline,
    "Confirm To Create Order": a.confirmToCreateOrder,
    "Accessories": a.accessories.join(", "),
    "Post Call Lead Classification": a.postCallLeadClassification,
    "Follow-up Required": a.followUpRequired,
    "Summary Content": a.summaryContent,
  }
}

function downloadSingleCard(row: DataRow) {
  const flat = flattenForExcel(row)
  const sheetData = [Object.keys(flat), Object.values(flat)]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  XLSX.utils.book_append_sheet(wb, ws, "Record")
  const filename = flat["Phone Number"] !== "-"
    ? `record_${flat["Phone Number"]}.xlsx`
    : `record_${row.id}.xlsx`
  XLSX.writeFile(wb, filename)
}

function downloadAllCards(data: DataRow[]) {
  if (data.length === 0) return
  const rows = data.map(flattenForExcel)
  const headers = Object.keys(rows[0])
  const sheetData = [headers, ...rows.map((r) => Object.values(r))]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  XLSX.utils.book_append_sheet(wb, ws, "All Records")
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`
  XLSX.writeFile(wb, `all_records_${dateStr}.xlsx`)
}

// Reusable field row component
function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  )
}

function SubField({ label, value }: { label: string; value: string }) {
  return (
    <div className="ml-5 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

const PAGE_SIZE = 4

export function DataCards({ data, apiTotal }: DataCardsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data
    const query = searchQuery.toLowerCase()
    return data.filter((row) => {
      const a = extractAnswerData(row.rawData)
      return a.phoneNumber.toLowerCase().includes(query)
    })
  }, [data, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE))

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, data])

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredData.slice(start, start + PAGE_SIZE)
  }, [filteredData, currentPage])

  const handleDownloadAll = useCallback(() => {
    downloadAllCards(filteredData)
  }, [filteredData])

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by phone number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-secondary"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results count + download */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredData.length}</span>
          {" / "}
          <span className="font-medium text-foreground">{apiTotal ?? data.length}</span> records
        </div>
        {filteredData.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleDownloadAll} className="gap-2">
            <Download className="h-4 w-4" />
            Download All
          </Button>
        )}
      </div>

      {/* Cards Grid */}
      {filteredData.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          No matching records found
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pagedData.map((row) => {
            const a = extractAnswerData(row.rawData)

            return (
              <Card key={row.id} className="relative border-border/50 bg-card transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{row.createTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {row.audioUrl && (
                        <button
                          onClick={() => downloadRecording(row)}
                          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="Download recording"
                          aria-label="Download recording"
                        >
                          <Headphones className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => downloadSingleCard(row)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        title="Download this record"
                        aria-label="Download this record"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="grid gap-3">

                    {/* Phone Number */}
                    <FieldRow icon={Phone} label="Phone Number">
                      <span className="font-mono text-sm text-foreground">{a.phoneNumber}</span>
                    </FieldRow>

                    {/* Vehicle Web */}
                    <FieldRow icon={Car} label="Vehicle Web">
                      <span className="text-sm text-foreground">{a.vehicleWeb}</span>
                    </FieldRow>

                    {/* Grade Web */}
                    <FieldRow icon={Star} label="Grade Web">
                      <span className="text-sm text-foreground">{a.gradeWeb}</span>
                    </FieldRow>

                    {/* Payment Type Web */}
                    <FieldRow icon={CreditCard} label="Payment Type Web">
                      <span className="text-sm text-foreground">{a.paymentTypeWeb}</span>
                    </FieldRow>

                    {/* Call Answered */}
                    <FieldRow icon={CheckCircle} label="Call Answered">
                      <Badge variant="outline" className={`w-fit ${getBadgeStyle(a.callAnswered)}`}>
                        {a.callAnswered}
                      </Badge>
                    </FieldRow>

                    {/* If Guest Busy */}
                    <FieldRow icon={Clock} label="If Guest Busy Suitable Callback Time">
                      <span className="text-sm text-foreground">{a.ifGuestBusySuitableCallbackTime}</span>
                    </FieldRow>

                    {/* Model Selection */}
                    <FieldRow icon={Car} label="Model Selection">
                      <span className="text-sm text-foreground">{a.modelSelection}</span>
                    </FieldRow>

                    {/* Grade Selection */}
                    <FieldRow icon={Tag} label="Grade Selection">
                      <SubField label="Value" value={a.gradeSelection.value} />
                      <SubField label="Note" value={a.gradeSelection.note} />
                    </FieldRow>

                    {/* Color Preference */}
                    <FieldRow icon={Palette} label="Color Preference">
                      <SubField label="1st" value={a.colorPreference.first} />
                      <SubField label="2nd" value={a.colorPreference.second} />
                      <SubField label="3rd" value={a.colorPreference.third} />
                    </FieldRow>

                    {/* Purchase Type */}
                    <FieldRow icon={ShoppingCart} label="Purchase Type">
                      <SubField label="Value" value={a.purchaseType.value} />
                      <SubField label="Note" value={a.purchaseType.note} />
                    </FieldRow>

                    {/* Budget If Cash */}
                    <FieldRow icon={CreditCard} label="Budget If Cash">
                      <span className="text-sm text-foreground">{a.budgetIfCash}</span>
                    </FieldRow>

                    {/* Financial Entity If Finance */}
                    <FieldRow icon={TrendingUp} label="Financial Entity If Finance">
                      <span className="text-sm text-foreground">{a.financialEntityIfFinance}</span>
                    </FieldRow>

                    {/* Purchase Timeline */}
                    <FieldRow icon={Clock} label="Purchase Timeline">
                      <span className="text-sm text-foreground">{a.purchaseTimeline}</span>
                    </FieldRow>

                    {/* Confirm To Create Order */}
                    <FieldRow icon={CheckCircle} label="Confirm To Create Order">
                      <Badge variant="outline" className={`w-fit ${getBadgeStyle(a.confirmToCreateOrder)}`}>
                        {a.confirmToCreateOrder}
                      </Badge>
                    </FieldRow>

                    {/* Accessories */}
                    <FieldRow icon={ShoppingCart} label="Accessories">
                      {a.accessories.length === 0 ? (
                        <span className="text-sm text-foreground">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {a.accessories.map((acc, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {acc}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </FieldRow>

                    {/* Post Call Lead Classification */}
                    <FieldRow icon={TrendingUp} label="Post Call Lead Classification">
                      <span className="text-sm text-foreground">{a.postCallLeadClassification}</span>
                    </FieldRow>

                    {/* Follow-up Required */}
                    <FieldRow icon={Calendar} label="Follow-up Required">
                      <Badge variant="outline" className={`w-fit ${getBadgeStyle(a.followUpRequired)}`}>
                        {a.followUpRequired}
                      </Badge>
                    </FieldRow>

                    {/* Summary Content */}
                    <FieldRow icon={FileText} label="Summary Content">
                      <p className="text-sm text-foreground leading-relaxed break-words" dir="auto">
                        {a.summaryContent}
                      </p>
                    </FieldRow>

                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              className="min-w-[36px]"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
