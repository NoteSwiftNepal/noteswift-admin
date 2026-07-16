
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/AuthCard";
import { useToast } from "@/hooks/use-toast";

export default function OtpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const isVerified = localStorage.getItem("isPasswordVerified");
    if (isVerified !== "true") {
      router.replace("/login");
    }

    // Get the email and password from localStorage
    const storedEmail = localStorage.getItem("adminLoginEmail");
    const storedPassword = localStorage.getItem("adminLoginPassword");
    if (storedEmail) {
      setEmail(storedEmail);
    }
    if (storedPassword) {
      setPassword(storedPassword);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Call Express backend to verify OTP - endpoint depends on which login flow was used
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const flow = localStorage.getItem('adminLoginFlow') || 'regular';
      const isSystemAdmin = flow === 'system_admin';

      const response = await fetch(
        isSystemAdmin ? API_ENDPOINTS.ADMIN_AUTH.VERIFY_OTP : API_ENDPOINTS.AUTH.VERIFY_OTP,
        createFetchOptions('POST', isSystemAdmin ? { email, otp } : { email, password, otp })
      );

      const data = await response.json();

      if (response.ok && data.token) {
        // Store the token in both localStorage and cookie
        localStorage.setItem('adminToken', data.token);

        // Set cookie for middleware to detect
        document.cookie = `admin_token=${data.token}; path=/; max-age=86400; samesite=lax`;

        // Backup session info to localStorage for UI purposes
        localStorage.setItem('admin_session_backup', JSON.stringify({
          username: data.admin?.email || email,
          loginTime: Date.now(),
        }));
        localStorage.setItem("isAuthenticated", "true");
        localStorage.removeItem("isPasswordVerified");
        localStorage.removeItem("adminLoginEmail");
        localStorage.removeItem("adminLoginPassword");
        localStorage.removeItem("adminLoginFlow");

        toast({
          title: "Authentication Successful",
          description: "Redirecting to the dashboard.....!",
        });
        
        // Use window.location.href for full page reload so middleware can see the cookie
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Invalid code. Please try again.");
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: data.error || "The code you entered is incorrect.",
        });
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      setError("An unexpected error occurred. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResend = async () => {
    setIsResending(true);
    
    try {
      // Call Express backend to resend OTP - endpoint depends on which login flow was used
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const flow = localStorage.getItem('adminLoginFlow') || 'regular';

      const response = await fetch(
        flow === 'system_admin' ? API_ENDPOINTS.ADMIN_AUTH.LOGIN : API_ENDPOINTS.AUTH.LOGIN,
        createFetchOptions('POST', { email, password })
      );

      const data = await response.json();

      if (response.ok && data.requiresOtp) {
        toast({
          title: "Code Resent",
          description: data.message || "A new one-time code has been sent.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Resend",
          description: data.error || "Could not resend OTP.",
        });
      }
    } catch (err) {
      console.error('OTP resend error:', err);
      toast({
        variant: "destructive",
        title: "Failed to Resend",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthCard
      title="Enter Verification Code"
      description="A 6-digit code has been sent to your registered mobile number."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="otp">One-Time Code</Label>
          <div className="relative">
            <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              autoFocus
              className="h-12 rounded-lg pl-10 text-center text-lg font-semibold tracking-[0.3em]"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full rounded-lg font-medium" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify Code
        </Button>
        <Button type="button" variant="link" className="w-full" onClick={onResend} disabled={isResending}>
          {isResending ? "Sending..." : "Didn't get a code? Resend"}
        </Button>
      </form>
    </AuthCard>
  );
}
