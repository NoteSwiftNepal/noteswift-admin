"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/AuthCard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, CheckCircle, User, Smartphone, Lock } from "lucide-react";

export function AdminSignupForm() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [invitationValid, setInvitationValid] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      verifyInvitation();
    } else {
      setVerifying(false);
    }
  }, [token]);

  const verifyInvitation = async () => {
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ADMIN_AUTH.VERIFY_INVITATION,
        createFetchOptions('POST', { token })
      );

      const data = await response.json();

      if (response.ok) {
        setInvitationValid(true);
        setInvitationEmail(data.email);
      } else {
        toast({
          title: "Invalid Invitation",
          description: data.error || "This invitation is invalid or expired.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify invitation.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{7,15}$/.test(phoneNumber.trim())) {
      toast({
        title: "Error",
        description: "Enter a valid phone number (digits only, 7-15 characters).",
        variant: "destructive",
      });
      return;
    }

    if (!/^(?=.*[A-Za-z])(?=.*\d).{10,}$/.test(password)) {
      toast({
        title: "Error",
        description: "Password must be at least 10 characters long and include both letters and numbers.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ADMIN_AUTH.COMPLETE_SIGNUP,
        createFetchOptions('POST', {
          token,
          name: name.trim(),
          phone_number: phoneNumber.trim(),
          password,
        })
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Account created successfully! You can now log in.",
        });
        router.push(data.role === 'system_admin' ? '/admin/login' : '/login');
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create account.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitationValid) {
    return (
      <AuthCard title="Invalid Invitation">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <Shield className="h-6 w-6 text-red-500" />
          </div>
          <p className="mb-5 text-sm text-gray-500">
            This invitation link is invalid or has expired.
          </p>
          <Button className="h-11 w-full rounded-lg font-medium" onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Welcome to NoteSwift Admin" description="Complete your account setup to join the admin team">
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Invitation verified for {invitationEmail}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 rounded-lg pl-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <div className="relative">
            <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="98XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="h-11 rounded-lg pl-10"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Used to send you a login verification code
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-lg pl-10"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            At least 10 characters, including letters and numbers
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-11 rounded-lg pl-10"
            />
          </div>
        </div>

        <Button type="submit" className="h-11 w-full rounded-lg font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            "Complete Setup"
          )}
        </Button>
      </form>
    </AuthCard>
  );
}