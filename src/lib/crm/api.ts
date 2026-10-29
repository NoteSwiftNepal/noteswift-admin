// Typed calls to the backend's Sales & CRM API (/api/admin/crm/*). The
// backend decides what each admin may see and do; these helpers only send
// requests and turn error responses into exceptions with the server's
// message (and, for blocked contacts, its reasons).
import { API_BASE_URL, createFetchOptions } from "@/config/api";

const CRM = `${API_BASE_URL}/api/admin/crm`;

export class CrmApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public reasons?: string[]) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${CRM}${path}`, { ...createFetchOptions(method, body), cache: "no-store" });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok || json?.success === false) {
    throw new CrmApiError(json?.error || `Request failed (${res.status})`, res.status, json?.code, json?.reasons);
  }
  return (json?.data ?? json) as T;
}

const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ---------- types (mirror the backend responses) ----------
export type Person = { name: string | null; phone: string | null; email: string | null; grade: number | null; school: string | null; district: string | null };
export type LeadStage = "new" | "contact_attempted" | "contacted" | "qualified";
export type LeadStatus = "active" | "nurture" | "lost";
export type InterestStage = "interested" | "contacted" | "qualified" | "quoted" | "payment_pending";
export type Channel = "call" | "whatsapp" | "sms" | "email";
export type Purpose = "purchase_assistance" | "enquiry_response" | "marketing";

export type LeadRow = {
  _id: string;
  kind: "student" | "prospect";
  person: Person;
  ownerId: string | null;
  ownerName: string | null;
  stage: LeadStage;
  status: LeadStatus;
  priority: "low" | "normal" | "high";
  doNotContact: boolean;
  interests: { _id: string; courseId: string; title: string; stage: InterestStage }[];
  lastSignalAt: string | null;
  openTasks: number;
  nextTaskDueAt: string | null;
  overdue: boolean;
  source?: string;
  createdAt?: string;
  possibleDuplicate?: boolean;
};
export type Pagination = { page: number; limit: number; total: number; pages: number };

export type Interest = {
  _id: string;
  courseId: string;
  title: string;
  listPrice: number | null;
  status: "open" | "closed";
  stage: InterestStage;
  outcome: "won" | "granted" | "lost" | null;
  lostReason: string | null;
  closedAt: string | null;
  origin: string;
  reopenedFromInterestId: string | null;
  signals: { lastViewedAt?: string; lastCheckoutAt?: string; viewCount?: number; checkoutCount?: number };
  enrolled: boolean;
  stageHistory: { from: string | null; to: string; at: string; note: string | null }[];
};

export type Task = {
  _id: string;
  leadId?: string;
  // Task list only (GET /crm/tasks): the lead's name and phone.
  leadName?: string | null;
  leadPhone?: string | null;
  interestId: string | null;
  type: string;
  channel: Channel | null;
  purpose: Purpose | null;
  dueAt: string;
  priority: "low" | "normal" | "high";
  status: "open" | "completed" | "cancelled";
  outcome: string | null;
  notes: string | null;
  cancelReason: string | null;
  assigneeName: string | null;
  overdue?: boolean;
  rescheduleCount?: number;
  rescheduleHistory?: { from: string; to: string; at: string; reason?: string }[];
};

export type Activity = {
  _id: string;
  type: string;
  direction: "inbound" | "outbound" | null;
  channel: string | null;
  purpose: Purpose | null;
  basis: { signalType: string; signalAt: string } | null;
  outcome: string | null;
  summary: string | null;
  interestId: string | null;
  isEnquiry: boolean;
  policyException: boolean;
  correctsActivityId: string | null;
  actorName: string;
  occurredAt: string;
};

export type LeadDetail = {
  _id: string;
  kind: "student" | "prospect";
  person: Person;
  enrollment: {
    enrolledCourses: { courseId: string; title: string }[];
    pendingCourseAssignments: { _id: string; courseId: string; title: string; assignedAt: string; fromThisLead: boolean }[];
  };
  ownerId: string | null;
  ownerName: string | null;
  stage: LeadStage;
  status: LeadStatus;
  lostReason: string | null;
  priority: "low" | "normal" | "high";
  nextActionAt: string | null;
  firstContactAt: string | null;
  lastContactAt: string | null;
  doNotContact: { flag: boolean; reason?: string | null; setAt?: string | null };
  channels: Record<Channel, boolean>;
  consent: { purpose: string; channel: Channel; status: "granted" | "withdrawn"; at: string; source: string | null }[];
  interests: Interest[];
  tasks: Task[];
  activities: { items: Activity[]; pagination: Pagination };
  // Admin / Super Admin only
  source?: string;
  createdAt?: string;
  createdByName?: string | null;
  linkedAt?: string | null;
  possibleDuplicateOfLeadId?: string | null;
  statusHistory?: { from?: string; to: string; reason?: string; at: string }[];
  assignmentHistory?: { from: string | null; to: string | null; by: string; method: string; reason: string | null; at: string }[];
};

export type PipelineCard = { interestId: string; leadId: string; name: string | null; courseTitle: string; listPrice: number | null; ownerName: string | null; lastSignalAt: string | null; overdue: boolean; doNotContact: boolean };
export type Pipeline = { stages: { stage: InterestStage; count: number; listPriceTotal: number; cards: PipelineCard[] }[] };

export type Rep = {
  _id: string;
  name: string;
  email: string;
  status: "active" | "invited" | "invite_expired" | "inactive";
  createdAt: string;
  lastLogin: string | null;
  profile: { isAvailable: boolean; capacity: number | null; activeLeadCount: number; grades: number[]; districts: string[]; courseIds: string[]; lastAssignedAt: string | null };
};

export type OutreachDecision = { allowed: boolean; reasons: string[]; basis: { signalType: string; signalAt: string } | null };

// ---------- calls ----------
export const crmApi = {
  listLeads: (params: Record<string, string | number | undefined>) => request<{ items: LeadRow[]; pagination: Pagination; view: string }>("GET", `/leads${qs(params)}`),
  getLead: (id: string) => request<LeadDetail>("GET", `/leads/${id}`),
  updateLead: (id: string, patch: Record<string, unknown>) => request("PATCH", `/leads/${id}`, patch),
  markLost: (id: string, reason: string) => request("POST", `/leads/${id}/lost`, { reason }),
  reopenLead: (id: string, reason: string) => request("POST", `/leads/${id}/reopen`, { reason }),
  setDoNotContact: (id: string, flag: boolean, reason: string) => request("POST", `/leads/${id}/do-not-contact`, { flag, reason }),
  recordConsent: (id: string, body: { purpose: string; channel: Channel; status: "granted" | "withdrawn"; source?: string }) => request("POST", `/leads/${id}/consent`, body),
  setChannel: (id: string, channel: Channel, enabled: boolean, reason: string) => request("POST", `/leads/${id}/channels`, { channel, enabled, reason }),
  createProspect: (body: Record<string, unknown>) => request<{ lead: { _id: string } }>("POST", `/prospects`, body),

  assign: (leadId: string, ownerId: string | null, reason?: string) => request("POST", `/leads/${leadId}/assign`, { ownerId, reason }),
  bulkAssign: (leadIds: string[], ownerId: string | null | "auto", reason?: string) =>
    request<{ results: { leadId: string; ok: boolean; error?: string }[]; assigned: number; failed: number }>("POST", `/leads/bulk-assign`, { leadIds, ownerId, reason }),

  addInterest: (leadId: string, courseId: string) => request("POST", `/leads/${leadId}/interests`, { courseId }),
  setStage: (interestId: string, to: InterestStage, expectedStage?: string, note?: string) => request("POST", `/interests/${interestId}/stage`, { to, expectedStage, note }),
  interestLost: (interestId: string, reason: string) => request("POST", `/interests/${interestId}/lost`, { reason }),
  interestReopen: (interestId: string, reason: string) => request("POST", `/interests/${interestId}/reopen`, { reason }),
  pipeline: (params: Record<string, string | undefined>) => request<Pipeline>("GET", `/pipeline${qs(params)}`),

  activities: (leadId: string, page = 1) => request<{ items: Activity[]; pagination: Pagination }>("GET", `/leads/${leadId}/activities${qs({ page })}`),
  logActivity: (leadId: string, body: Record<string, unknown>) => request("POST", `/leads/${leadId}/activities`, body),
  correctActivity: (activityId: string, summary: string) => request("POST", `/activities/${activityId}/correct`, { summary }),

  tasks: (params: Record<string, string | number | undefined>) => request<{ items: Task[]; pagination: Pagination }>("GET", `/tasks${qs(params)}`),
  createTask: (leadId: string, body: Record<string, unknown>) => request<Task>("POST", `/leads/${leadId}/tasks`, body),
  completeTask: (taskId: string, outcome: string, notes?: string) => request("POST", `/tasks/${taskId}/complete`, { outcome, notes }),
  cancelTask: (taskId: string, reason: string) => request("POST", `/tasks/${taskId}/cancel`, { reason }),
  rescheduleTask: (taskId: string, dueAt: string, reason?: string, expectedDueAt?: string) => request("POST", `/tasks/${taskId}/reschedule`, { dueAt, reason, expectedDueAt }),

  outreachCheck: (leadId: string, body: { purpose: Purpose; channel: Channel; interestId?: string }) => request<OutreachDecision>("POST", `/leads/${leadId}/outreach/check`, body),
  outreachStart: (leadId: string, body: { purpose: Purpose; channel: Channel; interestId?: string }) =>
    request<{ attemptId: string; link?: string }>("POST", `/leads/${leadId}/outreach/start`, body),
  outreachOutcome: (attemptId: string, outcome: string, summary?: string) => request("POST", `/outreach/${attemptId}/outcome`, { outcome, summary }),

  assignCourse: (leadId: string, courseId: string, note?: string) => request("POST", `/leads/${leadId}/course-assignments`, { courseId, note }),
  cancelCourseAssignment: (assignmentId: string, reason: string) => request("POST", `/course-assignments/${assignmentId}/cancel`, { reason }),

  reps: () => request<Rep[]>("GET", `/reps`),
  inviteRep: (email: string, message?: string) => request<{ emailSent: boolean; invitationUrl: string; message: string }>("POST", `/reps/invite`, { email, message }),
  updateRepProfile: (adminId: string, body: Record<string, unknown>) => request("PUT", `/reps/${adminId}/profile`, body),
  deactivateRep: (adminId: string, reason: string, reassignTo?: string | null) => request<{ leadsMoved: number }>("POST", `/reps/${adminId}/deactivate`, { reason, reassignTo }),

  // Phase 4: quotes, codes, payments
  quotes: (leadId: string) => request<Quote[]>("GET", `/leads/${leadId}/quotes`),
  createQuote: (interestId: string, body: { applyCourseDiscount?: boolean; discountCode?: string; note?: string; validDays?: number }) =>
    request<Quote>("POST", `/interests/${interestId}/quotes`, body),
  decideQuote: (quoteId: string, approve: boolean, note?: string) => request<Quote>("POST", `/quotes/${quoteId}/decision`, { approve, note }),
  cancelQuote: (quoteId: string, reason: string) => request<Quote>("POST", `/quotes/${quoteId}/cancel`, { reason }),
  pendingQuotes: () => request<Quote[]>("GET", `/quotes/pending`),
  codesForAllocation: (params: { courseId?: string; allocatedTo?: string }) => request<CodeRow[]>("GET", `/codes${qs(params)}`),
  allocateCodes: (codeIds: string[], toAdminId: string, reason?: string) =>
    request<{ allocated: string[]; skipped: { codeId: string; reason: string }[] }>("POST", `/codes/allocate`, { codeIds, toAdminId, reason }),
  revokeCode: (codeId: string, reason: string) => request("POST", `/codes/${codeId}/revoke`, { reason }),
  myCodes: (courseId?: string) => request<CodeRow[]>("GET", `/my-codes${qs({ courseId })}`),
  enrollWithCode: (leadId: string, codeId: string) => request<{ enrollmentId: string; courseId: string }>("POST", `/leads/${leadId}/enroll-with-code`, { codeId }),
  payments: (leadId: string) => request<LeadPayment[]>("GET", `/leads/${leadId}/payments`),
};

export type QuoteStatus = "pending_approval" | "active" | "rejected" | "cancelled" | "superseded" | "expired";
export type Quote = {
  _id: string;
  leadId: string;
  interestId: string;
  courseId: string;
  applyCourseDiscount: boolean;
  discountCode?: string;
  price: { listPrice: number; courseDiscountAmount: number; codeDiscountAmount: number; totalDiscount: number; total: number; vatRate: number; vatAmount: number };
  discountPercent: number;
  approval: { required: boolean; limitPercent: number; decidedAt?: string; note?: string };
  status: QuoteStatus;
  expiresAt: string;
  note?: string;
  createdAt: string;
  history: { from?: string; to: string; at: string; note?: string }[];
  createdById: string;
  // Whether you may approve or reject it (never your own quote, R18). The backend re-checks.
  canDecide?: boolean;
};
export type CodeRow = {
  _id: string;
  last4: string | null;
  courseId: string;
  courseTitle?: string;
  kind: "prepaid_batch" | "single_sale";
  expiresOn?: string;
  isUsed: boolean;
  allocatedToAdminId?: string | null;
  allocatedAt?: string;
};
export type LeadPayment = {
  _id: string;
  courseId: string;
  courseTitle?: string;
  status: string;
  path: "online" | "single_code" | "bulk_codes" | "direct_grant" | "other_offline";
  kind: "qualifying" | "complimentary" | "bulk" | "invalidated" | "not_applicable";
  countsAsSale: boolean;
  date: string;
  creditedToMe: boolean;
  invalidated: boolean;
  // Admin and Super Admin only:
  amount?: number;
  paymentMethod?: string;
  creditedToAdminId?: string | null;
  creditReason?: string;
  duplicatePaymentOf?: string;
  invalidation?: { at: string; byName?: string; reason: string };
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  pending_approval: "Waiting for approval",
  active: "Active",
  rejected: "Rejected",
  cancelled: "Cancelled",
  superseded: "Replaced",
  expired: "Expired",
};
export const PAYMENT_PATH_LABELS: Record<LeadPayment["path"], string> = {
  online: "Online payment",
  single_code: "Code from a recorded sale",
  bulk_codes: "Prepaid organization code",
  direct_grant: "Enrolled by a Super Admin",
  other_offline: "Recorded payment",
};

/** Course titles and prices (courses.view_catalog). */
export async function fetchCourseCatalog(): Promise<{ _id: string; title: string; price?: number }[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/admin/courses`, createFetchOptions("GET"));
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) return [];
  return json.data || [];
}

