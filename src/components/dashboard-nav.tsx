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
  BookOpen,
  BotMessageSquare,
  Receipt,
  Smartphone,
  Archive,
  Image,
  School,
  ChevronDown,
  Link2,
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

interface NavChild {
  href: string;
  label: string;
  requiresSuperAdmin?: boolean;
}

interface NavLink {
  href: string;
  label: string;
  icon: any;
  children?: NavChild[];
}

const links: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/admin-management",
    label: "Admin Management",
    icon: ShieldCheck,
    children: [
      { href: "/dashboard/admin-management?tab=hierarchy", label: "Admin Hierarchy" },
      { href: "/dashboard/admin-management?tab=list", label: "All Admins" },
      { href: "/dashboard/admin-management?tab=invite", label: "Invite Admin" },
      { href: "/dashboard/admin-performance", label: "Admin Performance" },
    ],
  },
  {
    href: "/dashboard/teacher-management",
    label: "Teacher Management",
    icon: Users,
    children: [
      { href: "/dashboard/teacher-management?tab=overview", label: "Overview" },
      { href: "/dashboard/teacher-management?tab=pending", label: "Pending" },
      { href: "/dashboard/teacher-management?tab=approved", label: "Approved" },
      { href: "/dashboard/teacher-management?tab=rejected", label: "Rejected" },
      { href: "/dashboard/teacher-assignments", label: "Subject Assignments" },
    ],
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
      { href: "/dashboard/courses?tab=free", label: "Free Courses" },
      { href: "/dashboard/courses?tab=enrollments", label: "Student Management" },
      { href: "/dashboard/courses?tab=homepage", label: "Homepage" },
    ],
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
      { href: "/dashboard/users?tab=teachers", label: "Teachers" },
    ],
  },
  { href: "/dashboard/reports", label: "Reports", icon: LineChart },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    children: [
      { href: "/dashboard/notifications", label: "Notification History" },
    ],
  },
  { href: "/dashboard/revenue", label: "Revenue", icon: CreditCard },
  {
    href: "/dashboard/orders-payments",
    label: "Orders & Payments",
    icon: Receipt,
    children: [
      { href: "/dashboard/orders-payments?tab=transactions", label: "Transactions" },
      { href: "/dashboard/orders-payments?tab=codes", label: "Unlock Codes" },
      { href: "/dashboard/orders-payments?tab=bulk-codes", label: "Bulk Codes", requiresSuperAdmin: true },
      { href: "/dashboard/orders-payments?tab=esewa", label: "eSewa", requiresSuperAdmin: true },
    ],
  },
  {
    href: "/dashboard/archives",
    label: "Archives",
    icon: Archive,
    children: [
      { href: "/dashboard/archives?tab=classes", label: "Live Classes" },
      { href: "/dashboard/archives?tab=assignments", label: "Assignments" },
    ],
  },
  { href: "/dashboard/subject-groups", label: "Subject Groups", icon: Link2 },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: ShieldCheck },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    children: [
      { href: "/dashboard/settings?tab=account", label: "My Account" },
      { href: "/dashboard/settings?tab=platform", label: "Platform" },
      { href: "/dashboard/settings?tab=security", label: "Security" },
      { href: "/dashboard/settings?tab=payment", label: "Payment" },
      { href: "/dashboard/settings?tab=email", label: "Email/SMS" },
      { href: "/dashboard/settings?tab=users", label: "Users" },
      { href: "/dashboard/settings?tab=content", label: "Content" },
      { href: "/dashboard/settings?tab=maintenance", label: "Maintenance" },
    ],
  },
  { href: "/dashboard/about", label: "About", icon: Info },
];

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
      "/dashboard/subject-groups",
      "/dashboard/audit-log",
      "/dashboard/settings",
      "/dashboard/about",
    ],
  },
];

function isParentActive(linkHref: string, children: NavChild[] | undefined, pathname: string) {
  if (pathname === linkHref) return true;
  if (children) {
    return children.some((child) => {
      const childPath = child.href.split('?')[0];
      return pathname === childPath || (childPath !== '/dashboard' && pathname.startsWith(`${childPath}/`));
    });
  }
  return false;
}

