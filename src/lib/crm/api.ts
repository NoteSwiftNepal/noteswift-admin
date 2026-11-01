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
export type Person = {
  name: string | null;
  phone: string | null;
  email: string | null;
  grade: number | null;
  school: string | null;
  district: string | null;
  // R34 / R40: the CRM's guardian fields, or (instead) the linked parent account, read-only.
  guardianName?: string | null;
  guardianPhone?: string | null;
  linkedParent?: { name: string | null; phone: string | null };
  linkedParents?: { name: string | null; phone: string | null }[];
};
export type LeadStage = "new" | "contacted"; // the contact stage (R61, S8)
// R61 (S8): the six stages every lead is in, derived by the server.
export type Stage = "new_lead" | "contacted" | "interested" | "temporary" | "payment_pending" | "enrolled" | "lost";
export type LeadStatus = "active" | "nurture" | "lost";
export type InterestStage = "interested" | "payment_pending";
export type Channel = "call" | "whatsapp" | "sms" | "email";
export type Purpose = "purchase_assistance" | "enquiry_response" | "marketing";

export type LeadRow = {
  _id: string;
  kind: "student" | "prospect";
  person: Person;
  ownerId: string | null;
  ownerName: string | null;
  status: LeadStatus;
  stage: Stage;
  /** R72: Temporary enrollment with every temporary course frozen. */
  frozen?: boolean;
  courseTitle: string | null;
  moreCourses: number;
  doNotContact: boolean;
  openTasks: number;
  nextTaskDueAt: string | null;
  overdue: boolean;
  source?: string;
  manualSource?: ManualSource | null;
  createdAt?: string;
};
export type ManualSource = "school_visit" | "referral" | "facebook_ad" | "walk_in" | "phone_enquiry" | "other";
export type LeadView = "all" | "mine" | "new" | "contacted" | "interested" | "temporary" | "payment_pending" | "enrolled" | "lost" | "unassigned";
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

// R67 (S8b): one entry per course on the lead, the most advanced state first.
export type LeadCourseState = "enrolled" | "payment_pending" | "temporary" | "temporary_frozen" | "interested" | "trial" | "visited";
// R72 (S10): a temporary course carries its enrollment and what the viewer may do.
export type LeadCourse = { courseId: string; title: string; state: LeadCourseState; since: string | null; assignmentId?: string; canCancel: boolean; enrollmentId?: string; canFreeze?: boolean; canUnfreeze?: boolean };

export type StageOption = { to: Stage; allowed: boolean; reason?: string };

