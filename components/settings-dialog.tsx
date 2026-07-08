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

  const handleSave = () => {
    onSave(localConfig)
    setOpen(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setLocalConfig(config)
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
            <Field>
              <FieldLabel className="text-sm font-medium text-foreground">Robot Key</FieldLabel>
              <Input
                value={localConfig.robotKey}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, robotKey: e.target.value })
                }
                placeholder="Enter cybertron-robot-key"
                className="mt-1.5 border-border/50 bg-secondary/50 focus:border-primary focus:ring-primary"
              />
            </Field>
            <Field>
              <FieldLabel className="text-sm font-medium text-foreground">Robot Token</FieldLabel>
              <Input
                value={localConfig.robotToken}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, robotToken: e.target.value })
                }
                placeholder="Enter cybertron-robot-token"
                className="mt-1.5 border-border/50 bg-secondary/50 focus:border-primary focus:ring-primary"
              />
            </Field>
          </FieldGroup>

          {/* Time Range Section */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Time Range</span>
              <span className="text-xs text-muted-foreground">Optional — leave blank to fetch all data</span>
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
