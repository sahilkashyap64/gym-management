"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  BodyMeasurement,
  DashboardSnapshot,
  FormReviewStatus,
  Invoice,
  MedicalHistoryForm,
  MembershipPlan,
  Member,
  MemberStatus,
  ParqForm,
  PlanAssignment,
  StaffMember,
  Weekday,
} from "@/lib/gym-data";
import {
  DASHBOARD_STORAGE_KEY,
  clearAdminSession,
  createAttendancePayload,
  ensureDemoSnapshot,
  getTodayKey,
  loadAdminSession,
} from "@/lib/demo-storage";
import { getMembershipReminders, type MembershipReminder } from "@/lib/whatsapp-reminders";

export type AdminModule =
  | "overview"
  | "members"
  | "member-health"
  | "membership"
  | "billing"
  | "payments"
  | "pt"
  | "staff"
  | "reports"
  | "classes"
  | "leads"
  | "plans"
  | "qr-attendance"
  | "whatsapp-reminders";

type PtPackage = DashboardSnapshot["ptPackages"][number];
type InvoiceStatus = Invoice["status"];
type Toast = { id: number; message: string };
type ReminderResult = {
  memberId: string;
  memberName: string;
  phone: string;
  ok: boolean;
  messageId?: string;
  error?: string;
};
type WhatsAppConfigStatus = {
  configured: boolean;
  hasToken: boolean;
  hasPhoneNumberId: boolean;
  hasBusinessAccountId: boolean;
  apiVersion: string;
  sendMode: "template" | "text";
  templateName: string | null;
  templateLanguage: string;
};
type ActiveModal =
  | "member"
  | "measurement"
  | "parq"
  | "medical"
  | "staff"
  | "membership"
  | "invoice"
  | "class"
  | "lead"
  | "plan"
  | "pt"
  | "payment"
  | "confirm"
  | null;
type ConfirmDialog = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
};

const moduleAccess = ["Members", "Health", "Membership", "Billing", "Payments", "QR", "PT", "Staff", "Classes", "Leads", "Plans", "Reports"];
const weekdays: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const membershipCategories: MembershipPlan["category"][] = ["Regular", "3 Days a Week", "2 Days a Week"];
const parqQuestions = [
  "Heart condition or doctor-advised activity limits",
  "Chest pain during physical activity",
  "Dizziness, fainting, or loss of balance",
  "Bone or joint problem",
  "Blood pressure or heart medication",
  "Other reason to avoid physical activity",
];

const routes: Array<{ key: AdminModule; label: string; href: string }> = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "members", label: "Members", href: "/members" },
  { key: "member-health", label: "Measurements & Forms", href: "/member-health" },
  { key: "membership", label: "Membership", href: "/membership" },
  { key: "billing", label: "Billing", href: "/billing" },
  { key: "payments", label: "Payments", href: "/payments" },
  { key: "pt", label: "PT", href: "/pt" },
  { key: "staff", label: "Staff", href: "/staff" },
  { key: "reports", label: "Reports", href: "/reports" },
  { key: "classes", label: "Classes", href: "/classes" },
  { key: "leads", label: "Leads", href: "/leads" },
  { key: "plans", label: "Diet Plans", href: "/plans" },
  { key: "qr-attendance", label: "QR Attendance", href: "/qr-attendance" },
  { key: "whatsapp-reminders", label: "WhatsApp Reminders", href: "/whatsapp-reminders" },
];

const statusStyles: Record<MemberStatus | InvoiceStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  due: "bg-rose-100 text-rose-800",
  paused: "bg-amber-100 text-amber-800",
  lead: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  draft: "bg-slate-200 text-slate-700",
};

const inputClass =
  "min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const checkBoxClass = "size-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function createId(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
}

function formatAttendanceDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function membershipPlanLabel(plan: MembershipPlan) {
  return `${plan.category} ${plan.duration}`;
}

function calculateBmi(heightCm: number, weightKg: number) {
  const heightM = heightCm / 100;
  return heightM ? Number((weightKg / (heightM * heightM)).toFixed(1)) : 0;
}

function calculateBmr(heightCm: number, weightKg: number, age: number, sex: BodyMeasurement["sex"]) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

function getMemberMeasurements(snapshot: DashboardSnapshot, memberName: string) {
  return snapshot.measurements.filter((entry) => entry.member === memberName);
}

function getLatestMeasurement(snapshot: DashboardSnapshot, memberName: string) {
  return getMemberMeasurements(snapshot, memberName).at(-1);
}

function getPreviousMeasurement(snapshot: DashboardSnapshot, memberName: string) {
  const entries = getMemberMeasurements(snapshot, memberName);
  return entries.length > 1 ? entries.at(-2) : undefined;
}

function getLatestParq(snapshot: DashboardSnapshot, memberName: string) {
  return snapshot.parqForms.filter((form) => form.member === memberName).at(-1);
}

function getLatestMedicalHistory(snapshot: DashboardSnapshot, memberName: string) {
  return snapshot.medicalHistoryForms.filter((form) => form.member === memberName).at(-1);
}

function reviewStatusStyles(status: FormReviewStatus) {
  return status === "clear" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";
}