export type LeadDetail = {
  _id: string;
  kind: "student" | "prospect";
  person: Person;
  isCustomer: boolean;
  stage: Stage;
  /** R72: Temporary enrollment with every temporary course frozen. */
  frozen?: boolean;
  contactStage: LeadStage;
  saleWaiting: boolean;
  /** R73: the unpaid postpaid bill; Record sale adds its payment. */
  unpaidBill: { _id: string; courseId: string | null; amount: number } | null;
  courseTitle: string | null;
  courses: LeadCourse[];
  /** R70: what the stage dropdown offers, decided by the server. */
  stageOptions: StageOption[];
  enrollment: {
    enrolledCourses: { courseId: string; title: string }[];
    pendingCourseAssignments: { _id: string; courseId: string; title: string; assignedAt: string; fromThisLead: boolean }[];
  };
  ownerId: string | null;
  ownerName: string | null;
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
  manualSource?: ManualSource | null;
  createdAt?: string;
  createdByName?: string | null;
  linkedAt?: string | null;
  possibleDuplicateOfLeadId?: string | null;
  statusHistory?: { from?: string; to: string; reason?: string; at: string }[];
  assignmentHistory?: { from: string | null; to: string | null; by: string; method: string; reason: string | null; at: string }[];
};


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
  /** S1b: the count of every list view, same scope and filters (one request). */
  leadCounts: (params: Record<string, string | number | undefined>) => request<Partial<Record<LeadView, number>>>("GET", `/leads/counts${qs(params)}`),
  getLead: (id: string) => request<LeadDetail>("GET", `/leads/${id}`),
  updateLead: (id: string, patch: Record<string, unknown>) => request("PATCH", `/leads/${id}`, patch),
  /** R63 (S8): the only manual stage moves, forward only. */
  // R70 (S9): the stage dropdown. Record sale stays its own call.
  moveStage: (
    id: string,
    body: { to: "new_lead" | "contacted" } | { to: "interested"; courseId: string } | { to: "payment_pending"; mode: "later"; courseId: string; note?: string } | { to: "lost"; reason: string } | { to: "temporary"; courseId: string; reason?: string }
  ) => request<{ stage: Stage; changed: boolean; opportunitiesClosed?: number; interestId?: string; assignmentId?: string; enrollmentId?: string }>("POST", `/leads/${id}/stage`, body),
  // R72 / R73: pause or resume the temporary access of a postpaid bill.
  freezeTemporary: (id: string, enrollmentId: string, reason?: string) => request<{ frozen: boolean; changed: boolean }>("POST", `/leads/${id}/temporary-enrollments/${enrollmentId}/freeze`, { reason }),
  unfreezeTemporary: (id: string, enrollmentId: string) => request<{ frozen: boolean; changed: boolean }>("POST", `/leads/${id}/temporary-enrollments/${enrollmentId}/unfreeze`),
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
  interestLost: (interestId: string, reason: string) => request("POST", `/interests/${interestId}/lost`, { reason }),
  interestReopen: (interestId: string, reason: string) => request("POST", `/interests/${interestId}/reopen`, { reason }),

  activities: (leadId: string, page = 1) => request<{ items: Activity[]; pagination: Pagination }>("GET", `/leads/${leadId}/activities${qs({ page })}`),
  logActivity: (leadId: string, body: Record<string, unknown>) => request("POST", `/leads/${leadId}/activities`, body),
  correctActivity: (activityId: string, summary: string) => request("POST", `/activities/${activityId}/correct`, { summary }),

  tasks: (params: Record<string, string | number | undefined>) => request<{ items: Task[]; pagination: Pagination }>("GET", `/tasks${qs(params)}`),
  createTask: (leadId: string, body: Record<string, unknown>) => request<Task>("POST", `/leads/${leadId}/tasks`, body),
  // R75: one open follow-up per lead; a second is an edit of the first.
  updateTask: (taskId: string, body: Record<string, unknown>) => request<Task>("PATCH", `/tasks/${taskId}`, body),
  completeTask: (taskId: string, outcome: string, notes?: string) => request("POST", `/tasks/${taskId}/complete`, { outcome, notes }),
  cancelTask: (taskId: string, reason: string) => request("POST", `/tasks/${taskId}/cancel`, { reason }),
  rescheduleTask: (taskId: string, dueAt: string, reason?: string, expectedDueAt?: string) => request("POST", `/tasks/${taskId}/reschedule`, { dueAt, reason, expectedDueAt }),

  // S8: the server chooses the purpose; only the channel is sent.
  outreachCheck: (leadId: string, body: { channel: Channel }) => request<OutreachDecision>("POST", `/leads/${leadId}/outreach/check`, body),
  outreachStart: (leadId: string, body: { channel: Channel }) =>
    request<{ attemptId: string; link?: string }>("POST", `/leads/${leadId}/outreach/start`, body),
  outreachOutcome: (attemptId: string, outcome: string, summary?: string) => request("POST", `/outreach/${attemptId}/outcome`, { outcome, summary }),

  // R67 (S8b): Assign course from the drawer, and cancelling a Payment pending one.
  assignCourse: (leadId: string, body: { courseId: string; mode: "interested" | "payment_pending"; note?: string }) => request<{ mode: string; created: boolean; assignmentId?: string; interestId?: string }>("POST", `/leads/${leadId}/courses`, body),
  cancelLeadCourse: (leadId: string, assignmentId: string, reason: string) => request("POST", `/leads/${leadId}/courses/${assignmentId}/cancel`, { reason }),

  reps: () => request<Rep[]>("GET", `/reps`),
  inviteRep: (email: string, message?: string) => request<{ emailSent: boolean; invitationUrl: string; message: string }>("POST", `/reps/invite`, { email, message }),
  updateRepProfile: (adminId: string, body: Record<string, unknown>) => request("PUT", `/reps/${adminId}/profile`, body),
  deactivateRep: (adminId: string, reason: string, reassignTo?: string | null) => request<{ leadsMoved: number }>("POST", `/reps/${adminId}/deactivate`, { reason, reassignTo }),

  // Phase 4: codes and payments (quotes removed in S8, R62)
  codesForAllocation: (params: { courseId?: string; allocatedTo?: string }) => request<CodeRow[]>("GET", `/codes${qs(params)}`),
  allocateCodes: (codeIds: string[], toAdminId: string, reason?: string) =>
    request<{ allocated: string[]; skipped: { codeId: string; reason: string }[] }>("POST", `/codes/allocate`, { codeIds, toAdminId, reason }),
  revokeCode: (codeId: string, reason: string) => request("POST", `/codes/${codeId}/revoke`, { reason }),
  myCodes: (courseId?: string) => request<CodeRow[]>("GET", `/my-codes${qs({ courseId })}`),
  enrollWithCode: (leadId: string, codeId: string) => request<{ enrollmentId: string; courseId: string }>("POST", `/leads/${leadId}/enroll-with-code`, { codeId }),
  payments: (leadId: string) => request<LeadPayment[]>("GET", `/leads/${leadId}/payments`),

  // Phase S2 / S3: Sales-recorded payments and Sales & Bills
  paymentPreview: (leadId: string, q: { courseId?: string; interestId?: string; discount?: number | string }) => request<PaymentPreview>("GET", `/leads/${leadId}/payments/preview${qs(q)}`),
  setPaymentCourse: (id: string, courseId: string, discount?: number) => request<SalesPayment>("PATCH", `/payments/${id}/course`, { courseId, discount }),
  recordPayment: (leadId: string, form: FormData) => requestForm<SalesPayment>("POST", `/leads/${leadId}/payments`, form),
  // R73: the student paid a postpaid bill.
  recordPostpaidPayment: (paymentId: string, form: FormData) => requestForm<SalesPayment>("POST", `/payments/${paymentId}/record-payment`, form),
  confirmPayment: (id: string, expectedAmount: number) => request<SalesPayment>("POST", `/payments/${id}/confirm`, { checked: true, expectedAmount }),
  rejectPayment: (id: string, reason: string) => request<SalesPayment>("POST", `/payments/${id}/reject`, { reason }),
  cancelPayment: (id: string, reason: string) => request<SalesPayment>("POST", `/payments/${id}/cancel`, { reason }),
  screenshotLink: (id: string) => request<{ url: string; expiresInSeconds: number; contentType: string }>("GET", `/payments/${id}/screenshot`),
  bills: (params: Record<string, string | number | undefined>) => request<{ items: BillRow[]; pagination: Pagination; tab: BillTab }>("GET", `/payments${qs(params)}`),
  billCounts: (params: Record<string, string | number | undefined> = {}) => request<Record<BillTab, number>>("GET", `/payments/counts${qs(params)}`),
  billSummary: (params: Record<string, string | number | undefined> = {}) => request<{ items: BillSummaryItem[] }>("GET", `/payments/summary${qs(params)}`),
  bill: (id: string) => request<Bill>("GET", `/payments/${id}/bill`),
  // Phase S4 / S5: targets, salaries, month close, dashboard
  dashboard: (month?: string) => request<Dashboard>("GET", `/dashboard${qs({ month })}`),
  targets: (month?: string) => request<TargetsView>("GET", `/targets${qs({ month })}`),
  targetMonths: () => request<MonthInfo[]>("GET", `/targets/months`),
  targetSales: (adminId: string, month?: string) => request<TargetSales>("GET", `/targets/${adminId}/sales${qs({ month })}`),
  closeMonth: (year: number, month: number) => request<{ month: MonthInfo; statements: number }>("POST", `/targets/months/${year}/${month}/close`),
  salaryHistory: (adminId: string) => request<SalaryHistory>("GET", `/reps/${adminId}/salary-history`),
  mySalaryHistory: () => request<SalaryHistory>("GET", `/me/salary-history`),
  setSalary: (adminId: string, body: { amount: number; reason: string; expectedCurrentAmount: number | null }) => request<unknown>("PUT", `/reps/${adminId}/salary`, body),
  /** CRM settings (Super Admin); the endpoint answers { settings }. */
  settings: async () => ((await request<any>("GET", `/settings`)).settings as { targets: TargetSchedule; maxDiscountPercent: number }),
  /** R57 / R62: recorded-sale discounts above this are flagged for approval (applies at once). */
  updateMaxDiscount: async (maxDiscountPercent: number) => ((await request<any>("PUT", `/settings`, { maxDiscountPercent })).settings as { maxDiscountPercent: number }),
  updateTargetRules: async (targets: Partial<TargetRules>) => ((await request<any>("PUT", `/settings`, { targets })).settings as { targets: TargetSchedule }),
  /** Downloads the PDF receipt (R46) and saves it with the server's file name. */
  downloadReceipt: async (id: string) => {
    const res = await fetch(`${CRM}/payments/${id}/receipt.pdf`, { ...createFetchOptions("GET"), cache: "no-store" });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new CrmApiError(json?.error || `Request failed (${res.status})`, res.status, json?.code);
    }
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") || "")?.[1] || "NoteSwift-receipt.pdf";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

