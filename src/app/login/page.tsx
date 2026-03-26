
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Call Express backend for authentication
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      
      // Step 1: Authenticate with backend (validates credentials and sends OTP)
      // Use AUTH.LOGIN for regular admins (super_admin, admin)
      const loginResponse = await fetch(
        API_ENDPOINTS.AUTH.LOGIN,
        createFetchOptions('POST', { email: username, password })
      );

      const loginData = await loginResponse.json();

      if (loginResponse.ok && loginData.requiresOtp) {
        // Store email and password for OTP verification
        localStorage.setItem('adminLoginEmail', username);
        localStorage.setItem('adminLoginPassword', password);
        localStorage.setItem("isPasswordVerified", "true");
        
        toast({
          title: "Code Sent",
          description: loginData.message || "A one-time code has been sent to your email.",
        });
        router.push("/login/otp");
      } else if (loginResponse.ok && loginData.token) {
        // Direct login without OTP (shouldn't happen for regular flow)
        localStorage.setItem('adminToken', loginData.token);
        document.cookie = `admin_token=${loginData.token}; path=/; max-age=86400; samesite=lax`;
        router.push("/dashboard");
      } else {
        setError(loginData.error || "Invalid username or password. Please try again.");
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: loginData.error || "Invalid credentials.",
        });
      }
    } catch (err) {
      console.error('Login error:', err);
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
          <CardTitle className="text-3xl font-bold font-headline">NoteSwift Admin</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Email address</Label>
              <Input
                id="username"
                type="text"
                placeholder="eg: admin@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full font-semibold text-base py-6" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log In
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
