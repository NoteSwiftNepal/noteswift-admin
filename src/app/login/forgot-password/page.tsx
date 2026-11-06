"use client";

// Forgot password: enter the account email, get a 6-digit code by email, then
// enter the code with a new password. The backend answers the first step the
// same way for every email, so this screen never says whether an account
// exists. System admins can't reset here (their password is set on the server).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/auth/AuthCard";
import { useToast } from "@/hooks/use-toast";

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;
const RESEND_AFTER_S = 60;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const post = async (url: string, body: unknown) => {
    const { createFetchOptions } = await import("@/config/api");
    const res = await fetch(url, createFetchOptions("POST", body));
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.success !== false, data };
  };

  const sendCode = async () => {
    setError("");
    setIsLoading(true);
    try {
      const { API_ENDPOINTS } = await import("@/config/api");
      const { ok, data } = await post(API_ENDPOINTS.AUTH.PASSWORD_RESET_REQUEST, { email: email.trim() });
      if (!ok) {
        setError(data.error || "Could not send the code. Please try again.");
        return;
      }
      setStep("code");
      setResendIn(RESEND_AFTER_S);
      toast({ title: "Check your email", description: data.message });
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6-digit code from the email.");
    if (!PASSWORD_PATTERN.test(password)) return setError("Use at least 10 characters, with both letters and numbers.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setIsLoading(true);
    try {
      const { API_ENDPOINTS } = await import("@/config/api");
      const { ok, data } = await post(API_ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, { email: email.trim(), code: code.trim(), newPassword: password });
      if (!ok) {
        setError(data.error || "Could not change the password. Please try again.");
        return;
      }
      toast({ title: "Password changed", description: "Sign in with your new password." });
      router.push("/login");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <Link href="/login" className="font-medium text-gray-700 hover:text-gray-900 hover:underline">
      Back to sign in
    </Link>
  );

  if (step === "email") {
    return (
      <AuthCard title="Forgot your password?" description="Enter your admin email and we'll send you a code to set a new one." footer={footer}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input id="email" type="email" placeholder="eg: admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username" className="h-11 rounded-lg pl-10" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full rounded-lg font-medium" disabled={isLoading || !email.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send code
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      description={
        <>
          If <span className="font-medium text-gray-700">{email.trim()}</span> has an admin account, we've emailed it a 6-digit code. It expires in 10 minutes.
        </>
      }
      footer={footer}
    >
      <form onSubmit={reset} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="code">Code from the email</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input id="code" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus autoComplete="one-time-code" className="h-11 rounded-lg pl-10 tracking-widest" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="h-11 rounded-lg pl-10 pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-500">At least 10 characters, with both letters and numbers.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input id="confirm-password" type={showPassword ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className="h-11 rounded-lg pl-10" />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full rounded-lg font-medium" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Change password
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="text-gray-600 hover:text-gray-900 hover:underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
          >
            Use a different email
          </button>
          <button type="button" className="font-medium text-gray-700 hover:text-gray-900 hover:underline disabled:text-gray-400 disabled:no-underline" disabled={resendIn > 0 || isLoading} onClick={() => void sendCode()}>
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