/** Multipart request (no JSON content type, so the browser sets the boundary). */
async function requestForm<T>(method: string, path: string, form: FormData): Promise<T> {
  const options = createFetchOptions(method);
  const headers = { ...(options.headers as Record<string, string>) };
  delete headers["Content-Type"];
  const res = await fetch(`${CRM}${path}`, { ...options, headers, body: form, cache: "no-store" });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok || json?.success === false) throw new CrmApiError(json?.error || `Request failed (${res.status})`, res.status, json?.code, json?.reasons);
  return (json?.data ?? json) as T;
}

export type PriceSnapshot = { listPrice: number; courseDiscountPercent: number; courseDiscountAmount: number; discountCode?: string; codeDiscountPercent: number; codeDiscountAmount: number; totalDiscount: number; total: number; vatRate: number; taxableAmount: number; vatAmount: number };
// R57 (S7): the server's price for a recorded sale.
export type SalePrice = { listPrice: number; publicDiscount: number; discount: number; discountPercent: number; total: number; vatRate: number; taxableAmount: number; vatAmount: number; limitPercent: number; needsApproval: boolean };
export type PaymentPreview = { canRecord: boolean; reason: string | null; code: string | null; courseId: string | null; interestId: string | null; unconfirmed: boolean; price: SalePrice | null; needsApproval: boolean };
export type SaleDiscount = { amount: number; percent: number; limitPercent: number; needsApproval: boolean; approved: boolean };
export type SalesPayment = { _id: string; status: string; amount: number; method: string; reference: string | null; hasScreenshot: boolean; receivedAt: string | null; receiptNumber: string | null; courseId: string | null; courseUnconfirmed: boolean; amountReceived: number | null; discount: { amount: number; percent: number; needsApproval: boolean } | null };
export type BillTab = "waiting" | "confirmed" | "rejected" | "cancelled" | "all";
export type BillType = "prepaid" | "postpaid";
export type BillStatus = "unpaid" | "waiting" | "confirmed" | "rejected" | "cancelled" | "invalid" | "other";
export type BillRow = {
  billType: BillType | null;
  _id: string;
  date: string;
  receivedAt: string | null;
  receiptNumber: string | null;
  studentName: string;
  leadId: string | null;
  courseTitle: string;
  courseId: string | null;
  courseUnconfirmed: boolean;
  path: string;
  pathLabel: string;
  method: string;
  methodLabel: string;
  amount: number;
  pricing: { listPrice: number; totalDiscount: number; discountCode: string | null; vatRate: number; vatAmount: number; total: number } | null;
  discount: SaleDiscount | null;
  amountReceived: number | null;
  amountMismatch: boolean;
  recordedByName: string | null;
  creditOwnerName: string | null;
  creditedToName: string | null;
  status: BillStatus;
  statusLabel: string;
  invalidated: boolean;
  organization: boolean;
  canConfirm: boolean;
  canReject: boolean;
  canCancel: boolean;
  canDownloadPdf: boolean;
  canViewScreenshot: boolean;
};
export type BillSummaryItem = { key: string; label: string; includes: string; total?: number; count: number; tone?: "good" | "warn" | "bad" };
export type Bill = {
  seller: { name: string; address: string; vatNumber: string };
  status: BillStatus;
  statusLabel: string;
  receiptNumber: string | null;
  receiptNote: string | null;
  student: { name: string; phone: string | null };
  leadId: string | null;
  course: string;
  items: { label: string; amount: number }[];
  totals: { taxableAmount: number | null; vatRate: number | null; vatAmount: number | null; total: number; pricesIncludeVat: boolean | null };
  amountInWords: string;
  payment: { path: string; pathLabel: string; method: string; methodLabel: string; reference: string | null; hasScreenshot: boolean };
  dates: { receivedAt: string | null; recordedAt: string; paidAt: string | null; decidedAt: string | null };
  people: { recordedBy: string | null; confirmedBy: string | null; rejectedBy: string | null; creditedTo: string | null; creditOwner: string | null };
  discount: SaleDiscount | null;
  amountReceived: number | null;
  amountMismatch: boolean;
  courseUnconfirmed: boolean;
  courseId: string | null;
  reason: string | null;
  invalidated: boolean;
  canDownloadPdf: boolean;
  canViewScreenshot: boolean;
  footer: string;
};
export const BILL_STATUS_TONE: Record<BillStatus, "warn" | "good" | "bad" | "neutral"> = { unpaid: "warn", waiting: "warn", confirmed: "good", rejected: "bad", cancelled: "neutral", invalid: "bad", other: "neutral" };
export const OFFLINE_METHOD_LABELS: Record<string, string> = { cash: "Cash", "esewa-personal": "eSewa", "bank-transfer": "Bank transfer", other: "Other" };
export const PAYMENT_METHOD_LABELS: Record<string, string> = { ...OFFLINE_METHOD_LABELS, fonepay: "Fonepay", "esewa-gateway": "eSewa (online)", connectips: "connectIPS" };

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
  courseId: string | null;
  courseTitle?: string;
  status: string;
  path: "online" | "single_code" | "bulk_codes" | "direct_grant" | "sales_recorded" | "other_offline";
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
  // Sales-recorded payments (R26): the recorder also sees these on their own rows.
  recordedByMe?: boolean;
  receivedAt?: string | null;
  rejection?: { at: string; reason: string } | null;
  cancellation?: { at: string; reason: string } | null;
  receiptNumber?: string | null;
  reference?: string | null;
  hasScreenshot?: boolean;
};

