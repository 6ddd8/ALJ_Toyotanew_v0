"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DateTimePickerProps {
  value?: string // "YYYY-MM-DD HH:mm:ss"
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  disabled,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close when clicking outside this component
  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Parse the current value into a Date
  const parsed = value
    ? parse(value, "yyyy-MM-dd HH:mm:ss", new Date())
    : undefined
  const selected = parsed && isValid(parsed) ? parsed : undefined

  const currentHour = selected ? selected.getHours() : 0
  const currentMinute = selected ? selected.getMinutes() : 0
  const currentSecond = selected ? selected.getSeconds() : 0

  function emitChange(date: Date, h: number, m: number, s: number) {
    const d = new Date(date)
    d.setHours(h, m, s, 0)
    onChange?.(format(d, "yyyy-MM-dd HH:mm:ss"))
  }

  function handleDaySelect(day: Date | undefined) {
    if (!day) return
    emitChange(day, currentHour, currentMinute, currentSecond)
  }

  function handleHour(h: number) {
    const base = selected ?? new Date()
    emitChange(base, h, currentMinute, currentSecond)
  }

  function handleMinute(m: number) {
    const base = selected ?? new Date()
    emitChange(base, currentHour, m, currentSecond)
  }

  function handleSecond(s: number) {
    const base = selected ?? new Date()
    emitChange(base, currentHour, currentMinute, s)
  }

  const displayValue = selected
    ? format(selected, "yyyy-MM-dd HH:mm:ss")
    : undefined

  return (
    // Relative container — the dropdown panel is absolutely positioned inside this
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger button */}
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full justify-start gap-2 border-border/50 bg-secondary/50 text-left font-normal hover:bg-secondary",
          !displayValue && "text-muted-foreground"
        )}
      >
        <CalendarIcon data-icon="inline-start" />
        {displayValue ?? placeholder}
      </Button>

      {/* Inline dropdown — no Portal, stays inside Dialog DOM tree */}
      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-[200] mt-1 w-auto rounded-md border bg-popover",
            "text-popover-foreground shadow-lg"
          )}
          // Prevent clicks inside the panel from bubbling up to the Dialog
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex">
            {/* Calendar */}
            <Calendar
              mode="single"
              selected={selected}
              onSelect={handleDaySelect}
              initialFocus
            />

            {/* Time columns */}
            <div className="flex border-l border-border/50">
              <TimeColumn
                label="Hr"
                count={24}
                selected={currentHour}
                onSelect={handleHour}
              />
              <TimeColumn
                label="Min"
                count={60}
                selected={currentMinute}
                onSelect={handleMinute}
              />
              <TimeColumn
                label="Sec"
                count={60}
                selected={currentSecond}
                onSelect={handleSecond}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {displayValue ?? "No date selected"}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => {
                  onChange?.("")
                  setOpen(false)
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                type="button"
                className="h-7 text-xs"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TimeColumnProps {
  label: string
  count: number
  selected: number
  onSelect: (n: number) => void
}

function TimeColumn({ label, count, selected, onSelect }: TimeColumnProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Scroll selected item into view on mount and when selection changes
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const item = el.querySelector<HTMLElement>(`[data-value="${selected}"]`)
    if (item) {
      item.scrollIntoView({ block: "center" })
    }
  }, [selected])

  return (
    <div className="flex w-12 flex-col">
      <div className="sticky top-0 z-10 bg-popover py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <ScrollArea className="h-[240px]">
        <div ref={scrollRef} className="flex flex-col py-1">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              data-value={i}
              type="button"
              onClick={() => onSelect(i)}
              className={cn(
                "mx-1 rounded px-1 py-1 text-center text-sm transition-colors",
                i === selected
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {pad(i)}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
