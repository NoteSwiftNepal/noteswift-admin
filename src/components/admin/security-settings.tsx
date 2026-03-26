"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SecuritySettings() {
  const [minPasswordLength, setMinPasswordLength] = useState("8");
  const [sessionTimeout, setSessionTimeout] = useState("24");
  const [maxLoginAttempts, setMaxLoginAttempts] = useState("5");
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordExpiry, setPasswordExpiry] = useState("90");
  const [ipWhitelist, setIpWhitelist] = useState("");

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving security settings...");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Minimum Password Length</Label>
          <Input
            type="number"
            value={minPasswordLength}
            onChange={(e) => setMinPasswordLength(e.target.value)}
          />
        </div>
        <div>
          <Label>Session Timeout (hours)</Label>
          <Input
            type="number"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Max Login Attempts</Label>
          <Input
            type="number"
            value={maxLoginAttempts}
            onChange={(e) => setMaxLoginAttempts(e.target.value)}
          />
        </div>
        <div>
          <Label>Password Expiry (days)</Label>
          <Input
            type="number"
            value={passwordExpiry}
            onChange={(e) => setPasswordExpiry(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label>Password Requirements</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Require Special Characters</Label>
              <p className="text-sm text-muted-foreground">!@#$%^&*() etc.</p>
            </div>
            <Switch checked={requireSpecialChars} onCheckedChange={setRequireSpecialChars} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Require Numbers</Label>
              <p className="text-sm text-muted-foreground">0-9 digits</p>
            </div>
            <Switch checked={requireNumbers} onCheckedChange={setRequireNumbers} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Require Uppercase Letters</Label>
              <p className="text-sm text-muted-foreground">A-Z letters</p>
            </div>
            <Switch checked={requireUppercase} onCheckedChange={setRequireUppercase} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Two-Factor Authentication</Label>
          <p className="text-sm text-muted-foreground">
            Require 2FA for all admin accounts
          </p>
        </div>
        <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
      </div>

      <div>
        <Label>IP Whitelist (comma-separated)</Label>
        <Input
          placeholder="192.168.1.1, 10.0.0.1"
          value={ipWhitelist}
          onChange={(e) => setIpWhitelist(e.target.value)}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Leave empty to allow all IPs
        </p>
      </div>

      <Button onClick={handleSave} className="w-full">
        Save Security Settings
      </Button>
    </div>
  );
}