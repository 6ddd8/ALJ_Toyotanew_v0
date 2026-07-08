"use client"

import { useState } from "react"
import { Settings, Key, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import type { ApiConfig } from "@/lib/types"

interface SettingsDialogProps {
  config: ApiConfig
  onSave: (config: ApiConfig) => void
}

export function SettingsDialog({ config, onSave }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [localConfig, setLocalConfig] = useState<ApiConfig>(config)
  const [errors, setErrors] = useState<{ robotKey?: boolean; robotToken?: boolean }>({})

  const handleSave = () => {
    const newErrors: { robotKey?: boolean; robotToken?: boolean } = {}
    if (!localConfig.robotKey.trim()) newErrors.robotKey = true
    if (!localConfig.robotToken.trim()) newErrors.robotToken = true
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    onSave(localConfig)
    setOpen(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setLocalConfig(config)
      setErrors({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="border-border/50 bg-secondary/50 hover:bg-secondary">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/50 bg-card sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">API Configuration</DialogTitle>
              <DialogDescription className="text-sm">
                Configure the API credentials for data fetching
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-4">
          <FieldGroup>
            <Field data-invalid={errors.robotKey || undefined}>
              <FieldLabel className="text-sm font-medium text-foreground">
                Robot Key <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                value={localConfig.robotKey}
                onChange={(e) => {
                  setLocalConfig({ ...localConfig, robotKey: e.target.value })
                  if (errors.robotKey) setErrors((prev) => ({ ...prev, robotKey: false }))
                }}
                placeholder="Enter Robot Key"
                aria-invalid={errors.robotKey || undefined}
                className={`mt-1.5 bg-secondary/50 focus:border-primary focus:ring-primary ${
                  errors.robotKey
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border/50"
                }`}
              />
              {errors.robotKey && (
                <p className="mt-1 text-xs text-destructive">Robot Key is required</p>
              )}
            </Field>
            <Field data-invalid={errors.robotToken || undefined}>
              <FieldLabel className="text-sm font-medium text-foreground">
                Robot Token <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                value={localConfig.robotToken}
                onChange={(e) => {
                  setLocalConfig({ ...localConfig, robotToken: e.target.value })
                  if (errors.robotToken) setErrors((prev) => ({ ...prev, robotToken: false }))
                }}
                placeholder="Enter Robot Token"
                aria-invalid={errors.robotToken || undefined}
                className={`mt-1.5 bg-secondary/50 focus:border-primary focus:ring-primary ${
                  errors.robotToken
                    ? "border-destructive ring-1 ring-destructive"
                    : "border-border/50"
                }`}
              />
              {errors.robotToken && (
                <p className="mt-1 text-xs text-destructive">Robot Token is required</p>
              )}
            </Field>
          </FieldGroup>

          {/* Time Range Section */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Time Range</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel className="text-xs font-medium text-muted-foreground">Start Time</FieldLabel>
                <DateTimePicker
                  value={localConfig.startTime}
                  onChange={(val) => setLocalConfig({ ...localConfig, startTime: val })}
                  placeholder="Select start time"
                />
              </Field>
              <Field>
                <FieldLabel className="text-xs font-medium text-muted-foreground">End Time</FieldLabel>
                <DateTimePicker
                  value={localConfig.endTime}
                  onChange={(val) => setLocalConfig({ ...localConfig, endTime: val })}
                  placeholder="Select end time"
                />
              </Field>
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