export const PAYMENT_PATH_LABELS: Record<LeadPayment["path"], string> = {
  online: "Online payment",
  single_code: "Code from a recorded sale",
  bulk_codes: "Prepaid organization code",
  direct_grant: "Enrolled by a Super Admin",
  sales_recorded: "Recorded by salesperson",
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
export const LEAD_COURSE_STATE: Record<LeadCourseState, { label: string; tone: "neutral" | "accent" | "good" | "warn" }> = {
  enrolled: { label: "Enrolled", tone: "good" },
  payment_pending: { label: "Payment pending", tone: "warn" },
  temporary: { label: "Temporary", tone: "accent" },
  temporary_frozen: { label: "Frozen", tone: "neutral" },
  interested: { label: "Interested", tone: "accent" },
  trial: { label: "Trial", tone: "neutral" },
  visited: { label: "Visited", tone: "neutral" },
};
export const INTEREST_STAGE_LABELS: Record<InterestStage, string> = { interested: "Interested", payment_pending: "Payment pending" };
// R61 (S8): the six stages with the prototype's pill tones.
export const STAGE: Record<Stage, { label: string; tone: "neutral" | "accent" | "good" | "warn" | "bad" }> = {
  new_lead: { label: "New lead", tone: "accent" },
  contacted: { label: "Contacted", tone: "neutral" },
  interested: { label: "Interested", tone: "accent" },
  temporary: { label: "Temporary enrollment", tone: "accent" },
  payment_pending: { label: "Payment pending", tone: "warn" },
  enrolled: { label: "Enrolled", tone: "good" },
  lost: { label: "Lost", tone: "bad" },
};
export const MANUAL_SOURCE_LABELS: Record<ManualSource, string> = { school_visit: "School visit", referral: "Referral", facebook_ad: "Facebook ad", walk_in: "Walk-in", phone_enquiry: "Phone enquiry", other: "Other" };
const LEAD_SOURCE_LABELS: Record<string, string> = { registration: "App registration", course_activity: "Course activity", manual: "Added by staff", import: "Import", referral: "Referral", school: "School", backfill: "Existing student", other: "Other" };
/** The Source column: the Add lead form's source when there is one, otherwise how the lead came in. */
export const sourceLabel = (r: { source?: string; manualSource?: ManualSource | null }) => (r.manualSource ? MANUAL_SOURCE_LABELS[r.manualSource] : r.source ? LEAD_SOURCE_LABELS[r.source] ?? r.source.replace(/_/g, " ") : "—");
// Reasons offered in the Mark lost panel (the backend takes any reason; these are the prototype's).
export const LOST_REASONS = ["Too expensive", "Joined another institute", "Not interested", "Could not reach", "Wrong number", "Other"];
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
/** The prototype's relative date: "Today, 3:00 PM", "Tomorrow, 9:00 AM", "24 Oct, 10:00 AM". */
export const relDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(new Date())) / 86_400_000);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diff === 0) return `Today, ${time}`;
  if (diff === -1) return `Yesterday, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });
  return `${date}, ${time}`;
};
export const rs = (n?: number | null) => (n == null ? "—" : `Rs. ${Number(n).toLocaleString("en-IN")}`);

// ---------- targets (Phase S4 / S5) ----------
export type TargetRules = { multiplier: number; bonusThreshold: number; bonusRatePercent: number; onTrackPercent: number };
export type MonthLabel = { bsYear: number; bsMonth: number; label: string };
export type MonthInfo = { bsYear: number; bsMonth: number; key: string; label: string; start: string; end: string; days: number; elapsed: number; ended: boolean; closed: boolean; closedAt: string | null };
export type TargetStatus = "no_salary" | "not_selling" | "ahead" | "on_track" | "behind" | "target_met" | "missed";
export const TARGET_STATUS_TONE: Record<TargetStatus, "good" | "accent" | "warn" | "bad" | "neutral"> = {
  ahead: "good",
  on_track: "accent",
  behind: "warn",
  not_selling: "bad",
  no_salary: "neutral",
  target_met: "good",
  missed: "bad",
};
export type TargetRow = {
  adminId: string;
  name: string;
  deactivated: boolean;
  month: MonthInfo;
  salary: number | null;
  target: number | null;
  dailyTarget: number | null;
  weeklyTarget: number | null;
  credited: number;
  creditedCount: number;
  refunds: number;
  adjustments: number;
  achieved: number;
  progress: number | null;
  expected: number | null;
  remaining: number | null;
  daysLeft: number;
  neededPerDay: number | null;
  status: TargetStatus;
  statusLabel: string;
  bonus: number;
  toBonus: number;
  waiting: { total: number; count: number };
  rules: TargetRules;
  frozen: boolean;
};
export type TargetSchedule = { nextMonth: MonthLabel; current: TargetRules & { month: MonthLabel }; scheduled: (TargetRules & { effectiveFrom: MonthLabel }) | null };
export type TargetsView = { month: MonthInfo; rules: TargetRules; rows: TargetRow[]; totals?: { target: number; credited: number; achieved: number; bonus: number; reps: number }; schedule: TargetSchedule };
export type TargetSales = {
  month: MonthInfo;
  payments: { _id: string; receiptNumber: string | null; date: string; studentName: string; courseTitle: string; pathLabel: string; amount: number; invalidatedAfterClose: boolean; leadId: string | null }[];
  adjustments: { _id: string; transactionId: string; amount: number; reason: string; originalMonth: { bsYear: number; bsMonth: number }; at: string }[];
};
export type SalaryHistory = {
  adminId: string;
  name: string;
  active: boolean;
  current: { amount: number; entryId: string } | null;
  scheduled: { amount: number; effectiveFrom: MonthLabel } | null;
  latestAmount: number | null;
  appliesFrom: MonthLabel;
  entries: { _id: string; amount: number; effectiveFrom: MonthLabel; setAt: string; setByName: string; reason: string; replacesEntryId: string | null }[];
};
export type DashboardTile = { key: string; label: string; value: number; count?: number; includes: string; tone?: "good" | "warn" | "bad"; link: string };
export type Dashboard = {
  month: MonthInfo;
  tiles: DashboardTile[];
  target: { row?: TargetRow; rows?: { adminId: string; name: string; deactivated: boolean; achieved: number; target: number | null; progress: number | null; status: TargetStatus; statusLabel: string }[]; totals?: TargetsView["totals"] };
  pipeline: { stages: { stage: Stage; label: string; count: number }[]; total: number };
  attention: {
    overdueTasks: { _id: string; leadId: string; leadName: string | null; type: string; notes: string | null; dueAt: string; assigneeName?: string | null }[];
    overdueTotal: number;
    uncontactedNewLeads: number;
    waitingConfirmation?: number;
    rejectedThisMonth?: number | null;
  };
};
