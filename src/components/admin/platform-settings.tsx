"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PlatformSettings() {
  const [platformName, setPlatformName] = useState("NoteSwift");
  const [platformDescription, setPlatformDescription] = useState("Educational platform for teachers and students");
  const [contactEmail, setContactEmail] = useState("admin@noteswift.com");
  const [contactPhone, setContactPhone] = useState("+91-XXXXXXXXXX");
  const [supportEmail, setSupportEmail] = useState("support@noteswift.com");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving platform settings...");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Platform Name</Label>
          <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
        </div>
        <div>
          <Label>Default Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR (₹)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Platform Description</Label>
        <Textarea
          value={platformDescription}
          onChange={(e) => setPlatformDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Contact Email</Label>
          <Input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>
        <div>
          <Label>Support Email</Label>
          <Input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Contact Phone</Label>
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div>
          <Label>Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
              <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Maintenance Mode</Label>
            <p className="text-sm text-muted-foreground">
              Enable maintenance mode to temporarily disable the platform
            </p>
          </div>
          <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>User Registration</Label>
            <p className="text-sm text-muted-foreground">
              Allow new users to register on the platform
            </p>
          </div>
          <Switch checked={registrationEnabled} onCheckedChange={setRegistrationEnabled} />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Platform Settings
      </Button>
    </div>
  );
}