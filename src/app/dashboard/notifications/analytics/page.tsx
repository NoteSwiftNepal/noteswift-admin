"use client";

// Notification analytics (Super Admin only): for every kind of notification
// sent to students, how many were sent, how many pushes reached Expo, how
// many students tapped them (and whether the app was closed, in the
// background or open), opened them from the Notifications list, and did a
// learning activity within 24 hours. Backend: GET /api/admin/notifications/analytics.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts";
import { Bell, BookOpen, Hand, Loader2, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PushCounts { targeted: number; accepted: number; failed: number; stale: number }
interface CategoryStats {
  category: string;
  sends: number;
  recipients: number;
  push: PushCounts;
  pushTaps: number;
  tapsBy: { cold: number; background: number; foreground: number; unknown: number };
  inboxOpens: number;
  studied: number;
  measuredRecipients: number;
}
interface DailyRow { day: string; recipients: number; pushAccepted: number; pushTaps: number; inboxOpens: number; studied: number; measuredRecipients: number }
interface Analytics { from: string; to: string; categories: CategoryStats[]; daily: DailyRow[]; untrackedInboxOpens: number }

// Display names and groups, in table order.
const CATEGORIES: { key: string; label: string; group: string }[] = [
  { key: "live_class_started", label: "Live class started", group: "Live classes" },
  { key: "live_class_reminder", label: "Live class starting soon", group: "Live classes" },
  { key: "live_class_no_join", label: "Haven't joined yet", group: "Live classes" },
  { key: "live_class_cancelled", label: "Live class cancelled", group: "Live classes" },
  { key: "new_content", label: "New video / notes / DPP", group: "Learning" },
  { key: "doubt_answered", label: "Doubt answered", group: "Learning" },
  { key: "streak_at_risk", label: "Streak ends tonight", group: "Streak reminders" },
  { key: "streak_away_2d", label: "Away 2 days", group: "Streak reminders" },
  { key: "streak_away_7d", label: "Away 7 days", group: "Streak reminders" },
  { key: "welcome_registration", label: "Welcome after sign-up", group: "Account & enrollment" },
  { key: "enrollment_welcome", label: "Course welcome", group: "Account & enrollment" },
  { key: "temporary_access", label: "Temporary access given", group: "Account & enrollment" },
  { key: "temporary_ending", label: "Temporary access ending", group: "Account & enrollment" },
  { key: "now_permanent", label: "Now permanently enrolled", group: "Account & enrollment" },
  { key: "trial_ended", label: "Free trial ended", group: "Account & enrollment" },
  { key: "admin_broadcast", label: "Admin broadcast", group: "Admin" },
];

const PRESETS = [7, 30, 90] as const;

const nptToday = () => new Date(Date.now() + (5 * 60 + 45) * 60 * 1000).toISOString().slice(0, 10);
const daysBefore = (day: string, n: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() - n * 86400000).toISOString().slice(0, 10);
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–");
const num = (n: number) => n.toLocaleString("en-IN");

export default function NotificationAnalyticsPage() {
  const { toast } = useToast();
  const [to, setTo] = useState(nptToday());
  const [from, setFrom] = useState(daysBefore(nptToday(), 29));
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);
    try {
      const { API_ENDPOINTS, createFetchOptions } = await import("@/config/api");
      const res = await fetch(`${API_ENDPOINTS.NOTIFICATIONS.ANALYTICS}?from=${f}&to=${t}`, createFetchOptions("GET"));
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || "Could not load notification analytics");
      setData(body.data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not load notification analytics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(from, to); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyPreset = (days: number) => {
    const t = nptToday();
    const f = daysBefore(t, days - 1);
    setTo(t);
    setFrom(f);
    void load(f, t);
  };

  const rows = useMemo(() => {
    const byKey = new Map((data?.categories || []).map((c) => [c.category, c]));
    return CATEGORIES.map((c) => ({ ...c, stats: byKey.get(c.key) })).filter((r) => r.stats);
  }, [data]);

  const totals = useMemo(() => {
    const t = { recipients: 0, accepted: 0, taps: 0, opens: 0, studied: 0, measured: 0, stale: 0 };
    for (const c of data?.categories || []) {
      t.recipients += c.recipients;
      t.accepted += c.push.accepted;
      t.taps += c.pushTaps;
      t.opens += c.inboxOpens;
      t.studied += c.studied;
      t.measured += c.measuredRecipients;
      t.stale += c.push.stale;
    }
    return t;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification analytics</h1>
          <p className="text-sm text-muted-foreground">Which notifications bring students back to the app and to learning.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {PRESETS.map((d) => (
            <Button key={d} type="button" variant="outline" size="sm" onClick={() => applyPreset(d)}>Last {d} days</Button>
          ))}
          <div className="grid gap-1">
            <Label htmlFor="na-from" className="text-xs">From</Label>
            <Input id="na-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="na-to" className="text-xs">To</Label>
            <Input id="na-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <Button type="button" size="sm" onClick={() => load(from, to)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Show
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<Bell className="h-4 w-4 text-blue-600" />} title="Notifications received" value={num(totals.recipients)} note="Students × notifications, in the app's list" />
        <SummaryCard icon={<Send className="h-4 w-4 text-blue-600" />} title="Pushes delivered to Expo" value={num(totals.accepted)} note={`${num(totals.stale)} dead tokens (app removed or notifications off)`} />
        <SummaryCard icon={<Hand className="h-4 w-4 text-blue-600" />} title="Push taps" value={num(totals.taps)} note={`${pct(totals.taps, totals.accepted)} of delivered pushes · ${num(totals.opens)} opened from the list`} />
        <SummaryCard icon={<BookOpen className="h-4 w-4 text-blue-600" />} title="Studied within 24 h" value={pct(totals.studied, totals.measured)} note={`${num(totals.studied)} of ${num(totals.measured)} measured`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">By notification type</CardTitle>
          <CardDescription>Taps are counted once per student and notification. &ldquo;Closed / background / open&rdquo; is how the app was when the push was tapped: closed means the notification brought the student back.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading && !data ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Sends</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Pushes delivered</TableHead>
                  <TableHead className="text-right">Tapped</TableHead>
                  <TableHead className="text-right">Tap rate</TableHead>
                  <TableHead className="text-right">Closed / background / open</TableHead>
                  <TableHead className="text-right">Opened from list</TableHead>
                  <TableHead className="text-right">Studied in 24 h</TableHead>
                  <TableHead className="text-right">Dead tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ key, label, group, stats }, i) => {
                  const s = stats!;
                  const newGroup = i === 0 || rows[i - 1].group !== group;
                  return (
                    <TableRow key={key} className={s.sends === 0 ? "text-muted-foreground" : undefined}>
                      <TableCell>
                        {newGroup && <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>}
                        <div className="font-medium">{label}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(s.sends)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(s.recipients)}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(s.push.accepted)}{s.push.failed > 0 && <span className="text-xs text-muted-foreground"> ({num(s.push.failed)} failed)</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(s.pushTaps)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{pct(s.pushTaps, s.push.accepted)}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.pushTaps ? `${s.tapsBy.cold} / ${s.tapsBy.background} / ${s.tapsBy.foreground}` : "–"}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(s.inboxOpens)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pct(s.studied, s.measuredRecipients)}
                        {s.measuredRecipients > 0 && <span className="text-xs text-muted-foreground"> ({num(s.studied)})</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(s.push.stale)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Day by day</CardTitle>
          <CardDescription>By the day the notifications were sent (Nepal time).</CardDescription>
        </CardHeader>
        <CardContent>
          {data && data.daily.length > 0 ? (
            <ChartContainer config={{}} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.daily} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={(d) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="pushAccepted" name="Pushes delivered" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pushTaps" name="Push taps" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="studied" name="Studied within 24 h" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">{loading ? "Loading…" : "No notifications were sent in this range."}</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1 text-xs text-muted-foreground">
        <p><strong>Pushes delivered</strong>: accepted by Expo for delivery to the phone. <strong>Dead tokens</strong>: phones where the app was removed or notifications were turned off; they are cleared and not counted again.</p>
        <p><strong>Tapped</strong> and <strong>opened from list</strong> come from app versions with notification analytics; older versions report nothing, so early numbers undercount.</p>
        <p><strong>Studied in 24 h</strong>: students who watched a video, opened notes or a DPP, submitted a test or assignment, or attended a live class within 24 hours of the notification. Students also study without notifications, so read it as a comparison between types, not as proof a notification caused it. Filled in a day after sending.</p>
        {data && data.untrackedInboxOpens > 0 && <p>{num(data.untrackedInboxOpens)} opens from the list were of older notifications sent before analytics, so they have no type.</p>}
      </div>
    </div>
  );
}

function SummaryCard({ icon, title, value, note }: { icon: React.ReactNode; title: string; value: string; note: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
