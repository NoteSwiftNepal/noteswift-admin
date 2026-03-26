"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SystemMaintenanceSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("System is under maintenance. Please check back later.");
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [logRetention, setLogRetention] = useState("90");
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheExpiry, setCacheExpiry] = useState("3600");
  const [errorReporting, setErrorReporting] = useState(true);
  const [performanceMonitoring, setPerformanceMonitoring] = useState(true);

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving system maintenance settings...");
  };

  const handleBackupNow = () => {
    // TODO: Implement immediate backup
    console.log("Starting backup...");
  };

  const handleClearCache = () => {
    // TODO: Implement cache clearing
    console.log("Clearing cache...");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label>Maintenance Mode</Label>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Enable Maintenance Mode</Label>
            <p className="text-sm text-muted-foreground">
              Put the platform in maintenance mode
            </p>
          </div>
          <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
        </div>

        {maintenanceMode && (
          <div>
            <Label>Maintenance Message</Label>
            <Input
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label>Backup & Recovery</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Backup Frequency</Label>
            <Select value={backupFrequency} onValueChange={setBackupFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Log Retention (days)</Label>
            <Input
              type="number"
              value={logRetention}
              onChange={(e) => setLogRetention(e.target.value)}
            />
          </div>
        </div>

        <Button onClick={handleBackupNow} variant="outline">
          Backup Now
        </Button>
      </div>

      <div className="space-y-4">
        <Label>Performance & Caching</Label>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Enable Caching</Label>
            <p className="text-sm text-muted-foreground">
              Cache frequently accessed data for better performance
            </p>
          </div>
          <Switch checked={cacheEnabled} onCheckedChange={setCacheEnabled} />
        </div>

        {cacheEnabled && (
          <div>
            <Label>Cache Expiry (seconds)</Label>
            <Input
              type="number"
              value={cacheExpiry}
              onChange={(e) => setCacheExpiry(e.target.value)}
            />
          </div>
        )}

        <Button onClick={handleClearCache} variant="outline">
          Clear Cache
        </Button>
      </div>

      <div className="space-y-4">
        <Label>Monitoring & Reporting</Label>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Error Reporting</Label>
            <p className="text-sm text-muted-foreground">
              Report system errors for debugging
            </p>
          </div>
          <Switch checked={errorReporting} onCheckedChange={setErrorReporting} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Performance Monitoring</Label>
            <p className="text-sm text-muted-foreground">
              Monitor system performance and metrics
            </p>
          </div>
          <Switch checked={performanceMonitoring} onCheckedChange={setPerformanceMonitoring} />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save System Maintenance Settings
      </Button>
    </div>
  );
}