"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

import { LoadingProvider } from "@/context/loading-context";
import { LoadingBar } from "@/components/ui/loading-bar";
import { PageNavigationHandler } from "@/components/page-navigation-handler";
import { AdminProvider, useAdmin } from "@/context/admin-context";

const FORBIDDEN_FOR_NORMAL_ADMIN = [
  '/dashboard/admin-management',
  '/dashboard/admin-performance',
  '/dashboard/teacher-management',
  '/dashboard/teacher-assignments',
  '/dashboard/school-management',
  '/dashboard/courses',
  '/dashboard/recommendations',
  '/dashboard/promo-banners',
  '/dashboard/app-block',
  '/dashboard/reports',
  '/dashboard/notifications',
  '/dashboard/archives',
  '/dashboard/subject-groups',
  '/dashboard/audit-log',
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { admin, loading, error } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !admin && !error) {
      // No admin data and not loading, redirect to regular login
      router.push('/login');
    }
  }, [admin, loading, error, router]);

  useEffect(() => {
    if (admin && admin.role === 'admin' && !loading) {
      const isForbidden = FORBIDDEN_FOR_NORMAL_ADMIN.some(
        (forbiddenPath) => pathname === forbiddenPath || pathname.startsWith(`${forbiddenPath}/`)
      );
      if (isForbidden) {
        toast({
          title: "Access Denied",
          description: "You do not have permission to view this section.",
          variant: "destructive",
        });
        router.replace('/dashboard');
      }
    }
  }, [admin, loading, pathname, router, toast]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      // Clear admin-specific localStorage, sessionStorage and cookies
      localStorage.removeItem('adminToken');
      sessionStorage.removeItem('noteswift_dashboard_insights');
      sessionStorage.removeItem('noteswift_dashboard_task_suggestions');
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      // Small delay for smooth transition
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect to regular login page
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if clearing fails
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/assets/logo.png"
            alt="NoteSwift Logo"
            className="h-14 w-14 object-contain animate-pulse"
          />
          <p className="text-muted-foreground">Loading admin profile...</p>
        </div>
      </div>
    );
  }

  if (error || !admin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">Authentication failed. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <LoadingProvider>
      <PageNavigationHandler />

      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          {/* Sidebar */}
          <Sidebar className="h-full">
            <SidebarHeader>
              <div className="flex mt-2 items-center gap-2">
                <img
                  src="/assets/logo2.png"
                  alt="NoteSwift Logo"
                  className="h-15 w-15 object-contain"
                />
              </div>
            </SidebarHeader>

            <SidebarContent>
              <DashboardNav />
            </SidebarContent>

            <SidebarFooter>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                <Avatar>
                  <AvatarImage
                    src="https://placehold.co/40x40.png"
                    alt="Admin"
                  />
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{admin.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {admin.email}
                  </span>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          {/* Right side */}
          <SidebarInset>
            <div className="flex flex-col flex-1 min-h-screen bg-background">
              {/* Header */}
              <header className="flex items-center justify-between p-4 border-b z-10 bg-background relative">
                <SidebarTrigger />
                <h2 className="text-xl font-semibold font-headline">
                  Welcome Back, {admin.name}!
                </h2>
                <Button onClick={handleLogout} disabled={isLoggingOut}>
                  {isLoggingOut && <Loader2 className="animate-spin mr-2" />}
                  Logout
                </Button>
                <LoadingBar />
              </header>

              {/* Main content */}
              <main className="flex-1 w-full p-4 md:p-6 lg:p-8 overflow-auto">
                {children}
              </main>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </LoadingProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <DashboardContent>{children}</DashboardContent>
    </AdminProvider>
  );
}