const DEFAULT_TABS: Record<string, string> = {
  '/dashboard/admin-management': 'hierarchy',
  '/dashboard/teacher-management': 'overview',
  '/dashboard/users': 'students',
  '/dashboard/courses': 'pro',
  '/dashboard/orders-payments': 'transactions',
  '/dashboard/archives': 'classes',
  '/dashboard/settings': 'account',
};

export function DashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startLoading } = useLoading();
  const { admin } = useAdmin();

  const isNormalAdmin = admin?.role === 'admin';

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const link of links) {
      if (link.children) {
        initial[link.href] = isParentActive(link.href, link.children, pathname);
      }
    }
    return initial;
  });

  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const link of links) {
        if (link.children && isParentActive(link.href, link.children, pathname) && !next[link.href]) {
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

  const isLinkActive = (childHref: string, parentHref: string) => {
    const [childPath, childQuery] = childHref.split('?');
    if (pathname !== childPath) return false;

    const childParams = new URLSearchParams(childQuery || '');
    const childTab = childParams.get('tab');
    const currentTab = searchParams.get('tab');

    if (childTab) {
      if (currentTab) {
        return currentTab === childTab;
      }
      return DEFAULT_TABS[parentHref] === childTab;
    }

    return !currentTab;
  };

  const roleDisplay = admin ? getRoleDisplay(admin.role) : { text: "Loading...", variant: "secondary" as const, className: "" };

  const NORMAL_ADMIN_ALLOWED_HREFS = new Set([
    "/dashboard",
    "/dashboard/users",
    "/dashboard/revenue",
    "/dashboard/orders-payments",
    "/dashboard/settings",
    "/dashboard/about"
  ]);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    hrefs: isNormalAdmin
      ? section.hrefs.filter((href) => NORMAL_ADMIN_ALLOWED_HREFS.has(href))
      : section.hrefs,
  })).filter((section) => section.hrefs.length > 0);

  return (
    <nav className="flex flex-col h-full select-none">
      <div className="px-4 py-4 shrink-0">
        {admin?.role && (
          <div className="mb-2">
            <Badge variant={roleDisplay.variant} className={cn("text-xs", roleDisplay.className)}>
              {roleDisplay.text}
            </Badge>
          </div>
        )}
        <h2 className="text-lg font-bold">Admin Panel</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {visibleSections.map((section) => {
          const sectionLinks = section.hrefs
            .map((href) => links.find((l) => l.href === href))
            .filter((l): l is NavLink => !!l);

          if (sectionLinks.length === 0) return null;

          return (
            <div key={section.label} className="mb-1 mt-3 first:mt-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </div>
              <SidebarMenu className="space-y-0.5">
                {sectionLinks.map((link) => {
                  const filteredChildren = link.children?.filter((child) => {
                    if (isNormalAdmin && child.requiresSuperAdmin) return false;
                    return true;
                  });

                  const hasChildren = !!filteredChildren && filteredChildren.length > 0;
                  const active = isParentActive(link.href, filteredChildren, pathname);
                  const isOpen = hasChildren && !!expanded[link.href];

                  return (
                    <SidebarMenuItem key={link.href}>
                      <div className="relative flex items-center">
                        <SidebarMenuButton asChild className="flex-1">
                          <Link
                            href={link.href}
                            onClick={() => {
                              if (hasChildren && !isOpen) {
                                toggleExpanded(link.href);
                              }
                              if (link.href !== pathname) {
                                startLoading();
                              }
                            }}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                              hasChildren && "pr-8",
                              active
                                ? "bg-primary text-primary-foreground font-medium"
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
                              className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")}
                            />
                          </button>
                        )}
                      </div>
                      {hasChildren && isOpen && (
                        <SidebarMenuSub className="mx-3.5 mt-1 border-l-2 border-gray-200 pl-2.5 space-y-0.5">
                          {filteredChildren.map((child) => {
                            const isChildActive = isLinkActive(child.href, link.href);
                            return (
                              <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isChildActive}
                                  className={cn(
                                    "text-[13px] py-1.5 px-2 rounded-md transition-colors",
                                    isChildActive
                                      ? "font-semibold text-blue-600 bg-blue-50"
                                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                                  )}
                                >
                                  <Link
                                    href={child.href}
                                    onClick={() => {
                                      const childPath = child.href.split('?')[0];
                                      if (childPath !== pathname) {
                                        startLoading();
                                      }
                                    }}
                                  >
                                    {child.label}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
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