function isAssignableCoach(staff: StaffMember) {
  return staff.role === "Trainer" || staff.role === "Owner";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function ProgressBar({ value, tone = "emerald" }: { value: number; tone?: "emerald" | "sky" | "amber" | "rose" }) {
  const color = {
    emerald: "bg-emerald-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  }[tone];

  return (
    <div className="h-2 rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

function ModuleCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <article className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</article>;
}

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Quick action</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950" id={titleId}>{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600" id={descriptionId}>{description}</p>
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 transition hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>
        <div className="pt-5">{children}</div>
      </section>
    </div>
  );
}

function restoreSnapshot(saved: DashboardSnapshot, initialSnapshot: DashboardSnapshot): DashboardSnapshot {
  const attendance = Array.isArray(saved.attendance) ? saved.attendance : initialSnapshot.attendance;
  const trainerNames = new Set((Array.isArray(saved.staff) ? saved.staff : initialSnapshot.staff).filter(isAssignableCoach).map((staff) => staff.name));
  const members = (Array.isArray(saved.members) ? saved.members : initialSnapshot.members).map((member) => ({
    ...member,
    branch: member.branch ?? "Delhi Branch",
    trainer: trainerNames.has(member.trainer) ? member.trainer : "Unassigned",
  }));
  const invoices = Array.isArray(saved.invoices) ? saved.invoices : initialSnapshot.invoices;
  const membershipPlans = (Array.isArray(saved.membershipPlans) ? saved.membershipPlans : initialSnapshot.membershipPlans).map((plan) => ({
    ...plan,
    status: plan.status ?? "active",
  }));
  const branches = Array.isArray(saved.branches) ? saved.branches : initialSnapshot.branches;
  const staff = Array.isArray(saved.staff) ? saved.staff : initialSnapshot.staff;
  const classes = Array.isArray(saved.classes) ? saved.classes : initialSnapshot.classes;
  const leads = Array.isArray(saved.leads) ? saved.leads : initialSnapshot.leads;
  const plans = Array.isArray(saved.plans) ? saved.plans : initialSnapshot.plans;
  const measurements = Array.isArray(saved.measurements) ? saved.measurements : initialSnapshot.measurements;
  const parqForms = Array.isArray(saved.parqForms) ? saved.parqForms : initialSnapshot.parqForms;
  const medicalHistoryForms = Array.isArray(saved.medicalHistoryForms)
    ? saved.medicalHistoryForms
    : initialSnapshot.medicalHistoryForms;
  const memberCredentials = Array.isArray(saved.memberCredentials)
    ? saved.memberCredentials
    : initialSnapshot.memberCredentials;
  const attendanceLogs = Array.isArray(saved.attendanceLogs) ? saved.attendanceLogs : initialSnapshot.attendanceLogs;
  const ptPackages = Array.isArray(saved.ptPackages) ? saved.ptPackages : initialSnapshot.ptPackages;

  return {
    ...initialSnapshot,
    ...saved,
    attendance,
    members,
    invoices,
    membershipPlans,
    branches,
    leads,
    plans,
    measurements,
    parqForms,
    medicalHistoryForms,
    memberCredentials,
    attendanceLogs,
    ptPackages,
    staff: staff.map((staff) => ({
      ...staff,
      branch: staff.branch ?? "Delhi Branch",
      disciplines: staff.disciplines ?? [staff.role],
      bio: staff.bio ?? staff.performance,
    })),
    classes: classes.map((slot) => ({
      ...slot,
      day: slot.day ?? "Monday",
    })),
  };
}

export default function AdminPanel({
  initialSnapshot,
  module,
}: {
  initialSnapshot: DashboardSnapshot;
  module: AdminModule;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [adminChecked, setAdminChecked] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toastId = useRef(0);

  const [memberForm, setMemberForm] = useState({
    name: "",
    phone: "",
    branch: "Delhi Branch",
    plan: "Regular 1 Month",
    status: "active" as MemberStatus,
    expiry: "30 Jun 2026",
    trainer: "Unassigned",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    member: initialSnapshot.members[0]?.name ?? "",
    amount: "5000",
    status: "draft" as InvoiceStatus,
    paymentMode: "Cash" as Invoice["paymentMode"],
  });
  const [staffForm, setStaffForm] = useState({
    name: "",
    role: "Trainer" as StaffMember["role"],
    branch: "Delhi Branch",
    access: ["Members", "PT", "Plans"],
  });
  const [classForm, setClassForm] = useState({
    day: "Monday" as Weekday,
    name: "",
    coach: "",
    time: "7:00 PM",
    capacity: "20",
  });
  const [leadForm, setLeadForm] = useState({
    name: "",
    source: "Walk-in",
    nextFollowUp: "Tomorrow",
  });
  const [membershipForm, setMembershipForm] = useState({
    category: "Regular" as MembershipPlan["category"],
    duration: "1 Month",
    price: "10000",
  });
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({
    member: initialSnapshot.members[0]?.name ?? "",
    calories: "2200",
    protein: "130",
    workoutSplit: "Full Body Strength",
  });
  const [ptForm, setPtForm] = useState({
    member: initialSnapshot.members[0]?.name ?? "",
    trainer: "Unassigned",
    sessionsLeft: "12",
  });
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: "",
    paymentMode: "Cash" as Invoice["paymentMode"],
    reference: "",
  });
  const [selectedHealthMember, setSelectedHealthMember] = useState(initialSnapshot.members[0]?.name ?? "");
  const [measurementForm, setMeasurementForm] = useState({
    member: initialSnapshot.members[0]?.name ?? "",
    heightCm: "175",
    weightKg: "78",
    age: "30",
    sex: "male" as BodyMeasurement["sex"],
    chestCm: "100",
    waistCm: "86",
    hipCm: "98",
    bodyFatPercent: "20",
  });
  const [parqForm, setParqForm] = useState({
    member: initialSnapshot.members[0]?.name ?? "",
    yesAnswers: [] as string[],
    notes: "",
  });
  const [medicalForm, setMedicalForm] = useState({
    member: initialSnapshot.members[0]?.name ?? "",
    conditions: "",
    allergies: "",
    medications: "",
    emergencyContact: "",
    notes: "",
  });
  const [selectedQrBranch, setSelectedQrBranch] = useState(initialSnapshot.branches[0]?.name ?? "Delhi Branch");
  const [attendanceQrDataUrl, setAttendanceQrDataUrl] = useState("");
  const [attendanceQrError, setAttendanceQrError] = useState("");
  const [reminderDaysWindow, setReminderDaysWindow] = useState("30");
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([]);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderResults, setReminderResults] = useState<ReminderResult[]>([]);
  const [reminderError, setReminderError] = useState("");
  const [whatsAppConfigStatus, setWhatsAppConfigStatus] = useState<WhatsAppConfigStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    window.setTimeout(() => {
      if (!mounted) return;

      const session = loadAdminSession();
      if (!session) {
        router.replace("/login");
        setAdminChecked(true);
        return;
      }

      setAdminName(session.name);
      setAdminChecked(true);
    }, 0);

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (initialSnapshot.dbStatus?.connected) return;
    let mounted = true;
    const saved = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (saved) {
      window.setTimeout(() => {
        if (mounted) setSnapshot(restoreSnapshot(ensureDemoSnapshot(JSON.parse(saved) as DashboardSnapshot, initialSnapshot), initialSnapshot));
      }, 0);
    }
    return () => {
      mounted = false;
    };
  }, [initialSnapshot]);

  useEffect(() => {
    if (snapshot.dbStatus?.connected) return;
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  useEffect(() => {
    if (module !== "whatsapp-reminders") return;

    let mounted = true;
    fetch("/api/whatsapp/membership-reminders")
      .then((response) => response.json())
      .then((data: WhatsAppConfigStatus) => {
        if (mounted) setWhatsAppConfigStatus(data);
      })
      .catch(() => {
        if (mounted) setWhatsAppConfigStatus(null);
      });

    return () => {
      mounted = false;
    };
  }, [module]);

  useEffect(() => {
    function syncSavedSnapshot() {
      const saved = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
      if (!saved) return;
      try {
        setSnapshot(restoreSnapshot(ensureDemoSnapshot(JSON.parse(saved) as DashboardSnapshot, initialSnapshot), initialSnapshot));
      } catch {
        // Ignore malformed demo data so the admin panel remains usable.
      }
    }

    window.addEventListener("focus", syncSavedSnapshot);
    window.addEventListener("storage", syncSavedSnapshot);
    return () => {
      window.removeEventListener("focus", syncSavedSnapshot);
      window.removeEventListener("storage", syncSavedSnapshot);
    };
  }, [initialSnapshot]);

  const metrics = useMemo(() => {
    const activeMembers = snapshot.members.filter((member) => member.status === "active").length;
    const dues = snapshot.members.reduce((sum, member) => sum + member.dues, 0);
    const monthlyRevenue = snapshot.invoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + invoice.amount + invoice.gst, 0);
    const leads = snapshot.leads.filter((lead) => lead.stage !== "Won").length;
    const retention = Math.min(96, Math.round(72 + activeMembers * 2.4));
    return { ...snapshot.metrics, activeMembers, dues, monthlyRevenue, leads, retention };
  }, [snapshot]);

  const branchOptions = useMemo(() => snapshot.branches.map((branch) => branch.name), [snapshot.branches]);
  const trainerOptions = useMemo(() => snapshot.staff.filter(isAssignableCoach).map((staff) => staff.name), [snapshot.staff]);
  const activeMembershipPlans = useMemo(() => snapshot.membershipPlans.filter((plan) => plan.status === "active"), [snapshot.membershipPlans]);
  const pageTitle = routes.find((route) => route.key === module)?.label ?? "Overview";
  const selectedMemberProfile = useMemo(
    () => snapshot.members.find((member) => member.name === selectedHealthMember) ?? snapshot.members[0],
    [selectedHealthMember, snapshot.members],
  );
  const selectedMeasurements = useMemo(
    () => (selectedMemberProfile ? getMemberMeasurements(snapshot, selectedMemberProfile.name) : []),
    [selectedMemberProfile, snapshot],
  );
  const selectedLatestMeasurement = selectedMemberProfile ? getLatestMeasurement(snapshot, selectedMemberProfile.name) : undefined;
  const selectedPreviousMeasurement = selectedMemberProfile ? getPreviousMeasurement(snapshot, selectedMemberProfile.name) : undefined;
  const selectedLatestParq = selectedMemberProfile ? getLatestParq(snapshot, selectedMemberProfile.name) : undefined;
  const selectedLatestMedical = selectedMemberProfile ? getLatestMedicalHistory(snapshot, selectedMemberProfile.name) : undefined;
  const attendanceQrPayload = useMemo(
    () => JSON.stringify(createAttendancePayload(selectedQrBranch)),
    [selectedQrBranch],
  );
  const todaysAttendanceLogs = useMemo(
    () =>
      snapshot.attendanceLogs
        .filter((log) => getTodayKey(new Date(log.checkedInAt)) === getTodayKey())
        .sort((first, second) => Date.parse(second.checkedInAt) - Date.parse(first.checkedInAt)),
    [snapshot.attendanceLogs],
  );
  const latestAttendanceLogs = useMemo(
    () => [...snapshot.attendanceLogs].sort((first, second) => Date.parse(second.checkedInAt) - Date.parse(first.checkedInAt)).slice(0, 8),
    [snapshot.attendanceLogs],
  );
  const membershipReminders = useMemo(
    () => getMembershipReminders(snapshot.members, Math.max(1, Number(reminderDaysWindow) || 30)),
    [reminderDaysWindow, snapshot.members],
  );
  const selectedReminders = useMemo(
    () => membershipReminders.filter((reminder) => selectedReminderIds.includes(reminder.memberId)),
    [membershipReminders, selectedReminderIds],
  );

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(attendanceQrPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: {
        dark: "#020617",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (mounted) {
          setAttendanceQrDataUrl(dataUrl);
          setAttendanceQrError("");
        }
      })
      .catch(() => {
        if (mounted) setAttendanceQrError("Unable to generate attendance QR");
      });

    return () => {
      mounted = false;
    };
  }, [attendanceQrPayload]);

  function flash(message: string) {
    toastId.current += 1;
    setToast({ id: toastId.current, message });
  }

  async function commitAdminAction(action: string, payload: Record<string, unknown>, message: string) {
    if (!snapshot.dbStatus?.connected) {
      flash("Database is not connected. This action was not saved.");
      return;
    }

    try {
      const response = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const result = (await response.json()) as { snapshot?: DashboardSnapshot; error?: string };
      if (!response.ok || !result.snapshot) {
        flash(result.error ?? "Database action failed");
        return;
      }
      setSnapshot(result.snapshot);
      flash(message);
    } catch {
      flash("Database request failed. Check the connection and try again.");
    }
  }

  function toggleReminderSelection(memberId: string) {
    setSelectedReminderIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    );
  }

  function setAllReminderSelections(reminders: MembershipReminder[]) {
    setSelectedReminderIds(reminders.map((reminder) => reminder.memberId));
  }

  async function sendMembershipReminders() {
    setReminderError("");
    setReminderResults([]);
    if (!selectedReminders.length) {
      setReminderError("Select at least one member to send reminders.");
      return;
    }

    setReminderSending(true);
    try {
      const response = await fetch("/api/whatsapp/membership-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminders: selectedReminders }),
      });
      const data = (await response.json()) as {
        config?: WhatsAppConfigStatus;
        error?: string;
        results?: ReminderResult[];
        sent?: number;
        failed?: number;
      };
      if (data.config) setWhatsAppConfigStatus(data.config);
      if (!response.ok) {
        setReminderError(data.error ?? "Unable to send WhatsApp reminders");
        return;
      }
      setReminderResults(data.results ?? []);
      flash(`${data.sent ?? 0} WhatsApp reminder${data.sent === 1 ? "" : "s"} sent manually`);
    } catch {
      setReminderError("Unable to reach the WhatsApp reminder API route.");
    } finally {
      setReminderSending(false);
    }
  }

  function resetDemoData() {
    window.localStorage.removeItem(DASHBOARD_STORAGE_KEY);
    setSnapshot(initialSnapshot);
    flash("Demo data reset");
  }

  function logoutAdmin() {
    clearAdminSession();
    router.push("/login");
  }

  function openConfirmDialog(dialog: ConfirmDialog) {
    setConfirmDialog(dialog);
    setActiveModal("confirm");
  }

  function submitInvoiceModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addInvoice(new FormData(event.currentTarget));
    setActiveModal(null);
  }

  function submitClassModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!String(formData.get("name") ?? "").trim()) return;
    addClass(formData);
    setActiveModal(null);
  }

  function submitLeadModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!String(formData.get("name") ?? "").trim()) return;
    addLead(formData);
    setActiveModal(null);
  }

  function submitPlanModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addPlan(new FormData(event.currentTarget));
    setActiveModal(null);
  }

  function submitPtModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addPtPackage(new FormData(event.currentTarget));
    setActiveModal(null);
  }

  function submitPaymentModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    markInvoicePaid(String(formData.get("invoiceId") ?? ""), String(formData.get("paymentMode") ?? "Cash") as Invoice["paymentMode"]);
    setActiveModal(null);
  }

  function submitMeasurementModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addMeasurement(new FormData(event.currentTarget));
    setActiveModal(null);
  }

  function submitParqModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addParqForm(new FormData(event.currentTarget));
    setActiveModal(null);
  }

  function submitMedicalModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addMedicalHistoryForm(new FormData(event.currentTarget));
    setActiveModal(null);
  }

  function submitMemberModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!String(formData.get("name") ?? "").trim()) return;
    addMember(formData);
    setActiveModal(null);
  }

  function submitStaffModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!String(formData.get("name") ?? "").trim()) return;
    addStaff(formData);
    setActiveModal(null);
  }

  function submitMembershipModal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const price = Number(formData.get("price") ?? 0);
    if (!price) return;
    if (editingMembershipId) {
      updateMembershipPlan(editingMembershipId, formData);
    } else {
      addMembershipPlan(formData);
    }
    setActiveModal(null);
    setEditingMembershipId(null);
  }

  function openMembershipModal(plan?: MembershipPlan) {
    setEditingMembershipId(plan?.id ?? null);
    setMembershipForm({
      category: plan?.category ?? "Regular",
      duration: plan?.duration ?? "1 Month",
      price: String(plan?.price ?? 10000),
    });
    setActiveModal("membership");
  }

  function openPtModal(member: Member) {
    setPtForm({
      member: member.name,
      trainer: member.trainer,
      sessionsLeft: "12",
    });
    setActiveModal("pt");
  }

  function openPaymentModal(invoice: Invoice, paymentMode: Invoice["paymentMode"]) {
    setPaymentForm({
      invoiceId: invoice.id,
      paymentMode,
      reference: "",
    });
    setActiveModal("payment");
  }

  function openMeasurementModal(memberName = selectedHealthMember) {
    const latest = getLatestMeasurement(snapshot, memberName);
    setMeasurementForm({
      member: memberName,
      heightCm: String(latest?.heightCm ?? 175),
      weightKg: String(latest?.weightKg ?? 78),
      age: String(latest?.age ?? 30),
      sex: latest?.sex ?? "male",
      chestCm: String(latest?.chestCm ?? 100),
      waistCm: String(latest?.waistCm ?? 86),
      hipCm: String(latest?.hipCm ?? 98),
      bodyFatPercent: String(latest?.bodyFatPercent ?? 20),
    });
    setActiveModal("measurement");
  }

  function openParqModal(memberName = selectedHealthMember) {
    setParqForm({ member: memberName, yesAnswers: [], notes: "" });
    setActiveModal("parq");
  }

  function openMedicalModal(memberName = selectedHealthMember) {
    const latest = getLatestMedicalHistory(snapshot, memberName);
    setMedicalForm({
      member: memberName,
      conditions: latest?.conditions.join(", ") ?? "",
      allergies: latest?.allergies ?? "",
      medications: latest?.medications ?? "",
      emergencyContact: latest?.emergencyContact ?? "",
      notes: "",
    });
    setActiveModal("medical");
  }

  function addMember(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    void commitAdminAction(
      "addMember",
      {
      name,
      phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
      branch: String(formData.get("branch") ?? "Delhi Branch"),
      plan: String(formData.get("plan") ?? "Regular 1 Month"),
      status: String(formData.get("status") ?? "active") as MemberStatus,
      expiry: String(formData.get("expiry") ?? "30 Jun 2026"),
      trainer: String(formData.get("trainer") ?? "Unassigned"),
      },
      "Member added",
    );
    setMemberForm({ ...memberForm, name: "", phone: "", trainer: "Unassigned" });
  }

  function updateMemberStatus(id: string, status: MemberStatus) {
    void commitAdminAction("updateMemberStatus", { id, status }, "Member status updated");
  }

  function updateMemberBranch(id: string, branch: string) {
    void commitAdminAction("updateMemberBranch", { id, branch }, "Member branch updated");
  }

  function updateMemberTrainer(id: string, trainer: string) {
    void commitAdminAction("updateMemberTrainer", { id, trainer }, "Member trainer updated");
  }

  function addMeasurement(formData: FormData) {
    const member = String(formData.get("member") ?? "");
    const heightCm = Number(formData.get("heightCm") ?? 0);
    const weightKg = Number(formData.get("weightKg") ?? 0);
    const age = Number(formData.get("age") ?? 0);
    const sex = String(formData.get("sex") ?? "male") as BodyMeasurement["sex"];
    if (!member || !heightCm || !weightKg || !age) return;
    const measurement: BodyMeasurement = {
      id: createId("MSR", snapshot.measurements.length + 240),
      member,
      recordedOn: formatToday(),
      heightCm,
      weightKg,
      age,
      sex,
      chestCm: Number(formData.get("chestCm") ?? 0),
      waistCm: Number(formData.get("waistCm") ?? 0),
      hipCm: Number(formData.get("hipCm") ?? 0),
      bodyFatPercent: Number(formData.get("bodyFatPercent") ?? 0),
      bmi: calculateBmi(heightCm, weightKg),
      bmr: calculateBmr(heightCm, weightKg, age, sex),
    };
    void commitAdminAction("addMeasurement", measurement as unknown as Record<string, unknown>, "Measurement added from member app");
    setSelectedHealthMember(member);
  }

  function addParqForm(formData: FormData) {
    const member = String(formData.get("member") ?? "");
    if (!member) return;
    const yesAnswers = formData.getAll("yesAnswers").map(String);
    const form: ParqForm = {
      id: createId("PARQ", snapshot.parqForms.length + 130),
      member,
      submittedOn: formatToday(),
      status: yesAnswers.length ? "review" : "clear",
      yesAnswers,
      notes: String(formData.get("notes") ?? "").trim() || (yesAnswers.length ? "Review before intense training." : "No restrictions reported."),
    };
    void commitAdminAction("addParqForm", form as unknown as Record<string, unknown>, "PAR-Q form submitted");
    setSelectedHealthMember(member);
  }

  function addMedicalHistoryForm(formData: FormData) {
    const member = String(formData.get("member") ?? "");
    if (!member) return;
    const conditions = String(formData.get("conditions") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const allergies = String(formData.get("allergies") ?? "").trim();
    const medications = String(formData.get("medications") ?? "").trim();
    const form: MedicalHistoryForm = {
      id: createId("MED", snapshot.medicalHistoryForms.length + 125),
      member,
      submittedOn: formatToday(),
      status: conditions.length || allergies || medications ? "review" : "clear",
      conditions: conditions.length ? conditions : ["None"],
      allergies: allergies || "None",
      medications: medications || "None",
      emergencyContact: String(formData.get("emergencyContact") ?? "").trim() || "Not provided",
      notes: String(formData.get("notes") ?? "").trim() || "Submitted from member app.",
    };
    void commitAdminAction("addMedicalHistoryForm", form as unknown as Record<string, unknown>, "Medical history submitted");
    setSelectedHealthMember(member);
  }

  function addInvoice(formData: FormData) {
    const amount = Number(formData.get("amount") ?? 0);
    if (!amount) return;
    void commitAdminAction(
      "addInvoice",
      {
      member: String(formData.get("member") ?? ""),
      amount,
      status: String(formData.get("status") ?? "draft") as InvoiceStatus,
      paymentMode: String(formData.get("paymentMode") ?? "Cash") as Invoice["paymentMode"],
      },
      "Invoice created",
    );
  }

  function markInvoicePaid(id: string, paymentMode?: Invoice["paymentMode"]) {
    void commitAdminAction("markInvoicePaid", { id, paymentMode }, "Payment captured and receipt reconciled");
  }

  function addPtPackage(formData: FormData) {
    const member = String(formData.get("member") ?? "");
    const trainer = String(formData.get("trainer") ?? "Unassigned");
    const pack: PtPackage = {
      id: createId("PT", snapshot.ptPackages.length + 800),
      member,
      trainer,
      sessionsLeft: Number(formData.get("sessionsLeft") ?? 12),
      progress: 0,
    };
    void commitAdminAction("addPtPackage", pack as unknown as Record<string, unknown>, "PT package assigned");
  }

  function logPtSession(id: string) {
    void commitAdminAction("logPtSession", { id }, "PT session logged");
  }

  function addStaff(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const staff: StaffMember = {
      id: createId("STF", snapshot.staff.length),
      name,
      role: String(formData.get("role") ?? "Trainer") as StaffMember["role"],
      branch: String(formData.get("branch") ?? "Delhi Branch"),
      disciplines: [String(formData.get("role") ?? "Trainer")],
      access: staffForm.access,
      attendance: 100,
      performance: "New staff profile",
      bio: "New team member profile",
    };
    void commitAdminAction("addStaff", staff as unknown as Record<string, unknown>, "Staff account created");
    setStaffForm({ ...staffForm, name: "" });
  }

  function updateStaffBranch(id: string, branch: string) {
    void commitAdminAction("updateStaffBranch", { id, branch }, "Staff branch updated");
  }

  function isMembershipPlanUsed(plan: MembershipPlan) {
    const label = membershipPlanLabel(plan);
    return snapshot.members.some((member) => member.plan === label || member.plan === plan.id);
  }

  function addMembershipPlan(formData: FormData) {
    const category = String(formData.get("category") ?? "Regular") as MembershipPlan["category"];
    const duration = String(formData.get("duration") ?? "").trim();
    const price = Number(formData.get("price") ?? 0);
    if (!duration || !price) return;
    void commitAdminAction("addMembershipPlan", { category, duration, price }, "Membership plan added");
  }

  function updateMembershipPlan(id: string, formData: FormData) {
    const category = String(formData.get("category") ?? "Regular") as MembershipPlan["category"];
    const duration = String(formData.get("duration") ?? "").trim();
    const price = Number(formData.get("price") ?? 0);
    if (!duration || !price) return;
    void commitAdminAction("updateMembershipPlan", { id, category, duration, price }, "Membership plan updated");
  }

  function archiveMembershipPlan(id: string) {
    void commitAdminAction("setMembershipPlanStatus", { id, status: "archived" }, "Membership plan archived");
  }

  function restoreMembershipPlan(id: string) {
    void commitAdminAction("setMembershipPlanStatus", { id, status: "active" }, "Membership plan restored");
  }

  function deleteMembershipPlan(id: string) {
    const plan = snapshot.membershipPlans.find((item) => item.id === id);
    if (plan && isMembershipPlanUsed(plan)) {
      archiveMembershipPlan(id);
      return;
    }
    void commitAdminAction("deleteMembershipPlan", { id }, "Membership plan deleted");
  }

  function toggleStaffAccess(id: string, access: string) {
    void commitAdminAction("toggleStaffAccess", { id, access }, "Staff permission updated");
  }

  function addClass(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    void commitAdminAction(
      "addClass",
      {
      day: String(formData.get("day") ?? "Monday") as Weekday,
      name,
      coach: String(formData.get("coach") ?? ""),
      time: String(formData.get("time") ?? "7:00 PM"),
      capacity: Number(formData.get("capacity") ?? 20),
      },
      "Class scheduled",
    );
    setClassForm({ ...classForm, name: "", coach: "" });
  }

  function adjustClassBooking(id: string, delta: 1 | -1) {
    void commitAdminAction("adjustClassBooking", { id, delta }, delta > 0 ? "Class slot booked" : "Class booking cancelled");
  }

  function addLead(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    void commitAdminAction(
      "addLead",
      {
      name,
      source: String(formData.get("source") ?? "Walk-in"),
      nextFollowUp: String(formData.get("nextFollowUp") ?? "Tomorrow"),
      },
      "Lead captured",
    );
    setLeadForm({ ...leadForm, name: "" });
  }

  function advanceLead(id: string) {
    void commitAdminAction("advanceLead", { id }, "Lead stage updated");
  }

  function convertLead(id: string) {
    void commitAdminAction("convertLead", { id }, "Lead converted to member");
  }

  function addPlan(formData: FormData) {
    const plan: PlanAssignment = {
      id: createId("PLN", snapshot.plans.length + 100),
      member: String(formData.get("member") ?? ""),
      calories: Number(formData.get("calories") ?? 0),
      protein: Number(formData.get("protein") ?? 0),
      workoutSplit: String(formData.get("workoutSplit") ?? ""),
      adherence: 0,
    };
    void commitAdminAction("addPlan", plan as unknown as Record<string, unknown>, "Plan assigned");
  }

  function adjustPlanAdherence(id: string, delta: 10 | -10) {
    void commitAdminAction("adjustPlanAdherence", { id, delta }, "Plan adherence updated");
  }

  const metricCards = (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {[
        ["Active members", metrics.activeMembers.toLocaleString("en-IN"), "Live subscriptions"],
        ["Revenue", formatCurrency(metrics.monthlyRevenue), "Paid invoices"],
        ["Dues", formatCurrency(metrics.dues), "Needs follow-up"],
        ["Attendance", metrics.attendanceToday.toString(), "Today"],
        ["Retention", `${metrics.retention}%`, "Active base health"],
        ["Leads", metrics.leads.toString(), "Open pipeline"],
      ].map(([label, value, helper]) => (
        <ModuleCard className="p-4" key={label}>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </ModuleCard>
      ))}
    </section>
  );

  const reportsModule = (
    <ModuleCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Reports & Analytics</h2>
          <p className="text-sm text-slate-500">Revenue, retention, dues, attendance, class fill, and lead conversion.</p>
        </div>
        <span className="rounded-md bg-sky-100 px-3 py-1 text-sm font-bold text-sky-800">Live view</span>
      </div>
      <div className="mt-7 flex h-64 items-end gap-3">
        {snapshot.attendance.map((day) => {
          const maxVisits = Math.max(...snapshot.attendance.map((item) => item.visits));
          return (
            <div className="flex flex-1 flex-col items-center gap-2" key={day.label}>
              <div className="flex h-52 w-full items-end rounded-md bg-slate-100 p-1">
                <div className="w-full rounded bg-emerald-500" style={{ height: `${(day.visits / maxVisits) * 100}%` }} />
              </div>
              <p className="text-xs font-bold text-slate-500">{day.label}</p>
              <p className="text-xs text-slate-400">{day.visits}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">Class fill rate</p>
          <p className="mt-1 text-xl font-black">
            {Math.round(
              (snapshot.classes.reduce((sum, slot) => sum + slot.booked, 0) /
                Math.max(1, snapshot.classes.reduce((sum, slot) => sum + slot.capacity, 0))) *
                100,
            )}
            %
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">Won leads</p>
          <p className="mt-1 text-xl font-black">{snapshot.leads.filter((lead) => lead.stage === "Won").length}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500">PT sessions left</p>
          <p className="mt-1 text-xl font-black">{snapshot.ptPackages.reduce((sum, pack) => sum + pack.sessionsLeft, 0)}</p>
        </div>
      </div>
    </ModuleCard>
  );

  const paymentsModule = (
    <ModuleCard>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Payment Collection</p>
      <h2 className="mt-3 text-2xl font-black text-slate-950">Cash and Google Pay verification</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Record cash collections or verify a Google Pay payment screenshot before closing pending invoices. Razorpay can be added later as an online payment gateway.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-950">Cash</p>
          <p className="mt-2 text-xs leading-5 text-slate-600">Use for front-desk collections and manual receipt reconciliation.</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-black text-slate-950">Google Pay screenshot</p>
          <p className="mt-2 text-xs leading-5 text-slate-700">Use after matching the uploaded screenshot with invoice amount and member details.</p>
        </div>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
          <p className="text-sm font-black text-slate-700">Razorpay</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Future gateway integration, not active in the current payment flow.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.invoices
          .filter((invoice) => invoice.status !== "paid")
          .map((invoice) => (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold shadow-sm" key={invoice.id}>
              <span className="block text-slate-950">{invoice.member}</span>
              <span className="mt-1 block text-slate-600">{invoice.id} · {formatCurrency(invoice.amount + invoice.gst)}</span>
              <span className="mt-1 block text-xs text-slate-500">Invoice mode: {invoice.paymentMode}</span>
              <div className="mt-4 grid gap-2">
                <button className="rounded-md bg-slate-950 px-3 py-2 text-left text-xs font-black text-white transition hover:bg-slate-800" onClick={() => openPaymentModal(invoice, "Cash")} type="button">
                  Record cash payment
                </button>
                <button className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-xs font-black text-emerald-800 transition hover:bg-emerald-100" onClick={() => openPaymentModal(invoice, "Google Pay Screenshot")} type="button">
                  Verify Google Pay screenshot
                </button>
                <button className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-black text-slate-400" disabled type="button">
                  Razorpay coming soon
                </button>
              </div>
            </div>
          ))}
      </div>
    </ModuleCard>
  );

  const membersModule = (
    <ModuleCard className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-xl font-black">Member Management</h2>
          <p className="mt-1 text-sm text-slate-500">Profiles, subscriptions, dues, PT assignment, measurements, and forms.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveModal("member")} type="button">
          Add member
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1240px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Branch</th>
              <th className="px-5 py-3">Trainer</th>
              <th className="px-5 py-3">Wellness</th>
              <th className="px-5 py-3">Dues</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {snapshot.members.map((member) => {
              const latestMeasurement = getLatestMeasurement(snapshot, member.name);
              const latestParq = getLatestParq(snapshot, member.name);
              const latestMedical = getLatestMedicalHistory(snapshot, member.name);
              const needsReview = latestParq?.status === "review" || latestMedical?.status === "review";
              return (
              <tr key={member.id}>
                <td className="px-5 py-4">
                  <div className="font-bold">{member.name}</div>
                  <div className="text-xs text-slate-500">{member.id} · {member.phone}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="font-semibold">{member.plan}</div>
                  <div className="text-xs text-slate-500">Expires {member.expiry}</div>
                </td>
                <td className="px-5 py-4">
                  <select className="min-h-9 w-44 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700" onChange={(event) => updateMemberBranch(member.id, event.target.value)} value={member.branch}>
                    {branchOptions.map((branch) => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  <select className="min-h-9 w-44 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700" onChange={(event) => updateMemberTrainer(member.id, event.target.value)} value={member.trainer}>
                    <option value="Unassigned">Unassigned</option>
                    {trainerOptions.map((trainer) => (
                      <option key={trainer} value={trainer}>{trainer}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4">
                  <div className="grid gap-1">
                    <div className="text-xs font-bold text-slate-700">
                      {latestMeasurement ? `BMI ${latestMeasurement.bmi} · BMR ${latestMeasurement.bmr}` : "No measurements"}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${latestParq ? reviewStatusStyles(latestParq.status) : "bg-slate-100 text-slate-600"}`}>
                        PAR-Q {latestParq?.status ?? "pending"}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${latestMedical ? reviewStatusStyles(latestMedical.status) : "bg-slate-100 text-slate-600"}`}>
                        Medical {latestMedical?.status ?? "pending"}
                      </span>
                    </div>
                    {needsReview ? <p className="text-xs font-semibold text-amber-700">Coach review needed</p> : null}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusStyles[member.status]}`}>
                    {member.dues ? formatCurrency(member.dues) : member.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => updateMemberStatus(member.id, "active")} type="button">Activate</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => updateMemberStatus(member.id, "paused")} type="button">Pause</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => updateMemberStatus(member.id, "due")} type="button">Mark due</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => openPtModal(member)} type="button">Add PT</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => openMeasurementModal(member.name)} type="button">Measure</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => openParqModal(member.name)} type="button">PAR-Q</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => openMedicalModal(member.name)} type="button">Medical</button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ModuleCard>
  );

  const measurementProgress = selectedLatestMeasurement && selectedPreviousMeasurement
    ? [
        { label: "Weight", value: selectedLatestMeasurement.weightKg, previous: selectedPreviousMeasurement.weightKg, suffix: "kg" },
        { label: "Waist", value: selectedLatestMeasurement.waistCm, previous: selectedPreviousMeasurement.waistCm, suffix: "cm" },
        { label: "Body fat", value: selectedLatestMeasurement.bodyFatPercent, previous: selectedPreviousMeasurement.bodyFatPercent, suffix: "%" },
      ]
    : [];

  const memberHealthModule = (
    <div className="grid gap-6">
      <ModuleCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Member app intake</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Measurements, PAR-Q and medical history</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Admin view of member-submitted measurements, BMI, BMR, PAR-Q answers, and medical history forms.
            </p>
          </div>
          <Field label="Member">
            <select
              className={`${inputClass} min-w-64`}
              onChange={(event) => setSelectedHealthMember(event.target.value)}
              value={selectedMemberProfile?.name ?? ""}
            >
              {snapshot.members.map((member) => (
                <option key={member.id} value={member.name}>{member.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => openMeasurementModal(selectedMemberProfile?.name)} type="button">
            Add measurement
          </button>
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => openParqModal(selectedMemberProfile?.name)} type="button">
            Fill PAR-Q
          </button>
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => openMedicalModal(selectedMemberProfile?.name)} type="button">
            Fill medical history
          </button>
        </div>
      </ModuleCard>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          ["Latest BMI", selectedLatestMeasurement?.bmi ?? "Pending", selectedLatestMeasurement ? "Calculated from latest entry" : "Add measurements"],
          ["Latest BMR", selectedLatestMeasurement ? `${selectedLatestMeasurement.bmr} kcal` : "Pending", "Daily resting burn estimate"],
          ["PAR-Q", selectedLatestParq?.status ?? "Pending", selectedLatestParq ? `Submitted ${selectedLatestParq.submittedOn}` : "No form submitted"],
          ["Medical history", selectedLatestMedical?.status ?? "Pending", selectedLatestMedical ? `Submitted ${selectedLatestMedical.submittedOn}` : "No form submitted"],
        ].map(([label, value, helper]) => (
          <ModuleCard className="p-4" key={label}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-black capitalize">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{helper}</p>
          </ModuleCard>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ModuleCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Measurement Progress</h2>
              <p className="mt-1 text-sm text-slate-500">Member-entered body measurements over time.</p>
            </div>
            <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">{selectedMeasurements.length} entries</span>
          </div>
          {selectedMeasurements.length ? (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                {measurementProgress.map((item) => {
                  const delta = Number((item.value - item.previous).toFixed(1));
                  const improved = delta <= 0;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={item.label}>
                      <p className="text-xs font-bold text-slate-500">{item.label}</p>
                      <p className="mt-2 text-xl font-black">{item.value}{item.suffix}</p>
                      <p className={`mt-1 text-xs font-bold ${improved ? "text-emerald-700" : "text-amber-700"}`}>
                        {delta > 0 ? "+" : ""}{delta}{item.suffix} since previous
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Weight</th>
                      <th className="px-4 py-3">Chest</th>
                      <th className="px-4 py-3">Waist</th>
                      <th className="px-4 py-3">Hip</th>
                      <th className="px-4 py-3">Body fat</th>
                      <th className="px-4 py-3">BMI / BMR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMeasurements.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 font-semibold">{entry.recordedOn}</td>
                        <td className="px-4 py-3">{entry.weightKg}kg</td>
                        <td className="px-4 py-3">{entry.chestCm}cm</td>
                        <td className="px-4 py-3">{entry.waistCm}cm</td>
                        <td className="px-4 py-3">{entry.hipCm}cm</td>
                        <td className="px-4 py-3">{entry.bodyFatPercent}%</td>
                        <td className="px-4 py-3">{entry.bmi} / {entry.bmr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-600">
              No measurement entries yet.
            </div>
          )}
        </ModuleCard>

        <ModuleCard>
          <h2 className="text-xl font-black">Form Review</h2>
          <div className="mt-5 grid gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">PAR-Q</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedLatestParq?.submittedOn ?? "Not submitted"}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${selectedLatestParq ? reviewStatusStyles(selectedLatestParq.status) : "bg-slate-100 text-slate-600"}`}>
                  {selectedLatestParq?.status ?? "pending"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {selectedLatestParq?.yesAnswers.length ? selectedLatestParq.yesAnswers.join(", ") : "No yes answers recorded."}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{selectedLatestParq?.notes ?? "Member can submit this from the app."}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">Medical History</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedLatestMedical?.submittedOn ?? "Not submitted"}</p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${selectedLatestMedical ? reviewStatusStyles(selectedLatestMedical.status) : "bg-slate-100 text-slate-600"}`}>
                  {selectedLatestMedical?.status ?? "pending"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <p><span className="font-bold text-slate-800">Conditions:</span> {selectedLatestMedical?.conditions.join(", ") ?? "Pending"}</p>
                <p><span className="font-bold text-slate-800">Allergies:</span> {selectedLatestMedical?.allergies ?? "Pending"}</p>
                <p><span className="font-bold text-slate-800">Medications:</span> {selectedLatestMedical?.medications ?? "Pending"}</p>
                <p><span className="font-bold text-slate-800">Emergency:</span> {selectedLatestMedical?.emergencyContact ?? "Pending"}</p>
              </div>
            </div>
          </div>
        </ModuleCard>
      </section>
    </div>
  );

  const billingModule = (
    <ModuleCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Billing & GST Invoicing</h2>
          <p className="mt-1 text-sm text-slate-500">Create invoices and reconcile payment status.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" data-testid="create-invoice" onClick={() => setActiveModal("invoice")} type="button">
          Create GST invoice
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.invoices.map((invoice) => (
          <div className="rounded-lg border border-slate-200 p-4" key={invoice.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{invoice.id}</p>
                <p className="text-sm text-slate-500">{invoice.member}</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusStyles[invoice.status]}`}>{invoice.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-bold">{formatCurrency(invoice.amount + invoice.gst)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">GST</p>
                <p className="font-bold">{formatCurrency(invoice.gst)}</p>
              </div>
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold disabled:opacity-40" disabled={invoice.status === "paid"} onClick={() => openPaymentModal(invoice, invoice.paymentMode)} type="button">
                Mark paid
              </button>
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );

  const ptModule = (
    <ModuleCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">PT Management</h2>
          <p className="mt-1 text-sm text-slate-500">Extra PT is available as an optional trial or add-on for members who want to try it.</p>
        </div>
        <span className="rounded-md bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">Optional add-on</span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.ptPackages.map((pack) => (
          <div className="grid gap-2 rounded-lg border border-slate-200 p-4" key={pack.id}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-bold">{pack.member}</span>
              <span className="text-slate-500">{pack.sessionsLeft} left</span>
            </div>
            <ProgressBar value={pack.progress} tone="amber" />
            <p className="text-xs text-slate-500">{pack.id} · Trainer {pack.trainer}</p>
            <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => logPtSession(pack.id)} type="button">Log session</button>
          </div>
        ))}
      </div>
    </ModuleCard>
  );

  const staffModule = (
    <ModuleCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Staff Management</h2>
          <p className="mt-1 text-sm text-slate-500">Coach, front desk, and branch operations profiles.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveModal("staff")} type="button">
          Create staff
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.staff.map((staff) => (
          <div className="rounded-lg border border-slate-200 p-4" key={staff.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{staff.name}</p>
                <p className="text-sm text-slate-500">{staff.role} · {staff.branch}</p>
              </div>
              <p className="text-sm font-black text-emerald-700">{staff.attendance}%</p>
            </div>
            <div className="mt-3">
              <Field label="Assigned branch">
                <select className={inputClass} onChange={(event) => updateStaffBranch(staff.id, event.target.value)} value={staff.branch}>
                  {branchOptions.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{staff.bio}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {staff.disciplines.map((discipline) => (
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800" key={discipline}>
                  {discipline}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {moduleAccess.map((access) => (
                <button
                  className={`rounded-md px-2 py-1 text-xs font-bold ${staff.access.includes(access) ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}
                  key={access}
                  onClick={() => toggleStaffAccess(staff.id, access)}
                  type="button"
                >
                  {access}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );

  const classesModule = (
    <ModuleCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Class Scheduling</h2>
          <p className="mt-1 text-sm text-slate-500">Crosstrain Fight Club Saket weekly timetable.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveModal("class")} type="button">
          Schedule class
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.classes.map((slot) => {
          const fillRate = Math.round((slot.booked / slot.capacity) * 100);
          return (
            <div className="grid gap-2 rounded-lg border border-slate-200 p-4" key={slot.id}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-bold">{slot.name}</p>
                  <p className="text-xs text-slate-500">{slot.day} · {slot.time} · {slot.coach}</p>
                </div>
                <p className="text-sm font-bold">{slot.booked}/{slot.capacity}</p>
              </div>
              <ProgressBar value={fillRate} tone="sky" />
              <div className="flex gap-2">
                <button className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => adjustClassBooking(slot.id, 1)} type="button">Book</button>
                <button className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => adjustClassBooking(slot.id, -1)} type="button">Cancel</button>
              </div>
            </div>
          );
        })}
      </div>
    </ModuleCard>
  );

  const leadsModule = (
    <ModuleCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Lead Management</h2>
          <p className="mt-1 text-sm text-slate-500">Capture enquiries, follow-ups, and trial conversions.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveModal("lead")} type="button">
          Capture lead
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.leads.map((lead) => (
          <div className="rounded-lg border border-slate-200 p-4" key={lead.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">{lead.name}</p>
                <p className="text-xs text-slate-500">{lead.source} · Follow-up {lead.nextFollowUp}</p>
              </div>
              <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-bold text-sky-800">{lead.stage}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => advanceLead(lead.id)} type="button">Next stage</button>
              <button
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold"
                onClick={() =>
                  openConfirmDialog({
                    title: "Convert lead",
                    description: `Create a member profile from ${lead.name} and mark this lead as won.`,
                    confirmLabel: "Convert lead",
                    onConfirm: () => convertLead(lead.id),
                  })
                }
                type="button"
              >
                Convert
              </button>
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );

  const membershipModule = (
    <ModuleCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Membership Menu</h2>
          <p className="mt-1 text-sm text-slate-500">Owner-managed packages, pricing, and availability.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => openMembershipModal()} type="button">
          Add membership
        </button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {membershipCategories.map((category) => (
          <div className="rounded-lg border border-slate-200 p-4" key={category}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-950">{category}</p>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                {snapshot.membershipPlans.filter((plan) => plan.category === category && plan.status === "active").length} active
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {snapshot.membershipPlans
                .filter((plan) => plan.category === category)
                .map((plan) => {
                  const used = isMembershipPlanUsed(plan);
                  const assignedMembers = snapshot.members.filter((member) => member.plan === membershipPlanLabel(plan) || member.plan === plan.id).length;
                  return (
                  <div className={`rounded-md border px-3 py-3 text-sm ${plan.status === "archived" ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-200 bg-slate-50"}`} key={plan.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-semibold text-slate-700">{plan.duration}</span>
                        <p className="mt-1 text-xs text-slate-500">{assignedMembers} assigned</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-950">{formatCurrency(plan.price)}</span>
                        <p className={`mt-1 text-xs font-bold ${plan.status === "archived" ? "text-amber-700" : "text-emerald-700"}`}>{plan.status}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800" onClick={() => openMembershipModal(plan)} type="button">
                        Edit
                      </button>
                      {plan.status === "archived" ? (
                        <>
                          <button className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800" onClick={() => restoreMembershipPlan(plan.id)} type="button">
                            Restore
                          </button>
                          {!used ? (
                            <button
                              className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-800"
                              onClick={() =>
                                openConfirmDialog({
                                  title: "Delete membership",
                                  description: `${membershipPlanLabel(plan)} is not assigned to any member. Delete it from the menu?`,
                                  confirmLabel: "Delete",
                                  tone: "danger",
                                  onConfirm: () => deleteMembershipPlan(plan.id),
                                })
                              }
                              type="button"
                            >
                              Delete
                            </button>
                          ) : null}
                        </>
                      ) : used ? (
                        <button
                          className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800"
                          onClick={() =>
                            openConfirmDialog({
                              title: "Archive membership",
                              description: `${membershipPlanLabel(plan)} is assigned to members. Archive it so existing records remain intact.`,
                              confirmLabel: "Archive",
                              onConfirm: () => archiveMembershipPlan(plan.id),
                            })
                          }
                          type="button"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-800"
                          onClick={() =>
                            openConfirmDialog({
                              title: "Delete membership",
                              description: `${membershipPlanLabel(plan)} is not assigned to any member. Delete it from the menu?`,
                              confirmLabel: "Delete",
                              tone: "danger",
                              onConfirm: () => deleteMembershipPlan(plan.id),
                            })
                          }
                          type="button"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-black text-slate-950">Extra PT available</p>
        <p className="mt-1 text-sm text-slate-700">Members can try optional personal training separately from the regular membership packages.</p>
      </div>
    </ModuleCard>
  );

  const plansModule = (
    <ModuleCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Diet & Workout Assignments</h2>
          <p className="mt-1 text-sm text-slate-500">Assign nutrition and workout targets to members.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveModal("plan")} type="button">
          Assign plan
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.plans.map((plan) => (
          <div className="rounded-lg border border-slate-200 p-4" key={plan.id}>
            <p className="font-bold">{plan.member}</p>
            <p className="mt-1 text-sm text-slate-500">{plan.workoutSplit}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-xs text-slate-500">Calories</p><p className="font-black">{plan.calories}</p></div>
              <div><p className="text-xs text-slate-500">Protein</p><p className="font-black">{plan.protein}g</p></div>
              <div><p className="text-xs text-slate-500">Adherence</p><p className="font-black">{plan.adherence}%</p></div>
            </div>
            <div className="mt-4"><ProgressBar value={plan.adherence} /></div>
            <div className="mt-3 flex gap-2">
              <button className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => adjustPlanAdherence(plan.id, 10)} type="button">+10%</button>
              <button className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => adjustPlanAdherence(plan.id, -10)} type="button">-10%</button>
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );

  const qrModule = (
    <div className="grid gap-6">
      <ModuleCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">QR Attendance</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Member scan check-in</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Display this branch QR at the front desk. Members log in from the member portal and scan it to record attendance.
            </p>
          </div>
          <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" href="/member-login">
            Open member login
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <Field label="Branch QR">
              <select className={inputClass} onChange={(event) => setSelectedQrBranch(event.target.value)} value={selectedQrBranch}>
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </Field>
            <div className="mt-4 grid place-items-center rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200">
              {attendanceQrDataUrl ? (
                <img alt={`${selectedQrBranch} attendance QR`} className="size-64" src={attendanceQrDataUrl} />
              ) : (
                <div className="grid size-64 place-items-center rounded-md bg-slate-100 text-sm font-bold text-slate-500">
                  {attendanceQrError || "Generating QR"}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
              Payload date: {getTodayKey()} · QR refreshes when branch changes.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Admin count</p>
                <p className="mt-3 text-3xl font-black">{Math.max(metrics.attendanceToday, todaysAttendanceLogs.length)}</p>
                <p className="mt-1 text-sm text-slate-500">Check-ins today</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">QR branch</p>
                <p className="mt-3 text-xl font-black">{selectedQrBranch}</p>
                <p className="mt-1 text-sm text-slate-500">Active display code</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Demo PIN</p>
                <p className="mt-3 text-xl font-black">1234</p>
                <p className="mt-1 text-sm text-slate-500">Seeded member login</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                <div>
                  <p className="font-black">Latest Attendance Logs</p>
                  <p className="mt-1 text-sm text-slate-500">Member QR scans recorded in demo storage.</p>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                  {todaysAttendanceLogs.length} today
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {latestAttendanceLogs.length ? (
                  latestAttendanceLogs.map((log) => (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm" key={log.id}>
                      <div>
                        <p className="font-bold text-slate-950">{log.memberName}</p>
                        <p className="mt-1 text-xs text-slate-500">{log.branch} · {log.id}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-600">{formatAttendanceDateTime(log.checkedInAt)}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm font-semibold text-slate-500">No QR attendance logs yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModuleCard>
    </div>
  );

  const whatsappRemindersModule = (
    <div className="grid gap-6">
      <ModuleCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">WhatsApp Business API</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Membership expiry reminders</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Select members whose membership is expiring soon and send renewal reminders through the server-side WhatsApp API route.
            </p>
          </div>
          <Field label="Expiring within">
            <select className={`${inputClass} min-w-40`} onChange={(event) => setReminderDaysWindow(event.target.value)} value={reminderDaysWindow}>
              <option value="7">7 days</option>
              <option value="15">15 days</option>
              <option value="30">30 days</option>
              <option value="45">45 days</option>
              <option value="60">60 days</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Eligible members</p>
            <p className="mt-3 text-3xl font-black">{membershipReminders.length}</p>
            <p className="mt-1 text-sm text-slate-500">Expiring soon</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Selected</p>
            <p className="mt-3 text-3xl font-black">{selectedReminders.length}</p>
            <p className="mt-1 text-sm text-slate-500">Ready to send</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">API config</p>
            <p className={`mt-3 text-sm font-black ${whatsAppConfigStatus?.configured ? "text-emerald-700" : "text-rose-700"}`}>
              {whatsAppConfigStatus?.configured ? "Ready for manual send" : "Server env required"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {whatsAppConfigStatus
                ? `${whatsAppConfigStatus.apiVersion} - ${whatsAppConfigStatus.sendMode === "template" ? "Template" : "Text"} mode`
                : "Checking WhatsApp API route"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-3">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Manual trigger</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
              <p>
                <span className="font-bold text-slate-900">Phone number ID:</span>{" "}
                {whatsAppConfigStatus?.hasPhoneNumberId ? "configured" : "missing"}
              </p>
              <p>
                <span className="font-bold text-slate-900">Access token:</span>{" "}
                {whatsAppConfigStatus?.hasToken ? "configured" : "missing"}
              </p>
              <p>
                <span className="font-bold text-slate-900">Template:</span>{" "}
                {whatsAppConfigStatus?.templateName ?? "not configured"}
              </p>
            </div>
          </div>
        </div>
      </ModuleCard>

      <ModuleCard className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-xl font-black">Reminder Queue</h2>
            <p className="mt-1 text-sm text-slate-500">Preview message text before sending.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-50"
              disabled={!membershipReminders.length}
              onClick={() => setAllReminderSelections(membershipReminders)}
              type="button"
            >
              Select all
            </button>
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800"
              onClick={() => {
                setSelectedReminderIds([]);
                setReminderResults([]);
                setReminderError("");
              }}
              type="button"
            >
              Clear
            </button>
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={reminderSending || !selectedReminders.length}
              onClick={sendMembershipReminders}
              type="button"
            >
              {reminderSending ? "Sending..." : "Send WhatsApp reminders"}
            </button>
          </div>
        </div>

        {reminderError ? <div className="m-5 rounded-md bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{reminderError}</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Send</th>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Expiry</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {membershipReminders.length ? (
                membershipReminders.map((reminder) => (
                  <tr key={reminder.memberId}>
                    <td className="px-5 py-4">
                      <input
                        checked={selectedReminderIds.includes(reminder.memberId)}
                        className={checkBoxClass}
                        onChange={() => toggleReminderSelection(reminder.memberId)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold">{reminder.memberName}</div>
                      <div className="text-xs text-slate-500">{reminder.plan}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold">{reminder.expiry}</span>
                      <div className="text-xs text-slate-500">{reminder.daysUntilExpiry} days left</div>
                    </td>
                    <td className="px-5 py-4 font-semibold">+{reminder.phone}</td>
                    <td className="px-5 py-4 text-sm leading-6 text-slate-600">{reminder.message}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-6 text-sm font-semibold text-slate-500" colSpan={5}>
                    No members expire within the selected window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ModuleCard>

      {reminderResults.length ? (
        <ModuleCard>
          <h2 className="text-xl font-black">Send Results</h2>
          <div className="mt-4 grid gap-3">
            {reminderResults.map((result) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4 text-sm" key={`${result.memberId}-${result.phone}`}>
                <div>
                  <p className="font-bold text-slate-950">{result.memberName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    +{result.phone}
                    {result.messageId ? ` - ${result.messageId}` : ""}
                  </p>
                </div>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${result.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                  {result.ok ? "sent" : result.error ?? "failed"}
                </span>
              </div>
            ))}
          </div>
        </ModuleCard>
      ) : null}
    </div>
  );

  const overviewModule = (
    <div className="grid gap-6">
      {metricCards}
      <section className="grid gap-3 md:grid-cols-3">
        {snapshot.branches.map((branch) => (
          <ModuleCard className="p-4" key={branch.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{branch.name}</p>
                <p className="mt-1 text-sm text-slate-500">{branch.area}, {branch.city}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{branch.address}</p>
                <p className="mt-1 text-xs font-bold text-slate-700">{branch.phone}</p>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">{branch.status}</span>
            </div>
          </ModuleCard>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {reportsModule}
        {paymentsModule}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Member Management", "Profiles, subscriptions, dues, and PT assignment."],
          ["Member Wellness", "Measurements, BMI, BMR, PAR-Q, and medical history."],
          ["Billing & GST", "Invoices, GST totals, payments, and dues."],
          ["Staff", "Accounts, roles, permissions, attendance, performance."],
          ["Classes & Leads", "Capacity, bookings, follow-ups, conversion."],
          ["Plans", "Macros, workout routines, adherence tracking."],
        ].map(([title, body]) => (
          <ModuleCard className="p-4" key={title}>
            <p className="font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
          </ModuleCard>
        ))}
      </section>
    </div>
  );

  const modules: Record<AdminModule, React.ReactNode> = {
    overview: overviewModule,
    members: membersModule,
    "member-health": memberHealthModule,
    membership: membershipModule,
    billing: billingModule,
    payments: paymentsModule,
    pt: ptModule,
    staff: staffModule,
    reports: reportsModule,
    classes: classesModule,
    leads: leadsModule,
    plans: plansModule,
    "qr-attendance": qrModule,
    "whatsapp-reminders": whatsappRemindersModule,
  };

  if (!adminChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 py-6 text-slate-950">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Crosstrain Admin</p>
          <h1 className="mt-2 text-3xl font-black">Checking session</h1>
        </section>
      </main>
    );
  }

  if (!adminName) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 py-6 text-slate-950">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Crosstrain Admin</p>
          <h1 className="mt-2 text-3xl font-black">Login Required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Log in as an admin before opening the dashboard.</p>
          <Link className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-bold text-white" href="/login">
            Go to admin login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-slate-950">
      {toast ? (
        <div className="fixed right-4 top-4 z-50 rounded-md bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg">
          {toast.message}
        </div>
      ) : null}

      {activeModal === "member" ? (
        <Modal
          description="Create a member profile, assign the starting plan, and set the trainer without leaving the current workspace."
          onClose={() => setActiveModal(null)}
          title="New member"
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitMemberModal}>
            <Field label="Name">
              <input className={inputClass} name="name" onChange={(event) => setMemberForm({ ...memberForm, name: event.target.value })} placeholder="Member name" value={memberForm.name} />
            </Field>
            <Field label="Phone">
              <input className={inputClass} name="phone" onChange={(event) => setMemberForm({ ...memberForm, phone: event.target.value })} placeholder="+91" value={memberForm.phone} />
            </Field>
            <Field label="Branch">
              <select className={inputClass} name="branch" onChange={(event) => setMemberForm({ ...memberForm, branch: event.target.value })} value={memberForm.branch}>
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </Field>
            <Field label="Plan">
              <select className={inputClass} name="plan" onChange={(event) => setMemberForm({ ...memberForm, plan: event.target.value })} value={memberForm.plan}>
                {activeMembershipPlans.map((plan) => (
                  <option key={plan.id} value={membershipPlanLabel(plan)}>
                    {membershipPlanLabel(plan)} - {formatCurrency(plan.price)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className={inputClass} name="status" onChange={(event) => setMemberForm({ ...memberForm, status: event.target.value as MemberStatus })} value={memberForm.status}>
                <option value="active">Active</option>
                <option value="due">Due</option>
                <option value="paused">Paused</option>
                <option value="lead">Lead</option>
              </select>
            </Field>
            <Field label="Expiry">
              <input className={inputClass} name="expiry" onChange={(event) => setMemberForm({ ...memberForm, expiry: event.target.value })} value={memberForm.expiry} />
            </Field>
            <Field label="Trainer">
              <select className={inputClass} name="trainer" onChange={(event) => setMemberForm({ ...memberForm, trainer: event.target.value })} value={memberForm.trainer}>
                <option value="Unassigned">Unassigned</option>
                {trainerOptions.map((trainer) => (
                  <option key={trainer} value={trainer}>{trainer}</option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-2 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">
                Cancel
              </button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" data-testid="add-member" type="submit">
                Add member
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "measurement" ? (
        <Modal
          description="Member-facing body measurement entry. BMI and BMR are calculated automatically for the admin record."
          onClose={() => setActiveModal(null)}
          title="Add body measurement"
        >
          <form className="grid gap-4 md:grid-cols-4" onSubmit={submitMeasurementModal}>
            <Field label="Member">
              <select className={inputClass} name="member" onChange={(event) => setMeasurementForm({ ...measurementForm, member: event.target.value })} value={measurementForm.member}>
                {snapshot.members.map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sex">
              <select className={inputClass} name="sex" onChange={(event) => setMeasurementForm({ ...measurementForm, sex: event.target.value as BodyMeasurement["sex"] })} value={measurementForm.sex}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Age">
              <input className={inputClass} inputMode="numeric" name="age" onChange={(event) => setMeasurementForm({ ...measurementForm, age: event.target.value })} value={measurementForm.age} />
            </Field>
            <Field label="Height cm">
              <input className={inputClass} inputMode="decimal" name="heightCm" onChange={(event) => setMeasurementForm({ ...measurementForm, heightCm: event.target.value })} value={measurementForm.heightCm} />
            </Field>
            <Field label="Weight kg">
              <input className={inputClass} inputMode="decimal" name="weightKg" onChange={(event) => setMeasurementForm({ ...measurementForm, weightKg: event.target.value })} value={measurementForm.weightKg} />
            </Field>
            <Field label="Chest cm">
              <input className={inputClass} inputMode="decimal" name="chestCm" onChange={(event) => setMeasurementForm({ ...measurementForm, chestCm: event.target.value })} value={measurementForm.chestCm} />
            </Field>
            <Field label="Waist cm">
              <input className={inputClass} inputMode="decimal" name="waistCm" onChange={(event) => setMeasurementForm({ ...measurementForm, waistCm: event.target.value })} value={measurementForm.waistCm} />
            </Field>
            <Field label="Hip cm">
              <input className={inputClass} inputMode="decimal" name="hipCm" onChange={(event) => setMeasurementForm({ ...measurementForm, hipCm: event.target.value })} value={measurementForm.hipCm} />
            </Field>
            <Field label="Body fat %">
              <input className={inputClass} inputMode="decimal" name="bodyFatPercent" onChange={(event) => setMeasurementForm({ ...measurementForm, bodyFatPercent: event.target.value })} value={measurementForm.bodyFatPercent} />
            </Field>
            <div className="rounded-lg bg-slate-50 p-4 md:col-span-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Calculated preview</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <p className="text-sm font-bold text-slate-800">BMI {calculateBmi(Number(measurementForm.heightCm), Number(measurementForm.weightKg))}</p>
                <p className="text-sm font-bold text-slate-800">
                  BMR {calculateBmr(Number(measurementForm.heightCm), Number(measurementForm.weightKg), Number(measurementForm.age), measurementForm.sex)} kcal
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-4 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Save measurement</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "parq" ? (
        <Modal
          description="Member-facing PAR-Q fitness readiness form. Any yes answer flags the profile for coach review."
          onClose={() => setActiveModal(null)}
          title="Fill PAR-Q form"
        >
          <form className="grid gap-4" onSubmit={submitParqModal}>
            <Field label="Member">
              <select className={inputClass} name="member" onChange={(event) => setParqForm({ ...parqForm, member: event.target.value })} value={parqForm.member}>
                {snapshot.members.map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid gap-2">
              {parqQuestions.map((question) => (
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700" key={question}>
                  <input
                    checked={parqForm.yesAnswers.includes(question)}
                    className={checkBoxClass}
                    name="yesAnswers"
                    onChange={(event) =>
                      setParqForm((current) => ({
                        ...current,
                        yesAnswers: event.target.checked
                          ? [...current.yesAnswers, question]
                          : current.yesAnswers.filter((item) => item !== question),
                      }))
                    }
                    type="checkbox"
                    value={question}
                  />
                  <span>{question}</span>
                </label>
              ))}
            </div>
            <Field label="Notes">
              <textarea className={`${inputClass} min-h-24 resize-y`} name="notes" onChange={(event) => setParqForm({ ...parqForm, notes: event.target.value })} value={parqForm.notes} />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Submit PAR-Q</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "medical" ? (
        <Modal
          description="Member-facing medical history form. Submitted conditions, allergies, and medications are visible to admins and coaches."
          onClose={() => setActiveModal(null)}
          title="Fill medical history"
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitMedicalModal}>
            <Field label="Member">
              <select className={inputClass} name="member" onChange={(event) => setMedicalForm({ ...medicalForm, member: event.target.value })} value={medicalForm.member}>
                {snapshot.members.map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Emergency contact">
              <input className={inputClass} name="emergencyContact" onChange={(event) => setMedicalForm({ ...medicalForm, emergencyContact: event.target.value })} placeholder="Name, phone" value={medicalForm.emergencyContact} />
            </Field>
            <Field label="Conditions">
              <input className={inputClass} name="conditions" onChange={(event) => setMedicalForm({ ...medicalForm, conditions: event.target.value })} placeholder="Comma-separated, if any" value={medicalForm.conditions} />
            </Field>
            <Field label="Allergies">
              <input className={inputClass} name="allergies" onChange={(event) => setMedicalForm({ ...medicalForm, allergies: event.target.value })} placeholder="None" value={medicalForm.allergies} />
            </Field>
            <Field label="Medications">
              <input className={inputClass} name="medications" onChange={(event) => setMedicalForm({ ...medicalForm, medications: event.target.value })} placeholder="None" value={medicalForm.medications} />
            </Field>
            <Field label="Notes">
              <textarea className={`${inputClass} min-h-24 resize-y`} name="notes" onChange={(event) => setMedicalForm({ ...medicalForm, notes: event.target.value })} value={medicalForm.notes} />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-2 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Submit medical history</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "staff" ? (
        <Modal
          description="Add a staff profile with the right role. Permissions can still be tuned from the staff card after creation."
          onClose={() => setActiveModal(null)}
          title="Create staff"
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitStaffModal}>
            <Field label="Name">
              <input className={inputClass} name="name" onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} placeholder="Staff name" value={staffForm.name} />
            </Field>
            <Field label="Role">
              <select className={inputClass} name="role" onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value as StaffMember["role"] })} value={staffForm.role}>
                <option value="Trainer">Trainer</option>
                <option value="Manager">Manager</option>
                <option value="Front Desk">Front Desk</option>
                <option value="Owner">Owner</option>
              </select>
            </Field>
            <Field label="Branch">
              <select className={inputClass} name="branch" onChange={(event) => setStaffForm({ ...staffForm, branch: event.target.value })} value={staffForm.branch}>
                {branchOptions.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-2 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">
                Cancel
              </button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">
                Create staff
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "membership" ? (
        <Modal
          description="Owner controls for the public membership menu. Delete unused packages or archive packages already assigned to members."
          onClose={() => {
            setActiveModal(null);
            setEditingMembershipId(null);
          }}
          title={editingMembershipId ? "Edit membership" : "Add membership"}
        >
          <form className="grid gap-4 md:grid-cols-3" onSubmit={submitMembershipModal}>
            <Field label="Category">
              <select className={inputClass} name="category" onChange={(event) => setMembershipForm({ ...membershipForm, category: event.target.value as MembershipPlan["category"] })} value={membershipForm.category}>
                {membershipCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Field label="Duration">
              <input className={inputClass} name="duration" onChange={(event) => setMembershipForm({ ...membershipForm, duration: event.target.value })} placeholder="1 Month" value={membershipForm.duration} />
            </Field>
            <Field label="Price">
              <input className={inputClass} inputMode="numeric" name="price" onChange={(event) => setMembershipForm({ ...membershipForm, price: event.target.value })} placeholder="10000" value={membershipForm.price} />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-3 md:flex-row md:justify-end">
              <button
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800"
                onClick={() => {
                  setActiveModal(null);
                  setEditingMembershipId(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">
                {editingMembershipId ? "Save changes" : "Add membership"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "invoice" ? (
        <Modal description="Create a GST invoice with amount, status, and payment mode." onClose={() => setActiveModal(null)} title="Create GST invoice">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitInvoiceModal}>
            <Field label="Member">
              <select className={inputClass} name="member" onChange={(event) => setInvoiceForm({ ...invoiceForm, member: event.target.value })} value={invoiceForm.member}>
                {snapshot.members.map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount before GST">
              <input className={inputClass} inputMode="numeric" name="amount" onChange={(event) => setInvoiceForm({ ...invoiceForm, amount: event.target.value })} value={invoiceForm.amount} />
            </Field>
            <Field label="Status">
              <select className={inputClass} name="status" onChange={(event) => setInvoiceForm({ ...invoiceForm, status: event.target.value as InvoiceStatus })} value={invoiceForm.status}>
                <option value="draft">Draft</option>
                <option value="due">Due</option>
                <option value="paid">Paid</option>
              </select>
            </Field>
            <Field label="Mode">
              <select className={inputClass} name="paymentMode" onChange={(event) => setInvoiceForm({ ...invoiceForm, paymentMode: event.target.value as Invoice["paymentMode"] })} value={invoiceForm.paymentMode}>
                <option value="Cash">Cash</option>
                <option value="Google Pay Screenshot">Google Pay screenshot</option>
                <option value="Razorpay">Razorpay (future)</option>
              </select>
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-2 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Create invoice</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "payment" ? (
        <Modal description="Confirm the payment mode before marking this invoice as paid." onClose={() => setActiveModal(null)} title="Record payment">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitPaymentModal}>
            <input name="invoiceId" type="hidden" value={paymentForm.invoiceId} />
            <Field label="Invoice">
              <input className={inputClass} disabled value={paymentForm.invoiceId} />
            </Field>
            <Field label="Payment mode">
              <select className={inputClass} name="paymentMode" onChange={(event) => setPaymentForm({ ...paymentForm, paymentMode: event.target.value as Invoice["paymentMode"] })} value={paymentForm.paymentMode}>
                <option value="Cash">Cash</option>
                <option value="Google Pay Screenshot">Google Pay screenshot</option>
                <option value="Razorpay">Razorpay (future)</option>
              </select>
            </Field>
            <Field label="Reference note">
              <input className={inputClass} name="reference" onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} placeholder="Cash receipt or screenshot note" value={paymentForm.reference} />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-2 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Mark paid</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "pt" ? (
        <Modal description="Assign optional personal training sessions to a member." onClose={() => setActiveModal(null)} title="Add PT package">
          <form className="grid gap-4 md:grid-cols-3" onSubmit={submitPtModal}>
            <Field label="Member">
              <select className={inputClass} name="member" onChange={(event) => setPtForm({ ...ptForm, member: event.target.value })} value={ptForm.member}>
                {snapshot.members.map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Trainer">
              <select className={inputClass} name="trainer" onChange={(event) => setPtForm({ ...ptForm, trainer: event.target.value })} value={ptForm.trainer}>
                <option value="Unassigned">Unassigned</option>
                {trainerOptions.map((trainer) => (
                  <option key={trainer} value={trainer}>{trainer}</option>
                ))}
              </select>
            </Field>
            <Field label="Sessions">
              <input className={inputClass} inputMode="numeric" name="sessionsLeft" onChange={(event) => setPtForm({ ...ptForm, sessionsLeft: event.target.value })} value={ptForm.sessionsLeft} />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-3 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Assign PT</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "class" ? (
        <Modal description="Add a class to the weekly schedule." onClose={() => setActiveModal(null)} title="Schedule class">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitClassModal}>
            <Field label="Day">
              <select className={inputClass} name="day" onChange={(event) => setClassForm({ ...classForm, day: event.target.value as Weekday })} value={classForm.day}>
                {weekdays.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </Field>
            <Field label="Class">
              <input className={inputClass} name="name" onChange={(event) => setClassForm({ ...classForm, name: event.target.value })} placeholder="Muay Thai, BJJ..." value={classForm.name} />
            </Field>
            <Field label="Coach">
              <input className={inputClass} name="coach" onChange={(event) => setClassForm({ ...classForm, coach: event.target.value })} value={classForm.coach} />
            </Field>
            <Field label="Time">
              <input className={inputClass} name="time" onChange={(event) => setClassForm({ ...classForm, time: event.target.value })} value={classForm.time} />
            </Field>
            <Field label="Capacity">
              <input className={inputClass} inputMode="numeric" name="capacity" onChange={(event) => setClassForm({ ...classForm, capacity: event.target.value })} value={classForm.capacity} />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-2 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Schedule class</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "lead" ? (
        <Modal description="Capture a new enquiry and follow-up date." onClose={() => setActiveModal(null)} title="Capture lead">
          <form className="grid gap-4 md:grid-cols-3" onSubmit={submitLeadModal}>
            <Field label="Name">
              <input className={inputClass} name="name" onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} placeholder="Lead name" value={leadForm.name} />
            </Field>
            <Field label="Source">
              <input className={inputClass} name="source" onChange={(event) => setLeadForm({ ...leadForm, source: event.target.value })} value={leadForm.source} />
            </Field>
            <Field label="Follow-up">
              <input className={inputClass} name="nextFollowUp" onChange={(event) => setLeadForm({ ...leadForm, nextFollowUp: event.target.value })} value={leadForm.nextFollowUp} />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-3 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Capture lead</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "plan" ? (
        <Modal description="Assign diet and workout targets to a member." onClose={() => setActiveModal(null)} title="Assign diet plan">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submitPlanModal}>
            <Field label="Member">
              <select className={inputClass} name="member" onChange={(event) => setPlanForm({ ...planForm, member: event.target.value })} value={planForm.member}>
                {snapshot.members.map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Calories">
              <input className={inputClass} inputMode="numeric" name="calories" onChange={(event) => setPlanForm({ ...planForm, calories: event.target.value })} value={planForm.calories} />
            </Field>
            <Field label="Protein">
              <input className={inputClass} inputMode="numeric" name="protein" onChange={(event) => setPlanForm({ ...planForm, protein: event.target.value })} value={planForm.protein} />
            </Field>
            <Field label="Workout">
              <input className={inputClass} name="workoutSplit" onChange={(event) => setPlanForm({ ...planForm, workoutSplit: event.target.value })} value={planForm.workoutSplit} />
            </Field>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 md:col-span-2 md:flex-row md:justify-end">
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" type="submit">Assign plan</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeModal === "confirm" && confirmDialog ? (
        <Modal description={confirmDialog.description} onClose={() => setActiveModal(null)} title={confirmDialog.title}>
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal(null)} type="button">Cancel</button>
            <button
              className={`rounded-md px-4 py-2 text-sm font-bold text-white ${confirmDialog.tone === "danger" ? "bg-rose-700" : "bg-slate-950"}`}
              onClick={() => {
                confirmDialog.onConfirm();
                setActiveModal(null);
                setConfirmDialog(null);
              }}
              type="button"
            >
              {confirmDialog.confirmLabel}
            </button>
          </div>
        </Modal>
      ) : null}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white px-5 py-6 transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:block ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          {/* Close button (mobile only) */}
          <div className="flex items-center justify-between lg:hidden">
            <Link className="flex items-center gap-3" href="/">
              <div className="grid size-11 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">CT</div>
              <div>
                <p className="text-lg font-bold">Crosstrain Admin panel</p>
                <p className="text-xs font-medium text-slate-500">Gym operations suite</p>
              </div>
            </Link>
            <button
              className="grid size-9 place-items-center rounded-md border border-slate-200 bg-slate-50 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              onClick={() => setSidebarOpen(false)}
              type="button"
              aria-label="Close navigation"
            >
              X
            </button>
          </div>

          {/* Desktop logo (hidden on mobile) */}
          <Link className="hidden items-center gap-3 lg:flex" href="/">
            <div className="grid size-11 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">CT</div>
            <div>
              <p className="text-lg font-bold">Crosstrain Admin panel</p>
              <p className="text-xs font-medium text-slate-500">Gym operations suite</p>
            </div>
          </Link>
          <section className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Branches</p>
            <div className="mt-3 grid gap-2">
              {snapshot.branches.map((branch) => (
                <p className="text-sm font-semibold text-slate-700" key={branch.id}>{branch.name}</p>
              ))}
            </div>
          </section>

          <nav className="mt-8 grid gap-1">
            {routes.map((route) => (
              <Link
                className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                  route.key === module ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
                href={route.href}
                key={route.key}
                onClick={() => setSidebarOpen(false)}
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <section className="mt-8 rounded-lg border border-slate-200 bg-[#eef7f1] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">QR Attendance</p>
            <p className="mt-4 text-2xl font-black text-slate-900">{metrics.attendanceToday}</p>
            <p className="text-xs text-slate-600">Display-only scanner route</p>
            <Link
              className="mt-4 inline-flex rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm"
              href="/qr-attendance"
              onClick={() => setSidebarOpen(false)}
            >
              Open QR page
            </Link>
          </section>
        </aside>

        {/* Main content */}
        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              {/* Hamburger toggle (mobile only) */}
              <button
                className="grid place-items-center rounded-md border border-slate-300 bg-white p-2 text-slate-800 transition hover:bg-slate-50 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                type="button"
                aria-label="Open navigation"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <p className="text-sm font-semibold text-emerald-700">Crosstrain Admin panel</p>
                <h1 className="mt-1 text-3xl font-black tracking-normal sm:text-4xl">{pageTitle}</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">Signed in as {adminName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveModal("member")} type="button">
                New member
              </button>
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={() => setActiveModal("invoice")} type="button">
                Create invoice
              </button>
              <button
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800"
                onClick={() =>
                  openConfirmDialog({
                    title: "Reset demo data",
                    description: "This clears saved browser data and restores the seeded admin snapshot.",
                    confirmLabel: "Reset demo",
                    tone: "danger",
                    onConfirm: resetDemoData,
                  })
                }
                type="button"
              >
                Reset demo
              </button>
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={logoutAdmin} type="button">
                Logout
              </button>
            </div>
          </header>

          <div
            className={`mt-5 rounded-lg border px-4 py-3 text-sm font-bold ${
              snapshot.dbStatus?.connected
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {snapshot.dbStatus?.message ?? "Database status unknown. Refresh the page to verify persistence."}
          </div>

          <div className="mt-6 grid gap-6">
            {modules[module]}
          </div>
        </section>
      </div>
    </main>
  );
}
