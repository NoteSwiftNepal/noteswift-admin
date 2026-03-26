"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function EmailSettings() {
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("noreply@noteswift.com");
  const [fromName, setFromName] = useState("NoteSwift");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Saving email settings...");
  };

  const handleTestEmail = () => {
    // TODO: Implement test email functionality
    console.log("Sending test email...");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Email Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Enable email notifications across the platform
          </p>
        </div>
        <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
      </div>

      {emailEnabled && (
        <div className="space-y-4">
          <Label>SMTP Configuration</Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SMTP Host</Label>
              <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div>
              <Label>SMTP Port</Label>
              <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SMTP Username</Label>
              <Input value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} />
            </div>
            <div>
              <Label>SMTP Password</Label>
              <Input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>From Email</Label>
              <Input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>From Name</Label>
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleTestEmail} variant="outline">
            Send Test Email
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>SMS Notifications</Label>
          <p className="text-sm text-muted-foreground">
            Enable SMS notifications using Twilio
          </p>
        </div>
        <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
      </div>

      {smsEnabled && (
        <div className="space-y-4">
          <Label>Twilio Configuration</Label>
          <div>
            <Label>Account SID</Label>
            <Input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} />
          </div>
          <div>
            <Label>Auth Token</Label>
            <Input
              type="password"
              value={twilioToken}
              onChange={(e) => setTwilioToken(e.target.value)}
            />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input
              placeholder="+1234567890"
              value={twilioPhone}
              onChange={(e) => setTwilioPhone(e.target.value)}
            />
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="w-full">
        Save Email & SMS Settings
      </Button>
    </div>
  );
}