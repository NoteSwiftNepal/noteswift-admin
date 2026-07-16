"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Users,
  Bell,
  CreditCard,
  Settings,
  ShieldCheck,
  Info,
  UserCheck,
  BookOpen,
  Sparkles,
  BotMessageSquare,
  Receipt,
  Smartphone,
  Archive,
  Image,
  School,
  ChevronDown,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLoading } from "@/context/loading-context";
import { useAdmin } from "@/context/admin-context";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/admin-management",
    label: "Admin Management",
    icon: ShieldCheck,
    children: [
      { href: "/dashboard/admin-management?tab=list", label: "All Admins" },
    ]
  },
  {
    href: "/dashboard/teacher-management",
    label: "Teacher Management",
    icon: Users,
    children: [
      { href: "/dashboard/teacher-management?tab=pending", label: "Pending Teachers" },
      { href: "/dashboard/teacher-assignments", label: "Subject Assignments" },
    ]
  },
  {
    href: "/dashboard/school-management",
    label: "School Management",
    icon: School,
  },
  {
    href: "/dashboard/courses",
    label: "Courses",
    icon: BookOpen,
    children: [
      { href: "/dashboard/courses?tab=pro", label: "Pro Courses" },
    ]
  },
  { href: "/dashboard/recommendations", label: "Course Recommendations", icon: BotMessageSquare },
  { href: "/dashboard/app-block", label: "App Block", icon: Smartphone },
  { href: "/dashboard/promo-banners", label: "Promo Banners", icon: Image },
  {
    href: "/dashboard/users",
    label: "Users",
    icon: Users,
    children: [
      { href: "/dashboard/users?tab=students", label: "Students" },
    ]
  },
  { href: "/dashboard/reports", label: "Reports", icon: LineChart },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    children: [
      { href: "/dashboard/notifications", label: "Notification History" },
    ]
  },
  { href: "/dashboard/revenue", label: "Revenue", icon: CreditCard },
  { href: "/dashboard/orders-payments", label: "Orders & Payments", icon: Receipt },
  { href: "/dashboard/archives", label: "Archives", icon: Archive },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/about", label: "About", icon: Info },
];

// Section headers purely group the same `links` entries above for a less
// cluttered scan — every href/label/icon/children is referenced as-is.
const NAV_SECTIONS: { label: string; hrefs: string[] }[] = [
  { label: "Overview", hrefs: ["/dashboard"] },
  {
    label: "People",
    hrefs: [
      "/dashboard/admin-management",
      "/dashboard/teacher-management",
      "/dashboard/school-management",
      "/dashboard/users",
    ],
  },
  {
    label: "Content",
    hrefs: [
      "/dashboard/courses",
      "/dashboard/recommendations",
      "/dashboard/promo-banners",
      "/dashboard/app-block",
    ],
  },
  {
    label: "Operations",
    hrefs: [
      "/dashboard/reports",
      "/dashboard/notifications",
      "/dashboard/revenue",
      "/dashboard/orders-payments",
    ],
  },
  {
    label: "System",
    hrefs: [
      "/dashboard/archives",
      "/dashboard/audit-log",
      "/dashboard/settings",
      "/dashboard/about",
    ],
  },
];

// A section/link is "active" when the current path is that page itself, or
// (for parents with children) a page nested under it — same check the old
// flat list used for highlighting, just reused here to auto-expand.
function isParentActive(href: string, hasChildren: boolean, pathname: string) {
  return pathname === href || (hasChildren && pathname.startsWith(`${href}/`));
}

export function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startLoading } = useLoading();
  const { admin } = useAdmin();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const link of links) {
      if (link.children) {
        initial[link.href] = isParentActive(link.href, true, pathname);
      }
    }
    return initial;
  });

  // Keep whichever section the user is currently in expanded as they
  // navigate, without collapsing sections they opened manually.
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const link of links) {
        if (link.children && isParentActive(link.href, true, pathname) && !next[link.href]) {
          next[link.href] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const toggleExpanded = (href: string) => {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "system_admin":
        return { text: "System Admin", variant: "destructive" as const, className: "" };
      case "super_admin":
        return { text: "Super Admin", variant: "default" as const, className: "bg-purple-500 text-white" };
      case "admin":
        return { text: "Admin", variant: "secondary" as const, className: "bg-blue-500 text-white" };
      default:
        return { text: "Admin", variant: "secondary" as const, className: "bg-blue-500 text-white" };
    }
  };

  const isLinkActive = (href: string) => {
    const url = new URL(href, window.location.origin);
    return pathname === url.pathname && searchParams.get('tab') === url.searchParams.get('tab');
  };

  const roleDisplay = admin ? getRoleDisplay(admin.role) : { text: "Loading...", variant: "secondary" as const, className: "" };

  return (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-4">
        {admin?.role && (
          <div className="mb-2">
            <Badge variant={roleDisplay.variant} className={cn("text-xs", roleDisplay.className)}>
              {roleDisplay.text}
            </Badge>
          </div>
        )}
        <h2 className="text-lg font-bold">Admin Panel</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV_SECTIONS.map((section) => {
          const sectionLinks = section.hrefs
            .map((href) => links.find((l) => l.href === href))
            .filter((l): l is typeof links[number] => !!l);

          if (sectionLinks.length === 0) return null;

          return (
            <div key={section.label} className="mb-1 mt-3 first:mt-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </div>
              <SidebarMenu className="space-y-0.5">
                {sectionLinks.map((link) => {
                  const hasChildren = !!link.children;
                  const active = isParentActive(link.href, hasChildren, pathname);
                  const isOpen = hasChildren && !!expanded[link.href];

                  return (
                    <SidebarMenuItem key={link.href}>
                      <div className="relative flex items-center">
                        <SidebarMenuButton asChild className="flex-1">
                          <Link
                            href={link.href}
                            onClick={() => {
                              if (link.href !== pathname) {
                                startLoading();
                              }
                            }}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                              hasChildren && "pr-8",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            )}
                          >
                            <link.icon className="h-[18px] w-[18px] shrink-0" />
                            <span className="text-sm font-medium truncate">{link.label}</span>
                          </Link>
                        </SidebarMenuButton>
                        {hasChildren && (
                          <button
                            type="button"
                            aria-label={isOpen ? `Collapse ${link.label}` : `Expand ${link.label}`}
                            onClick={() => toggleExpanded(link.href)}
                            className={cn(
                              "absolute right-1.5 flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                              active ? "text-primary-foreground/80 hover:bg-white/10" : "text-gray-400 hover:bg-blue-100 hover:text-blue-600"
                            )}
                          >
                            <ChevronDown
                              className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                            />
                          </button>
                        )}
                      </div>
                      {hasChildren && isOpen && (
                        <SidebarMenuSub className="mx-4 border-l-2 border-gray-300 px-2">
                          {link.children!.map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isLinkActive(child.href)}
                                className={cn(
                                  "text-[13px]",
                                  isLinkActive(child.href)
                                    ? "font-medium text-blue-600"
                                    : "text-gray-500 hover:text-blue-600"
                                )}
                              >
                                <Link href={child.href}>{child.label}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
