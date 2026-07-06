"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// /admin/otp has been merged into /login/otp, which now handles both regular
// and system admin accounts. Kept as a redirect so old links/bookmarks still work.
export default function AdminOtpRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login/otp");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
