
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/AuthCard";
import { useToast } from "@/hooks/use-toast";

type LoginFlow = 'regular' | 'system_admin' | 'mobile_otp';

export default function OtpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [flow, setFlow] = useState<LoginFlow>('regular');

  useEffect(() => {
    const isVerified = localStorage.getItem("isPasswordVerified");
    if (isVerified !== "true") {
      router.replace("/login");
    }

    setFlow((localStorage.getItem('adminLoginFlow') as LoginFlow) || 'regular');
    setEmail(localStorage.getItem("adminLoginEmail") || "");
    setPassword(localStorage.getItem("adminLoginPassword") || "");
    setPhone(localStorage.getItem("adminLoginPhone") || "");
  }, [router]);

  const isMobileOtp = flow === 'mobile_otp';
  const isSystemAdmin = flow === 'system_admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');

      const safeJson = async (res: Response) => {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          return await res.json();
        }
        const text = await res.text();
        console.error(`Non-JSON response (${res.status}) from ${res.url}:`, text);
        return { error: `Server error (${res.status}). Please verify backend is running on http://localhost:5000.` };
      };

      const response = isMobileOtp
        ? await fetch(API_ENDPOINTS.AUTH.OTP_LOGIN_VERIFY, createFetchOptions('POST', { phone_number: phone, otp }))
        : await fetch(
            isSystemAdmin ? API_ENDPOINTS.ADMIN_AUTH.VERIFY_OTP : API_ENDPOINTS.AUTH.VERIFY_OTP,
            createFetchOptions('POST', { email, otp })
          );

      const data = await safeJson(response);

      if (response.ok && data.token) {
        // Store the token in both localStorage and cookie
        localStorage.setItem('adminToken', data.token);

        // Set cookie for middleware to detect
        // NOTE: 'secure' flag is required in production (HTTPS) — without it the browser
        // silently drops the cookie and middleware can't authenticate the user.
        const isHttps = window.location.protocol === 'https:';
        const securePart = isHttps ? '; secure' : '';
        document.cookie = `admin_token=${data.token}; path=/; max-age=86400; samesite=lax${securePart}`;

        // Backup session info to localStorage for UI purposes
        localStorage.setItem('admin_session_backup', JSON.stringify({
          username: data.admin?.email || email,
          loginTime: Date.now(),
        }));
        localStorage.setItem("isAuthenticated", "true");
        localStorage.removeItem("isPasswordVerified");
        localStorage.removeItem("adminLoginEmail");
        localStorage.removeItem("adminLoginPassword");
        localStorage.removeItem("adminLoginPhone");
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
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');

      const response = isMobileOtp
        ? await fetch(API_ENDPOINTS.AUTH.OTP_LOGIN_REQUEST, createFetchOptions('POST', { phone_number: phone }))
        : await fetch(
            isSystemAdmin ? API_ENDPOINTS.ADMIN_AUTH.LOGIN : API_ENDPOINTS.AUTH.LOGIN,
            createFetchOptions('POST', { email, password })
          );

      const data = await response.json();

      if (response.ok && (data.requiresOtp || data.success)) {
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
      description={isMobileOtp ? "A 6-digit code has been sent to your phone." : "A 6-digit code has been sent to your registered email address."}
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
