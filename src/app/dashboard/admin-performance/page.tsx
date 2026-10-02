'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowLeft, ArrowUp, Download, RefreshCw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { cn } from "@/lib/utils";
import { AdminPerformanceDetail } from "@/components/admin/admin-performance-detail";

type Role = 'system_admin' | 'super_admin' | 'admin';

interface AdminRow {
  _id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLogin: string | null;
  codesGenerated: number;
  codesUsed: number;
  codesUnused: number;
  codesExpired: number;
  directEnrollments: number;
  redemptionRate: number;
  transactions: number;
  paymentCollected: number;
  studentsConverted: number;
  lastActivity: string | null;
}

interface PerformanceData {
  period: string;
  summary: {
    totalAdmins: number;
    activeAdmins: number;
    codesGenerated: number;
    codesUsed: number;
    codesUnused: number;
    codesExpired: number;
    redemptionRate: number;
    paymentCollected: number;
    transactions: number;
    studentsConverted: number;
    directEnrollments: number;
    gateway: { transactions: number; collected: number };
  };
  admins: AdminRow[];
}

type SortKey = 'name' | 'paymentCollected' | 'studentsConverted' | 'codesUsed' | 'redemptionRate' | 'lastActivity';

const ROLE_LABEL: Record<Role, string> = {
  system_admin: 'System Admin',
  super_admin: 'Super Admin',
  admin: 'Admin',
};

const PERIODS = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'all', label: 'All time' },
];

const formatCurrency = (amount: number) => `Rs. ${(Number(amount) || 0).toLocaleString('en-IN')}`;

const formatDate = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never';

const ADMIN_NUMBERS = ['codesGenerated', 'codesUsed', 'codesUnused', 'codesExpired', 'directEnrollments', 'redemptionRate', 'transactions', 'paymentCollected', 'studentsConverted'] as const;
const SUMMARY_NUMBERS = ['totalAdmins', 'activeAdmins', 'codesGenerated', 'codesUsed', 'codesUnused', 'codesExpired', 'redemptionRate', 'paymentCollected', 'transactions', 'studentsConverted', 'directEnrollments'] as const;

// Default every number to 0 so an older/partial backend response renders instead of crashing
const normalize = (raw: any): PerformanceData => {
  const toNumbers = (obj: any, keys: readonly string[]) =>
    Object.fromEntries(keys.map((k) => [k, Number(obj?.[k]) || 0]));
  return {
    period: raw?.period ?? 'all',
    summary: {
      ...raw?.summary,
      ...toNumbers(raw?.summary, SUMMARY_NUMBERS),
      gateway: {
        transactions: Number(raw?.summary?.gateway?.transactions) || 0,
        collected: Number(raw?.summary?.gateway?.collected) || 0,
      },
    },
    admins: (Array.isArray(raw?.admins) ? raw.admins : []).map((a: any) => ({ ...a, ...toNumbers(a, ADMIN_NUMBERS) })),
  };
};

const hasActivity =(a: AdminRow) => a.codesGenerated > 0 || a.transactions > 0;

function RoleTag({ role }: { role: Role }) {
  return (
    <span className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
      {ROLE_LABEL[role] || role}
    </span>
  );
}

