// Server-side check for Next.js server actions. Server actions are public
// POST endpoints (their ids ship in the client bundle), and middleware.ts
// lets a request through even when it can't verify the token's signature,
// so each action must authenticate the caller itself before doing anything.
//
// The caller's admin token (the `admin_token` cookie set at login) is checked
// by the Express backend, the only place that holds the signing secret and
// the admin's current role and active state.
import { cookies } from "next/headers";
import { API_ENDPOINTS } from "@/config/api";
import type { Permission } from "@/lib/permissions";

export type ServerAdmin = { _id: string; role: string; permissions: Permission[] };

export async function requireAdmin(permission: Permission): Promise<ServerAdmin | null> {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) return null;
  try {
    const res = await fetch(API_ENDPOINTS.ADMIN_AUTH.PROFILE, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const admin = data?.admin as ServerAdmin | undefined;
    if (!admin || !Array.isArray(admin.permissions) || !admin.permissions.includes(permission)) return null;
    return admin;
  } catch {
    return null;
  }
}
