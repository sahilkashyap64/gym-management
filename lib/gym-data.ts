export type MemberStatus = "active" | "due" | "paused" | "lead";
export type StaffRole = "Owner" | "Manager" | "Trainer" | "Front Desk";
export type AttendanceTrend = "up" | "steady" | "down";

export type Member = {
  id: string;
  name: string;
  phone: string;
  plan: string;
  status: MemberStatus;
  expiry: string;
  dues: number;
  lastCheckIn: string;
  trainer: string;
};

export type Invoice = {
  id: string;
  member: string;
  amount: number;
  gst: number;
  status: "paid" | "due" | "draft";
  issuedOn: string;
  paymentMode: "Cash" | "Google Pay Screenshot" | "Razorpay";
};

export type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  access: string[];
  attendance: number;
  performance: string;
};

export type ClassSlot = {
  id: string;
  name: string;
  coach: string;
  time: string;
  booked: number;
  capacity: number;
};

export type Lead = {
  id: string;
  name: string;
  source: string;
  stage: "New" | "Follow-up" | "Trial booked" | "Won";
  nextFollowUp: string;
};

export type PlanAssignment = {
  id: string;
  member: string;
  calories: number;
  protein: number;
  workoutSplit: string;
  adherence: number;
};

export type DashboardSnapshot = {
  metrics: {
    activeMembers: number;
    monthlyRevenue: number;
    dues: number;
    attendanceToday: number;
    retention: number;
    leads: number;
  };
  attendance: Array<{ label: string; visits: number; trend: AttendanceTrend }>;
  members: Member[];
  invoices: Invoice[];
  staff: StaffMember[];
  classes: ClassSlot[];
  leads: Lead[];
  plans: PlanAssignment[];
  ptPackages: Array<{
    id: string;
    member: string;
    trainer: string;
    sessionsLeft: number;
    progress: number;
  }>;
};

export interface GymDataStore {
  getDashboardSnapshot(): Promise<DashboardSnapshot>;
}

const dashboardSeed: DashboardSnapshot = {
  metrics: {
    activeMembers: 486,
    monthlyRevenue: 1284500,
    dues: 86400,
    attendanceToday: 142,
    retention: 84,
    leads: 38,
  },
  attendance: [
    { label: "Mon", visits: 118, trend: "up" },
    { label: "Tue", visits: 132, trend: "up" },
    { label: "Wed", visits: 126, trend: "steady" },
    { label: "Thu", visits: 151, trend: "up" },
    { label: "Fri", visits: 137, trend: "down" },
    { label: "Sat", visits: 168, trend: "up" },
    { label: "Sun", visits: 94, trend: "steady" },
  ],
  members: [
    {
      id: "MBR-1048",
      name: "Aarav Sharma",
      phone: "+91 98765 41048",
      plan: "Annual Strength",
      status: "active",
      expiry: "18 Aug 2026",
      dues: 0,
      lastCheckIn: "Today, 7:18 AM",
      trainer: "Nisha",
    },
    {
      id: "MBR-1037",
      name: "Meera Iyer",
      phone: "+91 98765 41037",
      plan: "Quarterly Plus",
      status: "due",
      expiry: "12 May 2026",
      dues: 12500,
      lastCheckIn: "Yesterday, 6:44 PM",
      trainer: "Rahul",
    },
    {
      id: "MBR-1019",
      name: "Kabir Sethi",
      phone: "+91 98765 41019",
      plan: "Monthly Access",
      status: "paused",
      expiry: "26 Jun 2026",
      dues: 0,
      lastCheckIn: "03 May, 8:02 AM",
      trainer: "Unassigned",
    },
  ],
  invoices: [
    {
      id: "INV-2621",
      member: "Meera Iyer",
      amount: 12500,
      gst: 2250,
      status: "due",
      issuedOn: "10 May 2026",
      paymentMode: "Google Pay Screenshot",
    },
    {
      id: "INV-2618",
      member: "Aarav Sharma",
      amount: 42000,
      gst: 7560,
      status: "paid",
      issuedOn: "08 May 2026",
      paymentMode: "Cash",
    },
    {
      id: "INV-2613",
      member: "Riya Menon",
      amount: 9500,
      gst: 1710,
      status: "draft",
      issuedOn: "07 May 2026",
      paymentMode: "Google Pay Screenshot",
    },
  ],
  staff: [
    {
      id: "STF-01",
      name: "Nisha Rao",
      role: "Trainer",
      access: ["Members", "PT", "Plans"],
      attendance: 96,
      performance: "42 PT sessions",
    },
    {
      id: "STF-02",
      name: "Rahul Mehta",
      role: "Manager",
      access: ["Billing", "Staff", "Reports"],
      attendance: 91,
      performance: "18 renewals",
    },
    {
      id: "STF-03",
      name: "Tara Singh",
      role: "Front Desk",
      access: ["QR", "Leads", "Classes"],
      attendance: 98,
      performance: "64 check-ins",
    },
  ],
  classes: [
    { id: "CLS-11", name: "HIIT Burn", coach: "Nisha", time: "6:30 PM", booked: 22, capacity: 25 },
    { id: "CLS-12", name: "Mobility Flow", coach: "Tara", time: "7:30 PM", booked: 14, capacity: 18 },
    { id: "CLS-13", name: "Boxing Basics", coach: "Rahul", time: "8:15 PM", booked: 17, capacity: 20 },
  ],
  leads: [
    { id: "LED-442", name: "Ananya Das", source: "Instagram", stage: "Trial booked", nextFollowUp: "Today" },
    { id: "LED-438", name: "Dev Patel", source: "Walk-in", stage: "Follow-up", nextFollowUp: "Tomorrow" },
    { id: "LED-431", name: "Sana Khan", source: "Referral", stage: "New", nextFollowUp: "12 May" },
  ],
  plans: [
    { id: "PLN-91", member: "Aarav Sharma", calories: 2400, protein: 155, workoutSplit: "Push Pull Legs", adherence: 88 },
    { id: "PLN-88", member: "Meera Iyer", calories: 1850, protein: 118, workoutSplit: "Strength + Yoga", adherence: 74 },
  ],
  ptPackages: [
    { id: "PT-771", member: "Aarav Sharma", trainer: "Nisha", sessionsLeft: 8, progress: 72 },
    { id: "PT-763", member: "Meera Iyer", trainer: "Rahul", sessionsLeft: 3, progress: 58 },
    { id: "PT-758", member: "Riya Menon", trainer: "Nisha", sessionsLeft: 12, progress: 34 },
  ],
};

class SeededServerlessStore implements GymDataStore {
  async getDashboardSnapshot() {
    return dashboardSeed;
  }
}

export function getGymDataStore(): GymDataStore {
  return new SeededServerlessStore();
}
