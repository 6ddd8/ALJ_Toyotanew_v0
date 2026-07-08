"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start gap-2 border-border/50 bg-secondary/50 text-left font-normal hover:bg-secondary",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon data-icon="inline-start" />
          {displayValue ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
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
              format={(n) => pad(n)}
            />
            <TimeColumn
              label="Min"
              count={60}
              selected={currentMinute}
              onSelect={handleMinute}
              format={(n) => pad(n)}
            />
            <TimeColumn
              label="Sec"
              count={60}
              selected={currentSecond}
              onSelect={handleSecond}
              format={(n) => pad(n)}
            />
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {displayValue ?? "No date selected"}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => {
              onChange?.("")
              setOpen(false)
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface TimeColumnProps {
  label: string
  count: number
  selected: number
  onSelect: (n: number) => void
  format: (n: number) => string
}

function TimeColumn({
  label,
  count,
  selected,
  onSelect,
  format,
}: TimeColumnProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Scroll selected item into view when the column mounts or selected changes
  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const item = el.querySelector<HTMLElement>(`[data-value="${selected}"]`)
    if (item) {
      item.scrollIntoView({ block: "center" })
    }
  }, [selected, scrollRef])

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
              {format(i)}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