function StatStrip({ stats }: { stats: { label: string; value: string | number; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-white px-5 py-4">
          <p className="text-sm text-gray-500">{s.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{s.value}</p>
          {s.hint && <p className="mt-1 text-xs text-gray-500">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export default function AdminPerformancePage() {
  const { toast } = useToast();
  const { admin } = useAdmin();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [showIdle, setShowIdle] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('paymentCollected');
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('all');

  const [refreshKey, setRefreshKey] = useState(0);
  // Only the latest request may write state (rapid period switches can resolve out of order)
  const latestRequest = useRef(0);

  const fetchData = async (selectedPeriod = period) => {
    const requestId = ++latestRequest.current;
    try {
      setRefreshing(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(`${API_ENDPOINTS.ADMINS.PERFORMANCE}?period=${selectedPeriod}`, createFetchOptions('GET'));
      const result = await response.json();
      if (requestId !== latestRequest.current) return;
      if (!response.ok || !result.success) throw new Error(result.message || 'Request failed');
      setData(normalize(result.data));
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      console.error('Failed to fetch admin performance:', error);
      toast({ title: "Error", description: "Failed to load admin performance", variant: "destructive" });
    } finally {
      if (requestId === latestRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchData();
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    if (admin && admin.role !== 'admin') fetchData();
  }, [admin]);

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    fetchData(value);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc(!sortDesc);
    else {
      setSortKey(key);
      setSortDesc(key !== 'name');
    }
  };

  const { activeRows, idleRows } = useMemo(() => {
    if (!data) return { activeRows: [], idleRows: [] };
    const term = search.trim().toLowerCase();
    const filtered = data.admins.filter((a) =>
      (roleFilter === 'all' || a.role === roleFilter) &&
      (!term || a.name?.toLowerCase().includes(term) || a.email?.toLowerCase().includes(term))
    );
    const value = (a: AdminRow) =>
      sortKey === 'name' ? (a.name || '').toLowerCase()
        : sortKey === 'lastActivity' ? (a.lastActivity ? new Date(a.lastActivity).getTime() : 0)
          : a[sortKey];
    const sorted = [...filtered].sort((x, y) => {
      const vx = value(x), vy = value(y);
      const cmp = vx < vy ? -1 : vx > vy ? 1 : 0;
      return sortDesc ? -cmp : cmp;
    });
    return { activeRows: sorted.filter(hasActivity), idleRows: sorted.filter((a) => !hasActivity(a)) };
  }, [data, search, roleFilter, sortKey, sortDesc]);

  const rows = showIdle ? [...activeRows, ...idleRows] : activeRows;

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Role', 'Payment Collected', 'Transactions', 'Students Converted', 'Direct Enrollments', 'Codes Generated', 'Codes Used', 'Codes Unused', 'Codes Expired', 'Redemption Rate (%)', 'Last Activity', 'Last Login'];
    const csvRows = [...activeRows, ...idleRows].map((a) => [
      a.name, a.email, ROLE_LABEL[a.role] || a.role, a.paymentCollected, a.transactions, a.studentsConverted,
      a.directEnrollments, a.codesGenerated, a.codesUsed, a.codesUnused, a.codesExpired, a.redemptionRate,
      a.lastActivity || '', a.lastLogin || '',
    ]);
    const csv = [headers, ...csvRows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-performance-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Layout already redirects normal admins away; render nothing in the meantime
  if (!admin || admin.role === 'admin') return null;

  const selected = data?.admins.find((a) => a._id === selectedAdminId);

  const header = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Admin Performance</h1>
        <p className="mt-1 text-sm text-gray-500">Sales, codes and student conversions by admin</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedAdminId} onValueChange={setSelectedAdminId} disabled={!data}>
          <SelectTrigger className="h-9 w-52">
            <SelectValue placeholder="All admins" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All admins</SelectItem>
            {data?.admins.map((a) => (
              <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePeriodChange(p.value)}
              className={cn(
                "h-full rounded px-3 text-sm transition-colors",
                period === p.value ? "bg-white font-medium text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh">
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
        {!selected && (
          <Button variant="outline" className="h-9" onClick={handleExport} disabled={!data}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Skeleton className="h-[104px] w-full rounded-xl" />
        <div className="space-y-2 rounded-xl border border-gray-200 p-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="rounded-xl border border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-500">Couldn't load admin performance.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => fetchData()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-6">
        {header}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={() => setSelectedAdminId('all')}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> All admins
          </button>
          <span className="text-gray-300">/</span>
          <span className="font-medium text-gray-900">{selected.name}</span>
          <RoleTag role={selected.role} />
          <span className="text-sm text-gray-500">{selected.email}</span>
        </div>

        <StatStrip
          stats={[
            { label: 'Collected', value: formatCurrency(selected.paymentCollected), hint: `${selected.transactions} transactions` },
            { label: 'Students converted', value: selected.studentsConverted, hint: `${selected.directEnrollments} by direct enrollment` },
            { label: 'Codes generated', value: selected.codesGenerated, hint: `${selected.codesUsed} used, ${selected.codesUnused} unused, ${selected.codesExpired} expired` },
            { label: 'Last activity', value: formatDate(selected.lastActivity), hint: `Last login ${formatDate(selected.lastLogin)}` },
          ]}
        />

        <AdminPerformanceDetail adminId={selected._id} period={period} refreshKey={refreshKey} onAmountUpdated={() => fetchData()} />
      </div>
    );
  }

  const { summary } = data;

  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn("inline-flex items-center gap-1 hover:text-gray-900", sortKey === k && "text-gray-900")}
      >
        {label}
        {sortKey === k && (sortDesc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-6">
      {header}

      <StatStrip
        stats={[
          { label: 'Collected by admins', value: formatCurrency(summary.paymentCollected), hint: `${summary.transactions} transactions` },
          { label: 'Students converted', value: summary.studentsConverted, hint: `${summary.directEnrollments} by direct enrollment` },
          { label: 'Codes generated', value: summary.codesGenerated, hint: `${summary.codesUsed} used (${summary.redemptionRate}%)` },
          { label: 'Online payments', value: formatCurrency(summary.gateway.collected), hint: `${summary.gateway.transactions} via gateway, no admin` },
        ]}
      />

      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            {summary.activeAdmins} of {summary.totalAdmins} admins active. Select one to see their transactions.
          </p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                aria-label="Search admins"
                placeholder="Search admins"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 pl-8"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as 'all' | Role)}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="system_admin">System Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHead k="name" label="Admin" className="pl-4" />
                <SortHead k="paymentCollected" label="Collected" className="text-right" />
                <SortHead k="studentsConverted" label="Students" className="text-right" />
                <SortHead k="codesUsed" label="Codes used" className="text-right" />
                <SortHead k="redemptionRate" label="Redemption" className="text-right" />
                <SortHead k="lastActivity" label="Last activity" className="pr-4 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-gray-500">
                    {search || roleFilter !== 'all' ? 'No admins match your filters.' : 'No admin activity in this period.'}
                  </TableCell>
                </TableRow>
              ) : rows.map((a) => (
                <TableRow
                  key={a._id}
                  onClick={() => setSelectedAdminId(a._id)}
                  className={cn("cursor-pointer", !a.isActive && "opacity-50")}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{a.name}</span>
                      <RoleTag role={a.role} />
                    </div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-gray-900">
                    {formatCurrency(a.paymentCollected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{a.studentsConverted}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.codesGenerated ? (
                      <>
                        {a.codesUsed}
                        <span className="text-gray-400"> / {a.codesGenerated}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-gray-600">
                    {a.codesGenerated ? `${a.redemptionRate}%` : <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="pr-4 text-right text-sm text-gray-500">{formatDate(a.lastActivity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {idleRows.length > 0 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setShowIdle(!showIdle)}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              {showIdle ? 'Hide admins with no activity' : `Show ${idleRows.length} admins with no activity`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
