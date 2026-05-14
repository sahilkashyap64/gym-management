"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  ClassSlot,
  DashboardSnapshot,
  Invoice,
  Lead,
  MembershipPlan,
  Member,
  MemberStatus,
  PlanAssignment,
  StaffMember,
  Weekday,
} from "@/lib/gym-data";

export type AdminModule =
  | "overview"
  | "members"
  | "membership"
  | "billing"
  | "payments"
  | "pt"
  | "staff"
  | "reports"
  | "classes"
  | "leads"
  | "plans"
  | "qr-attendance";

type PtPackage = DashboardSnapshot["ptPackages"][number];
type LeadStage = Lead["stage"];
type InvoiceStatus = Invoice["status"];
type Toast = { id: number; message: string };
type ActiveModal = "member" | "staff" | "membership" | null;

const storageKey = "crosstrain-admin-snapshot-v8";
const moduleAccess = ["Members", "Membership", "Billing", "Payments", "QR", "PT", "Staff", "Classes", "Leads", "Plans", "Reports"];
const leadStages: LeadStage[] = ["New", "Follow-up", "Trial booked", "Won"];
const weekdays: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const membershipCategories: MembershipPlan["category"][] = ["Regular", "3 Days a Week", "2 Days a Week"];

const routes: Array<{ key: AdminModule; label: string; href: string }> = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "members", label: "Members", href: "/members" },
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

