"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLoading } from '@/context/loading-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const { toast } = useToast();
  const { startLoading } = useLoading();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    startLoading();
    // Simulate a network request
    await new Promise(resolve => setTimeout(resolve, 500));

    localStorage.removeItem("isAuthenticated");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    router.push("/login"); // The PageNavigationHandler will call stopLoading
  };

  return (
    <Button onClick={handleLogout} disabled={isLoggingOut}>
      {isLoggingOut && <Loader2 className="animate-spin" />}
      Logout
    </Button>
  );
}
