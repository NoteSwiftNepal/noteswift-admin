
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      // Call Express backend to verify OTP for regular admins
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      
      const response = await fetch(
        API_ENDPOINTS.AUTH.VERIFY_OTP,
        createFetchOptions('POST', { email, password, otp })
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
      // Call Express backend to resend OTP for regular admins
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      
      const response = await fetch(
        API_ENDPOINTS.AUTH.LOGIN,
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center">
                                       <img
      src="/assets/logo.png"
      alt="NoteSwift Logo"
      className="h-16 w-16 object-contain"
    />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">Enter Verification Code</CardTitle>
          <CardDescription>A 6-digit code was sent to the secret email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="otp">One-Time Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full font-semibold text-base py-6" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>
            <Button type="button" variant="link" className="w-full" onClick={onResend} disabled={isResending}>
              {isResending ? "Sending..." : "Didn't get a code? Resend"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
