"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminOtpForm() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('adminOtpEmail');

    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('adminOtpEmail', emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // No email found, redirect to login
      router.push('/admin/login');
      return;
    }

    // Start countdown for resend
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim() || otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit OTP.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ADMIN_AUTH.VERIFY_OTP,
        createFetchOptions('POST', { email, otp: otp.trim() })
      );

      const data = await response.json();

      if (response.ok) {
        // Store token and clear OTP email
        console.log('OTP verification successful, token:', data.token);
        localStorage.setItem('adminToken', data.token);
        document.cookie = `admin_token=${data.token}; path=/; max-age=86400; samesite=lax`;
        localStorage.removeItem('adminOtpEmail');

        toast({
          title: "Success",
          description: "Verification successful! Redirecting...",
        });

        console.log('Redirecting to dashboard...');
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid OTP.",
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

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setResendLoading(true);

    try {
      // Get stored credentials to resend OTP
      const storedEmail = localStorage.getItem('adminOtpEmail');
      const storedPassword = localStorage.getItem('adminTempPassword');

      if (!storedEmail || !storedPassword) {
        toast({
          title: "Error",
          description: "Session expired. Please login again.",
          variant: "destructive",
        });
        router.push('/admin/login');
        return;
      }

      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ADMIN_AUTH.LOGIN,
        createFetchOptions('POST', { email: storedEmail, password: storedPassword })
      );

      const data = await response.json();

      if (response.ok && data.requiresOtp) {
        toast({
          title: "Success",
          description: "A new verification code has been sent.",
        });
        setCountdown(60);
      } else {
        toast({
          title: "Error",
          description: "Failed to resend code. Please try again.",
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
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle>System Admin Verification</CardTitle>
          <CardDescription>
            A 6-digit code was sent to the email address of system admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter the 6-digit code sent to {email}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={handleResendOtp}
              disabled={countdown > 0 || resendLoading}
              className="text-sm"
            >
              {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/admin/login">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}