function membershipPlanLabel(plan: MembershipPlan) {
  return `${plan.category} ${plan.duration}`;
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
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
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

  useEffect(() => {
    let mounted = true;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      window.setTimeout(() => {
        if (mounted) setSnapshot(restoreSnapshot(JSON.parse(saved) as DashboardSnapshot, initialSnapshot));
      }, 0);
    }
    return () => {
      mounted = false;
    };
  }, [initialSnapshot]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, [snapshot]);

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

  function flash(message: string) {
    toastId.current += 1;
    setToast({ id: toastId.current, message });
  }

  function updateSnapshot(updater: (current: DashboardSnapshot) => DashboardSnapshot, message: string) {
    setSnapshot((current) => updater(current));
    flash(message);
  }

  function resetDemoData() {
    window.localStorage.removeItem(storageKey);
    setSnapshot(initialSnapshot);
    flash("Demo data reset");
  }

  function submitForm(event: FormEvent<HTMLFormElement>, action: (formData: FormData) => void) {
    event.preventDefault();
    action(new FormData(event.currentTarget));
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

  function addMember(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const member: Member = {
      id: createId("MBR", snapshot.members.length + 1100),
      name,
      phone: String(formData.get("phone") ?? ""),
      branch: String(formData.get("branch") ?? "Delhi Branch"),
      plan: String(formData.get("plan") ?? "Regular 1 Month"),
      status: String(formData.get("status") ?? "active") as MemberStatus,
      expiry: String(formData.get("expiry") ?? "30 Jun 2026"),
      dues: 0,
      lastCheckIn: "Not checked in yet",
      trainer: String(formData.get("trainer") ?? "Unassigned"),
    };
    updateSnapshot((current) => ({ ...current, members: [member, ...current.members] }), "Member added");
    setMemberForm({ ...memberForm, name: "", phone: "", trainer: "Unassigned" });
  }

  function updateMemberStatus(id: string, status: MemberStatus) {
    updateSnapshot(
      (current) => ({
        ...current,
        members: current.members.map((member) =>
          member.id === id
            ? { ...member, status, dues: status === "due" ? Math.max(member.dues, 2500) : member.dues }
            : member,
        ),
      }),
      "Member status updated",
    );
  }

  function updateMemberBranch(id: string, branch: string) {
    updateSnapshot(
      (current) => ({
        ...current,
        members: current.members.map((member) => (member.id === id ? { ...member, branch } : member)),
      }),
      "Member branch updated",
    );
  }

  function updateMemberTrainer(id: string, trainer: string) {
    updateSnapshot(
      (current) => ({
        ...current,
        members: current.members.map((member) => (member.id === id ? { ...member, trainer } : member)),
      }),
      "Member trainer updated",
    );
  }

  function addInvoice(formData: FormData) {
    const amount = Number(formData.get("amount") ?? 0);
    if (!amount) return;
    const invoice: Invoice = {
      id: createId("INV", snapshot.invoices.length + 2600),
      member: String(formData.get("member") ?? ""),
      amount,
      gst: Math.round(amount * 0.18),
      status: String(formData.get("status") ?? "draft") as InvoiceStatus,
      issuedOn: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date()),
      paymentMode: String(formData.get("paymentMode") ?? "Cash") as Invoice["paymentMode"],
    };
    updateSnapshot(
      (current) => ({
        ...current,
        invoices: [invoice, ...current.invoices],
        members: current.members.map((member) =>
          member.name === invoice.member && invoice.status === "due"
            ? { ...member, status: "due", dues: member.dues + invoice.amount + invoice.gst }
            : member,
        ),
      }),
      "Invoice created",
    );
  }

  function markInvoicePaid(id: string) {
    updateSnapshot(
      (current) => {
        const invoice = current.invoices.find((item) => item.id === id);
        return {
          ...current,
          invoices: current.invoices.map((item) => (item.id === id ? { ...item, status: "paid" } : item)),
          members: current.members.map((member) =>
            invoice && member.name === invoice.member
              ? { ...member, status: "active", dues: Math.max(0, member.dues - invoice.amount - invoice.gst) }
              : member,
          ),
        };
      },
      "Payment captured and receipt reconciled",
    );
  }

  function addPtPackage(member: string) {
    const trainer = snapshot.members.find((item) => item.name === member)?.trainer ?? "Unassigned";
    const pack: PtPackage = {
      id: createId("PT", snapshot.ptPackages.length + 800),
      member,
      trainer,
      sessionsLeft: 12,
      progress: 0,
    };
    updateSnapshot((current) => ({ ...current, ptPackages: [pack, ...current.ptPackages] }), "PT package assigned");
  }

  function logPtSession(id: string) {
    updateSnapshot(
      (current) => ({
        ...current,
        ptPackages: current.ptPackages.map((pack) =>
          pack.id === id
            ? { ...pack, sessionsLeft: Math.max(0, pack.sessionsLeft - 1), progress: Math.min(100, pack.progress + 8) }
            : pack,
        ),
      }),
      "PT session logged",
    );
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
    updateSnapshot((current) => ({ ...current, staff: [staff, ...current.staff] }), "Staff account created");
    setStaffForm({ ...staffForm, name: "" });
  }

  function updateStaffBranch(id: string, branch: string) {
    updateSnapshot(
      (current) => ({
        ...current,
        staff: current.staff.map((staff) => (staff.id === id ? { ...staff, branch } : staff)),
      }),
      "Staff branch updated",
    );
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
    const membershipPlan: MembershipPlan = {
      id: createId("MEM", snapshot.membershipPlans.length + 100),
      category,
      duration,
      price,
      status: "active",
    };
    updateSnapshot((current) => ({ ...current, membershipPlans: [membershipPlan, ...current.membershipPlans] }), "Membership plan added");
  }

  function updateMembershipPlan(id: string, formData: FormData) {
    const category = String(formData.get("category") ?? "Regular") as MembershipPlan["category"];
    const duration = String(formData.get("duration") ?? "").trim();
    const price = Number(formData.get("price") ?? 0);
    if (!duration || !price) return;
    updateSnapshot(
      (current) => ({
        ...current,
        membershipPlans: current.membershipPlans.map((plan) =>
          plan.id === id ? { ...plan, category, duration, price } : plan,
        ),
      }),
      "Membership plan updated",
    );
  }

  function archiveMembershipPlan(id: string) {
    updateSnapshot(
      (current) => ({
        ...current,
        membershipPlans: current.membershipPlans.map((plan) => (plan.id === id ? { ...plan, status: "archived" } : plan)),
      }),
      "Membership plan archived",
    );
  }

  function restoreMembershipPlan(id: string) {
    updateSnapshot(
      (current) => ({
        ...current,
        membershipPlans: current.membershipPlans.map((plan) => (plan.id === id ? { ...plan, status: "active" } : plan)),
      }),
      "Membership plan restored",
    );
  }

  function deleteMembershipPlan(id: string) {
    const plan = snapshot.membershipPlans.find((item) => item.id === id);
    if (plan && isMembershipPlanUsed(plan)) {
      archiveMembershipPlan(id);
      return;
    }
    updateSnapshot(
      (current) => ({
        ...current,
        membershipPlans: current.membershipPlans.filter((plan) => plan.id !== id),
      }),
      "Membership plan deleted",
    );
  }

  function toggleStaffAccess(id: string, access: string) {
    updateSnapshot(
      (current) => ({
        ...current,
        staff: current.staff.map((staff) =>
          staff.id === id
            ? {
                ...staff,
                access: staff.access.includes(access)
                  ? staff.access.filter((item) => item !== access)
                  : [...staff.access, access],
              }
            : staff,
        ),
      }),
      "Staff permission updated",
    );
  }

  function addClass(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const slot: ClassSlot = {
      id: createId("CLS", snapshot.classes.length + 20),
      day: String(formData.get("day") ?? "Monday") as Weekday,
      name,
      coach: String(formData.get("coach") ?? ""),
      time: String(formData.get("time") ?? "7:00 PM"),
      booked: 0,
      capacity: Number(formData.get("capacity") ?? 20),
    };
    updateSnapshot((current) => ({ ...current, classes: [slot, ...current.classes] }), "Class scheduled");
    setClassForm({ ...classForm, name: "", coach: "" });
  }

  function adjustClassBooking(id: string, delta: 1 | -1) {
    updateSnapshot(
      (current) => ({
        ...current,
        classes: current.classes.map((slot) =>
          slot.id === id ? { ...slot, booked: Math.max(0, Math.min(slot.capacity, slot.booked + delta)) } : slot,
        ),
      }),
      delta > 0 ? "Class slot booked" : "Class booking cancelled",
    );
  }

  function addLead(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    const lead: Lead = {
      id: createId("LED", snapshot.leads.length + 500),
      name,
      source: String(formData.get("source") ?? "Walk-in"),
      stage: "New",
      nextFollowUp: String(formData.get("nextFollowUp") ?? "Tomorrow"),
    };
    updateSnapshot((current) => ({ ...current, leads: [lead, ...current.leads] }), "Lead captured");
    setLeadForm({ ...leadForm, name: "" });
  }

  function advanceLead(id: string) {
    updateSnapshot(
      (current) => ({
        ...current,
        leads: current.leads.map((lead) => {
          if (lead.id !== id) return lead;
          const nextIndex = Math.min(leadStages.indexOf(lead.stage) + 1, leadStages.length - 1);
          return { ...lead, stage: leadStages[nextIndex] };
        }),
      }),
      "Lead stage updated",
    );
  }

  function convertLead(id: string) {
    updateSnapshot(
      (current) => {
        const lead = current.leads.find((item) => item.id === id);
        if (!lead) return current;
        const member: Member = {
          id: createId("MBR", current.members.length + 1100),
          name: lead.name,
          phone: "Pending",
          branch: "Delhi Branch",
          plan: "Trial Converted",
          status: "active",
          expiry: "30 Jun 2026",
          dues: 0,
          lastCheckIn: "Not checked in yet",
          trainer: "Unassigned",
        };
        return {
          ...current,
          leads: current.leads.map((item) => (item.id === id ? { ...item, stage: "Won" } : item)),
          members: [member, ...current.members],
        };
      },
      "Lead converted to member",
    );
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
    updateSnapshot((current) => ({ ...current, plans: [plan, ...current.plans] }), "Plan assigned");
  }

  function adjustPlanAdherence(id: string, delta: 10 | -10) {
    updateSnapshot(
      (current) => ({
        ...current,
        plans: current.plans.map((plan) =>
          plan.id === id ? { ...plan, adherence: Math.max(0, Math.min(100, plan.adherence + delta)) } : plan,
        ),
      }),
      "Plan adherence updated",
    );
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
                <button className="rounded-md bg-slate-950 px-3 py-2 text-left text-xs font-black text-white transition hover:bg-slate-800" onClick={() => markInvoicePaid(invoice.id)} type="button">
                  Record cash payment
                </button>
                <button className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-left text-xs font-black text-emerald-800 transition hover:bg-emerald-100" onClick={() => markInvoicePaid(invoice.id)} type="button">
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
          <p className="mt-1 text-sm text-slate-500">Profiles, subscriptions, dues, and PT assignment.</p>
        </div>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveModal("member")} type="button">
          Add member
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Branch</th>
              <th className="px-5 py-3">Trainer</th>
              <th className="px-5 py-3">Dues</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {snapshot.members.map((member) => (
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
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusStyles[member.status]}`}>
                    {member.dues ? formatCurrency(member.dues) : member.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => updateMemberStatus(member.id, "active")} type="button">Activate</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => updateMemberStatus(member.id, "paused")} type="button">Pause</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => updateMemberStatus(member.id, "due")} type="button">Mark due</button>
                    <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => addPtPackage(member.name)} type="button">Add PT</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModuleCard>
  );

  const billingModule = (
    <ModuleCard>
      <h2 className="text-xl font-black">Billing & GST Invoicing</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => submitForm(event, addInvoice)}>
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
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white md:col-span-2 xl:col-span-4" data-testid="create-invoice" type="submit">
          Create GST invoice
        </button>
      </form>
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
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold disabled:opacity-40" disabled={invoice.status === "paid"} onClick={() => markInvoicePaid(invoice.id)} type="button">
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
      <h2 className="text-xl font-black">Class Scheduling</h2>
      <p className="mt-1 text-sm text-slate-500">Crosstrain Fight Club Saket weekly timetable.</p>
      <form className="mt-4 grid gap-3 md:grid-cols-5" onSubmit={(event) => submitForm(event, addClass)}>
        <Field label="Day">
          <select className={inputClass} name="day" onChange={(event) => setClassForm({ ...classForm, day: event.target.value as Weekday })} value={classForm.day}>
            {weekdays.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </Field>
        <Field label="Class">
          <input className={inputClass} name="name" onChange={(event) => setClassForm({ ...classForm, name: event.target.value })} placeholder="Yoga, HIIT..." value={classForm.name} />
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
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white md:col-span-5" type="submit">Schedule class</button>
      </form>
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
      <h2 className="text-xl font-black">Lead Management</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={(event) => submitForm(event, addLead)}>
        <Field label="Name">
          <input className={inputClass} name="name" onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} placeholder="Lead name" value={leadForm.name} />
        </Field>
        <Field label="Source">
          <input className={inputClass} name="source" onChange={(event) => setLeadForm({ ...leadForm, source: event.target.value })} value={leadForm.source} />
        </Field>
        <Field label="Follow-up">
          <input className={inputClass} name="nextFollowUp" onChange={(event) => setLeadForm({ ...leadForm, nextFollowUp: event.target.value })} value={leadForm.nextFollowUp} />
        </Field>
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white md:col-span-3" type="submit">Capture lead</button>
      </form>
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
              <button className="rounded-md border border-slate-300 px-2 py-1 text-xs font-bold" onClick={() => convertLead(lead.id)} type="button">Convert</button>
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
                            <button className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-800" onClick={() => deleteMembershipPlan(plan.id)} type="button">
                              Delete
                            </button>
                          ) : null}
                        </>
                      ) : used ? (
                        <button className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800" onClick={() => archiveMembershipPlan(plan.id)} type="button">
                          Archive
                        </button>
                      ) : (
                        <button className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-800" onClick={() => deleteMembershipPlan(plan.id)} type="button">
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
      <h2 className="text-xl font-black">Diet & Workout Assignments</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={(event) => submitForm(event, addPlan)}>
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
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white md:col-span-4" type="submit">Assign plan</button>
      </form>
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
    <ModuleCard>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">QR Attendance</p>
      <h2 className="mt-2 text-xl font-black">Display-only scanner placeholder</h2>
      <div className="mt-5 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="grid grid-cols-4 gap-1 rounded-md bg-white p-4 shadow-sm ring-1 ring-slate-200">
          {Array.from({ length: 32 }).map((_, index) => (
            <span
              className={`aspect-square rounded-[2px] ${
                [0, 1, 2, 4, 5, 8, 10, 13, 14, 17, 19, 20, 23, 25, 26, 28, 30, 31].includes(index)
                  ? "bg-slate-950"
                  : "bg-slate-200"
              }`}
              key={index}
            />
          ))}
        </div>
        <div>
          <p className="text-3xl font-black">{metrics.attendanceToday} check-ins today</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            QR attendance has its own route, but scanning/check-in mutation is intentionally disabled for now. The page is ready for a scanner integration later.
          </p>
        </div>
      </div>
    </ModuleCard>
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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Member Management", "Profiles, subscriptions, dues, and PT assignment."],
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
  };

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

      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-white px-5 py-6">
          <Link className="flex items-center gap-3" href="/">
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
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <section className="mt-8 rounded-lg border border-slate-200 bg-[#eef7f1] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">QR Attendance</p>
            <p className="mt-4 text-2xl font-black text-slate-900">{metrics.attendanceToday}</p>
            <p className="text-xs text-slate-600">Display-only scanner route</p>
            <Link className="mt-4 inline-flex rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm" href="/qr-attendance">
              Open QR page
            </Link>
          </section>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Crosstrain Admin panel</p>
              <h1 className="mt-1 text-3xl font-black tracking-normal sm:text-4xl">{pageTitle}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white" onClick={() => setActiveModal("member")} type="button">
                New member
              </button>
              <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" href="/billing">Create invoice</Link>
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={resetDemoData} type="button">
                Reset demo
              </button>
            </div>
          </header>

          <div className="mt-6 grid gap-6">
            {module !== "overview" ? metricCards : null}
            {modules[module]}
          </div>
        </section>
      </div>
    </main>
  );
}