// ---------- labels ----------
export const LEAD_STAGE_LABELS: Record<LeadStage, string> = { new: "New", contact_attempted: "Contact attempted", contacted: "Contacted", qualified: "Qualified" };
export const INTEREST_STAGE_LABELS: Record<InterestStage, string> = { interested: "Interested", contacted: "Contacted", qualified: "Qualified", quoted: "Quoted", payment_pending: "Payment pending" };
export const PURPOSE_LABELS: Record<Purpose, string> = { purchase_assistance: "Help with a course", enquiry_response: "Reply to enquiry", marketing: "Marketing" };
export const CHANNEL_LABELS: Record<Channel, string> = { call: "Call", whatsapp: "WhatsApp", sms: "SMS", email: "Email" };
export const OUTCOME_LABELS: Record<string, string> = {
  connected: "Connected",
  no_answer: "No answer",
  busy: "Busy",
  wrong_number: "Wrong number",
  message_sent: "Message sent",
  declined: "Not interested",
  asked_not_to_contact: "Asked not to be contacted",
  other: "Other",
};
export const TASK_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  meeting: "Meeting",
  follow_up: "Follow-up",
  payment_reminder: "Payment reminder",
  send_course_info: "Send course info",
  other: "Other",
};

export const timeAgo = (iso?: string | null) => {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
};
export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const rs = (n?: number | null) => (n == null ? "—" : `Rs. ${Number(n).toLocaleString("en-IN")}`);
