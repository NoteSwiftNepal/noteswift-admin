"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";

export function MyAccountSettings() {
  const { admin, refetch } = useAdmin();
  const { toast } = useToast();

  // Phone number card
  const [phoneNumber, setPhoneNumber] = useState(admin?.phone_number || "");
  const [phonePassword, setPhonePassword] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Email card
  const [email, setEmail] = useState(admin?.email || "");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Password card
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // `admin` loads asynchronously (context fetches it after mount), so the
  // useState initializers above almost always run before it's populated —
  // without this, the fields render permanently blank instead of the
  // account's actual current phone/email.
  useEffect(() => {
    if (admin) {
      setPhoneNumber(admin.phone_number || "");
      setEmail(admin.email || "");
    }
  }, [admin]);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{7,15}$/.test(phoneNumber.trim())) {
      toast({ variant: "destructive", title: "Invalid phone number", description: "Digits only, 7-15 characters." });
      return;
    }

    setPhoneLoading(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.AUTH.UPDATE_PHONE,
        createFetchOptions('PATCH', { password: phonePassword, phone_number: phoneNumber.trim() })
      );
      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: "Phone number updated", description: "Your phone number has been updated successfully." });
        setPhonePassword("");
        await refetch();
      } else {
        toast({ variant: "destructive", title: "Update failed", description: data.error || "Failed to update phone number." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ variant: "destructive", title: "Invalid email", description: "Enter a valid email address." });
      return;
    }

    setEmailLoading(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.AUTH.UPDATE_EMAIL,
        createFetchOptions('PATCH', { password: emailPassword, email: email.trim() })
      );
      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: "Email updated", description: "Your email address has been updated successfully." });
        setEmailPassword("");
        await refetch();
      } else {
        toast({ variant: "destructive", title: "Update failed", description: data.error || "Failed to update email address." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "New password and confirmation must match." });
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{10,}$/.test(newPassword)) {
      toast({ variant: "destructive", title: "Weak password", description: "At least 10 characters, including letters and numbers." });
      return;
    }

    setPasswordLoading(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.AUTH.UPDATE_PASSWORD,
        createFetchOptions('PATCH', { currentPassword, newPassword })
      );
      const data = await response.json();

      if (response.ok && data.success) {
        toast({ title: "Password updated", description: "Your password has been changed successfully." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({ variant: "destructive", title: "Update failed", description: data.error || "Failed to update password." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Phone Number */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="h-5 w-5" /> Phone Number</CardTitle>
          <CardDescription>Used for the passwordless Mobile Number login option.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePhone} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber">New Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="98XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phonePassword">Current Password</Label>
              <Input
                id="phonePassword"
                type="password"
                placeholder="••••••••"
                value={phonePassword}
                onChange={(e) => setPhonePassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={phoneLoading}>
                {phoneLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Phone Number
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email Address */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5" /> Email Address</CardTitle>
          <CardDescription>Your primary login identifier and where login codes are sent.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateEmail} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">New Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emailPassword">Current Password</Label>
              <Input
                id="emailPassword"
                type="password"
                placeholder="••••••••"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={emailLoading}>
                {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Email Address
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5" /> Password</CardTitle>
          <CardDescription>At least 10 characters, including letters and numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
