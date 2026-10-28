// What the signed-in admin may see (Sales & CRM plan, backend
// CRM_IMPLEMENTATION.md §1.2 and §2). The backend sends the admin's
// permission list with the profile and enforces every rule on each request;
// this file only decides what the panel shows, so hiding something here is
// never the security boundary.

// Mirrors the backend catalog in src/shared/auth/permissions.ts.
export type Permission =
  | 'dashboard.view' | 'dashboard.view_financials'
  | 'admins.manage' | 'teachers.manage' | 'schools.manage'
  | 'users.view' | 'users.manage'
  | 'enrollments.view' | 'enrollments.grant_direct' | 'enrollments.assign_pending' | 'enrollments.cancel_pending' | 'enrollments.remove'
  | 'courses.view_catalog' | 'courses.manage'
  | 'recommendations.view' | 'recommendations.manage'
  | 'promo_banners.manage' | 'app_block.manage' | 'notifications.manage'
  | 'reports.view' | 'revenue.view' | 'orders.view' | 'orders.view_sensitive' | 'orders.manage'
  | 'discount_codes.manage' | 'archives.manage' | 'subject_groups.manage' | 'audit.view'
  | 'settings.platform' | 'live_classes.view' | 'leads.legacy'
  | 'refunds.view' | 'refunds.manage' | 'exports.sensitive'
  | `crm.${string}`;

export type ProductRole = 'super_admin' | 'admin' | 'sales';

// Pages and the permission needed to open them. First matching prefix wins,
// so longer prefixes come first.
const ROUTE_PERMISSIONS: [string, Permission][] = [
  ['/dashboard/admin-management', 'admins.manage'],
  ['/dashboard/admin-performance', 'admins.manage'],
  ['/dashboard/teacher-management', 'teachers.manage'],
  ['/dashboard/teacher-assignments', 'teachers.manage'],
  ['/dashboard/school-management', 'schools.manage'],
  ['/dashboard/users', 'users.view'],
  ['/dashboard/courses', 'courses.manage'],
  ['/dashboard/recommendations', 'recommendations.view'],
  ['/dashboard/app-block', 'app_block.manage'],
  ['/dashboard/promo-banners', 'promo_banners.manage'],
  ['/dashboard/reports', 'reports.view'],
  ['/dashboard/notifications', 'notifications.manage'],
  ['/dashboard/revenue', 'revenue.view'],
  ['/dashboard/orders-payments', 'orders.view'],
  ['/dashboard/discount-codes', 'discount_codes.manage'],
  ['/dashboard/leads', 'leads.legacy'],
  ['/dashboard/archives', 'archives.manage'],
  ['/dashboard/subject-groups', 'subject_groups.manage'],
  ['/dashboard/audit-log', 'audit.view'],
  ['/dashboard/live-classes-test', 'live_classes.view'],
];

// Tabs inside a page that need more than the page itself.
const TAB_PERMISSIONS: Record<string, Record<string, Permission>> = {
  '/dashboard/orders-payments': { 'bulk-codes': 'orders.manage' },
  '/dashboard/settings': {
    platform: 'settings.platform',
    security: 'settings.platform',
    payment: 'settings.platform',
    email: 'settings.platform',
    users: 'settings.platform',
    content: 'settings.platform',
    maintenance: 'settings.platform',
  },
};

/** The permission a page (and optional ?tab=) needs, or null if any signed-in admin may open it. */
export function permissionForPath(pathname: string, tab?: string | null): Permission | null {
  const tabPermission = tab ? TAB_PERMISSIONS[pathname]?.[tab] : undefined;
  if (tabPermission) return tabPermission;
  if (pathname === '/dashboard') return 'dashboard.view';
  const match = ROUTE_PERMISSIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return match ? match[1] : null; // settings (own account) and about are open to every admin
}

/** Whether a nav href (path plus optional ?tab=) is open to someone with these permissions. */
export function canOpenHref(href: string, can: (p: Permission) => boolean): boolean {
  const [path, query] = href.split('?');
  const permission = permissionForPath(path, new URLSearchParams(query || '').get('tab'));
  return permission === null || can(permission);
}

export const ROLE_BADGES: Record<ProductRole, { text: string; className: string }> = {
  super_admin: { text: 'Super Admin', className: 'bg-red-600 text-white hover:bg-red-600' },
  admin: { text: 'Admin', className: 'bg-blue-500 text-white hover:bg-blue-500' },
  sales: { text: 'Sales', className: 'bg-emerald-600 text-white hover:bg-emerald-600' },
};

// Stored Admin.role → product role (backend src/shared/auth/roles.ts):
// system_admin is the Super Admin, super_admin and admin are both Admin.
// Used for lists of other admins; the signed-in admin's own product role
// comes from the profile.
export function productRoleOf(storedRole: string | undefined | null): ProductRole | null {
  switch (storedRole) {
    case 'system_admin': return 'super_admin';
    case 'super_admin':
    case 'admin': return 'admin';
    case 'sales': return 'sales';
    default: return null;
  }
}
