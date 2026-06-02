export type MemberStatus = "active" | "due" | "paused" | "lead";
export type StaffRole = "Owner" | "Manager" | "Trainer" | "Front Desk";
export type AttendanceTrend = "up" | "steady" | "down";
export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
export type FormReviewStatus = "clear" | "review";

export type Member = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  branch: string;
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
  branch: string;
  disciplines: string[];
  access: string[];
  attendance: number;
  performance: string;
  bio: string;
};

export type ClassSlot = {
  id: string;
  day: Weekday;
  name: string;
  coach: string;
  time: string;
  booked: number;
  capacity: number;
};

export type MembershipPlan = {
  id: string;
  category: "Regular" | "3 Days a Week" | "2 Days a Week";
  duration: string;
  price: number;
  status: "active" | "archived";
};

export type Branch = {
  id: string;
  name: string;
  area: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  status: "active" | "launching";
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

export type BodyMeasurement = {
  id: string;
  member: string;
  recordedOn: string;
  heightCm: number;
  weightKg: number;
  age: number;
  sex: "male" | "female";
  chestCm: number;
  waistCm: number;
  hipCm: number;
  bodyFatPercent: number;
  bmi: number;
  bmr: number;
};

export type ParqForm = {
  id: string;
  member: string;
  submittedOn: string;
  status: FormReviewStatus;
  yesAnswers: string[];
  notes: string;
};

export type MedicalHistoryForm = {
  id: string;
  member: string;
  submittedOn: string;
  status: FormReviewStatus;
  conditions: string[];
  allergies: string;
  medications: string;
  emergencyContact: string;
  notes: string;
};

export type MemberCredential = {
  memberId: string;
  email: string;
  password: string;
};

export type AttendanceLog = {
  id: string;
  memberId: string;
  memberName: string;
  branch: string;
  checkedInAt: string;
  source: "member-qr";
};

export type DashboardSnapshot = {
  dbStatus?: {
    connected: boolean;
    message: string;
  };
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
  membershipPlans: MembershipPlan[];
  branches: Branch[];
  staff: StaffMember[];
  classes: ClassSlot[];
  leads: Lead[];
  plans: PlanAssignment[];
  measurements: BodyMeasurement[];
  parqForms: ParqForm[];
  medicalHistoryForms: MedicalHistoryForm[];
  memberCredentials: MemberCredential[];
  attendanceLogs: AttendanceLog[];
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

const weekdays: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatLastCheckIn(value?: Date) {
  if (!value) return "Not checked in yet";
  const today = new Date();
  const sameDay =
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth() &&
    value.getDate() === today.getDate();
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(value);
  return sameDay ? `Today, ${time}` : formatDateTime(value);
}

function uiMemberStatus(status: string): MemberStatus {
  if (status === "DUE") return "due";
  if (status === "PAUSED") return "paused";
  if (status === "LEAD") return "lead";
  return "active";
}

function uiPlanCategory(category: string): MembershipPlan["category"] {
  if (category === "THREE_DAYS_A_WEEK") return "3 Days a Week";
  if (category === "TWO_DAYS_A_WEEK") return "2 Days a Week";
  return "Regular";
}

function uiPlanStatus(status: string): MembershipPlan["status"] {
  return status === "ARCHIVED" ? "archived" : "active";
}

function uiInvoiceStatus(status: string): Invoice["status"] {
  if (status === "PAID") return "paid";
  if (status === "DUE") return "due";
  return "draft";
}

function uiPaymentMode(mode: string): Invoice["paymentMode"] {
  if (mode === "GOOGLE_PAY_SCREENSHOT") return "Google Pay Screenshot";
  if (mode === "RAZORPAY") return "Razorpay";
  return "Cash";
}

function uiStaffRole(role: string): StaffRole {
  if (role === "OWNER") return "Owner";
  if (role === "MANAGER") return "Manager";
  if (role === "TRAINER") return "Trainer";
  return "Front Desk";
}

function uiLeadStage(stage: string): Lead["stage"] {
  if (stage === "FOLLOW_UP") return "Follow-up";
  if (stage === "TRIAL_BOOKED") return "Trial booked";
  if (stage === "WON") return "Won";
  return "New";
}

function uiSex(sex: string): BodyMeasurement["sex"] {
  return sex === "FEMALE" ? "female" : "male";
}

function uiReviewStatus(status: string): FormReviewStatus {
  return status === "REVIEW" ? "review" : "clear";
}

function durationLabel(days: number) {
  if (days >= 365) return "12 Month";
  if (days >= 180) return "6 Month";
  if (days >= 90) return "3 Month";
  return "1 Month";
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
      id: "MBR-86108",
      name: "Sahil Kashyap",
      phone: "+91 79822 19140",
      email: "student1@example.com",
      branch: "Delhi Branch",
      plan: "Regular 12 Month",
      status: "active",
      expiry: "06 Oct 2026",
      dues: 0,
      lastCheckIn: "MMA package active",
      trainer: "Unassigned",
    },
    {
      id: "MBR-1048",
      name: "Aarav Sharma",
      phone: "+91 98765 41048",
      email: "student2@example.com",
      branch: "Delhi Branch",
      plan: "Regular 12 Month",
      status: "active",
      expiry: "18 Aug 2026",
      dues: 0,
      lastCheckIn: "Today, 7:18 AM",
      trainer: "Siddharth Singh",
    },
    {
      id: "MBR-1037",
      name: "Meera Iyer",
      phone: "+91 98765 41037",
      email: "student3@example.com",
      branch: "Delhi Branch",
      plan: "Regular 3 Month",
      status: "due",
      expiry: "12 May 2026",
      dues: 12500,
      lastCheckIn: "Yesterday, 6:44 PM",
      trainer: "Tarun Yadav",
    },
    {
      id: "MBR-1019",
      name: "Kabir Sethi",
      phone: "+91 98765 41019",
      email: "student4@example.com",
      branch: "Noida Sector 58 Branch",
      plan: "Regular 1 Month",
      status: "paused",
      expiry: "26 Jun 2026",
      dues: 0,
      lastCheckIn: "03 May, 8:02 AM",
      trainer: "Unassigned",
    },
    {
      id: "MBR-1026",
      name: "Riya Menon",
      phone: "+91 98765 41026",
      email: "student5@example.com",
      branch: "Faridabad Sector 28 Branch",
      plan: "3 Days a Week 3 Month",
      status: "active",
      expiry: "07 Jun 2026",
      dues: 0,
      lastCheckIn: "19 May, 7:40 AM",
      trainer: "Pawan Pratap",
    },
  ],
  invoices: [
    {
      id: "INV-1705",
      member: "Sahil Kashyap",
      amount: 52500,
      gst: 0,
      status: "paid",
      issuedOn: "06 Oct 2025",
      paymentMode: "Google Pay Screenshot",
    },
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
  membershipPlans: [
    { id: "MEM-REG-01", category: "Regular", duration: "1 Month", price: 10000, status: "active" },
    { id: "MEM-REG-03", category: "Regular", duration: "3 Month", price: 20000, status: "active" },
    { id: "MEM-REG-06", category: "Regular", duration: "6 Month", price: 35000, status: "active" },
    { id: "MEM-REG-12", category: "Regular", duration: "12 Month", price: 60000, status: "active" },
    { id: "MEM-3DAY-01", category: "3 Days a Week", duration: "1 Month", price: 8000, status: "active" },
    { id: "MEM-3DAY-03", category: "3 Days a Week", duration: "3 Month", price: 16000, status: "active" },
    { id: "MEM-3DAY-06", category: "3 Days a Week", duration: "6 Month", price: 30000, status: "active" },
    { id: "MEM-3DAY-12", category: "3 Days a Week", duration: "12 Month", price: 48000, status: "active" },
    { id: "MEM-2DAY-03", category: "2 Days a Week", duration: "3 Month", price: 14000, status: "active" },
    { id: "MEM-2DAY-06", category: "2 Days a Week", duration: "6 Month", price: 25000, status: "active" },
    { id: "MEM-2DAY-12", category: "2 Days a Week", duration: "12 Month", price: 40000, status: "active" },
  ],
  branches: [
    {
      id: "BR-DEL",
      name: "Delhi Branch",
      area: "Saket",
      city: "Delhi",
      address: "A-4, Anupam Garden, Sainik Farm, New Delhi, Delhi 110062",
      phone: "+91 88269 14097",
      email: "crosstrainfc@gmail.com",
      status: "active",
    },
    {
      id: "BR-NOI-58",
      name: "Noida Sector 58 Branch",
      area: "Sector 58",
      city: "Noida",
      address: "Sector 58, Noida",
      phone: "+91 70673 75497",
      email: "crosstrainfc@gmail.com",
      status: "active",
    },
    {
      id: "BR-FBD-28",
      name: "Faridabad Sector 28 Branch",
      area: "Sector 28",
      city: "Faridabad",
      address: "Sector 28, Faridabad",
      phone: "+91 70673 75497",
      email: "crosstrainfc@gmail.com",
      status: "active",
    },
  ],
  staff: [
    {
      id: "STF-01",
      name: "Siddharth Singh",
      role: "Owner",
      branch: "Delhi Branch",
      disciplines: ["MMA", "Brazilian Jiu-Jitsu", "Grappling", "Muay Thai"],
      access: ["Members", "Membership", "Billing", "Payments", "QR", "PT", "Staff", "Classes", "Leads", "Plans", "Reports"],
      attendance: 96,
      performance: "Head coach and founder",
      bio: "First Indian competitive black belt in Brazilian Jiu-Jitsu, Gold Mongkol Master in Muay Thai, and founder of Crosstrain Fight Club.",
    },
    {
      id: "STF-02",
      name: "Tarun Yadav",
      role: "Trainer",
      branch: "Delhi Branch",
      disciplines: ["Brazilian Jiu-Jitsu", "Gi", "No-Gi", "Grappling"],
      access: ["Members", "PT", "Classes", "Plans"],
      attendance: 91,
      performance: "Eight-time national BJJ champion",
      bio: "BJJ specialist, Asian Games 2022 competitor, brown belt, and senior grappling coach at the Saket academy.",
    },
    {
      id: "STF-03",
      name: "Pawan Pratap",
      role: "Trainer",
      branch: "Faridabad Sector 28 Branch",
      disciplines: ["MMA", "Fitness", "Wrestling", "Striking"],
      access: ["Members", "PT", "Classes"],
      attendance: 98,
      performance: "National-level MMA athlete",
      bio: "MMA and fitness coach for the Faridabad branch, focused on wrestling, striking, functional strength, and beginner-to-competitor development.",
    },
    {
      id: "STF-04",
      name: "Aanand Thakur",
      role: "Front Desk",
      branch: "Delhi Branch",
      disciplines: ["Member onboarding", "Billing support", "Front desk operations"],
      access: ["Members", "Billing", "Payments", "QR", "Leads"],
      attendance: 97,
      performance: "Front desk and member support",
      bio: "Front desk team member handling member onboarding, payment support, attendance coordination, and daily branch operations.",
    },
  ],
  classes: [
    { id: "CLS-MON-01", day: "Monday", name: "Jiu Jitsu", coach: "Tarun Yadav", time: "8:00 AM", booked: 18, capacity: 24 },
    { id: "CLS-MON-02", day: "Monday", name: "Kids Class BJJ", coach: "Tarun Yadav", time: "4:30 PM", booked: 16, capacity: 20 },
    { id: "CLS-MON-03", day: "Monday", name: "Wrestling", coach: "Pawan Pratap", time: "5:30 PM", booked: 20, capacity: 24 },
    { id: "CLS-MON-04", day: "Monday", name: "Jiu Jitsu (Gi)", coach: "Tarun Yadav", time: "7:00 PM", booked: 19, capacity: 24 },
    { id: "CLS-MON-05", day: "Monday", name: "Crosstrain 30", coach: "Open Mat", time: "5:00 PM to 9:00 PM", booked: 22, capacity: 30 },
    { id: "CLS-TUE-01", day: "Tuesday", name: "Muay Thai", coach: "Siddharth Singh", time: "8:00 AM", booked: 21, capacity: 24 },
    { id: "CLS-TUE-02", day: "Tuesday", name: "MMA Fundamentals", coach: "Siddharth Singh", time: "5:30 PM", booked: 23, capacity: 26 },
    { id: "CLS-TUE-03", day: "Tuesday", name: "BJJ Fundamentals", coach: "Tarun Yadav", time: "7:00 PM", booked: 20, capacity: 24 },
    { id: "CLS-TUE-04", day: "Tuesday", name: "Crosstrain 30", coach: "Open Mat", time: "5:00 PM to 9:00 PM", booked: 24, capacity: 30 },
    { id: "CLS-WED-01", day: "Wednesday", name: "MMA Pro Invite Only", coach: "Siddharth Singh", time: "11:00 AM", booked: 10, capacity: 12 },
    { id: "CLS-WED-02", day: "Wednesday", name: "Kids Class BJJ", coach: "Tarun Yadav", time: "4:30 PM", booked: 15, capacity: 20 },
    { id: "CLS-WED-03", day: "Wednesday", name: "Wrestling", coach: "Pawan Pratap", time: "5:30 PM", booked: 21, capacity: 24 },
    { id: "CLS-WED-04", day: "Wednesday", name: "Muay Thai", coach: "Siddharth Singh", time: "7:00 PM", booked: 24, capacity: 26 },
    { id: "CLS-WED-05", day: "Wednesday", name: "Crosstrain 30", coach: "Open Mat", time: "5:00 PM to 9:00 PM", booked: 22, capacity: 30 },
    { id: "CLS-THU-01", day: "Thursday", name: "MMA Fundamentals", coach: "Siddharth Singh", time: "8:00 AM", booked: 20, capacity: 24 },
    { id: "CLS-THU-02", day: "Thursday", name: "MMA Fundamentals", coach: "Siddharth Singh", time: "5:30 PM", booked: 23, capacity: 26 },
    { id: "CLS-THU-03", day: "Thursday", name: "Jiu Jitsu", coach: "Tarun Yadav", time: "7:00 PM", booked: 18, capacity: 24 },
    { id: "CLS-THU-04", day: "Thursday", name: "Crosstrain 30", coach: "Open Mat", time: "5:00 PM to 9:00 PM", booked: 24, capacity: 30 },
    { id: "CLS-FRI-01", day: "Friday", name: "Wrestling", coach: "Pawan Pratap", time: "8:00 AM", booked: 18, capacity: 24 },
    { id: "CLS-FRI-02", day: "Friday", name: "Kids Class BJJ", coach: "Tarun Yadav", time: "4:30 PM", booked: 17, capacity: 20 },
    { id: "CLS-FRI-03", day: "Friday", name: "BJJ Fundamentals", coach: "Tarun Yadav", time: "5:30 PM", booked: 22, capacity: 24 },
    { id: "CLS-FRI-04", day: "Friday", name: "Muay Thai", coach: "Siddharth Singh", time: "7:00 PM", booked: 24, capacity: 26 },
    { id: "CLS-FRI-05", day: "Friday", name: "Crosstrain 30", coach: "Open Mat", time: "5:00 PM to 9:00 PM", booked: 23, capacity: 30 },
    { id: "CLS-SAT-01", day: "Saturday", name: "Jiu Jitsu", coach: "Tarun Yadav", time: "11:30 AM", booked: 19, capacity: 24 },
    { id: "CLS-SUN-01", day: "Sunday", name: "Off", coach: "Saket HQ", time: "Closed", booked: 0, capacity: 1 },
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
  measurements: [
    {
      id: "MSR-201",
      member: "Aarav Sharma",
      recordedOn: "01 Apr 2026",
      heightCm: 178,
      weightKg: 83.4,
      age: 31,
      sex: "male",
      chestCm: 104,
      waistCm: 91,
      hipCm: 99,
      bodyFatPercent: 22,
      bmi: 26.3,
      bmr: 1792,
    },
    {
      id: "MSR-226",
      member: "Aarav Sharma",
      recordedOn: "15 May 2026",
      heightCm: 178,
      weightKg: 80.8,
      age: 31,
      sex: "male",
      chestCm: 103,
      waistCm: 87,
      hipCm: 98,
      bodyFatPercent: 19,
      bmi: 25.5,
      bmr: 1766,
    },
    {
      id: "MSR-203",
      member: "Meera Iyer",
      recordedOn: "10 Apr 2026",
      heightCm: 164,
      weightKg: 67.2,
      age: 28,
      sex: "female",
      chestCm: 91,
      waistCm: 78,
      hipCm: 99,
      bodyFatPercent: 27,
      bmi: 25,
      bmr: 1379,
    },
    {
      id: "MSR-229",
      member: "Meera Iyer",
      recordedOn: "20 May 2026",
      heightCm: 164,
      weightKg: 65.9,
      age: 28,
      sex: "female",
      chestCm: 90,
      waistCm: 75,
      hipCm: 97,
      bodyFatPercent: 25,
      bmi: 24.5,
      bmr: 1366,
    },
  ],
  parqForms: [
    {
      id: "PARQ-118",
      member: "Aarav Sharma",
      submittedOn: "15 May 2026",
      status: "clear",
      yesAnswers: [],
      notes: "No restrictions reported.",
    },
    {
      id: "PARQ-121",
      member: "Meera Iyer",
      submittedOn: "20 May 2026",
      status: "review",
      yesAnswers: ["Bone or joint problem"],
      notes: "Occasional knee pain during lunges.",
    },
  ],
  medicalHistoryForms: [
    {
      id: "MED-109",
      member: "Aarav Sharma",
      submittedOn: "15 May 2026",
      status: "clear",
      conditions: ["None"],
      allergies: "None",
      medications: "None",
      emergencyContact: "Neha Sharma, +91 98765 40001",
      notes: "Cleared for regular training.",
    },
    {
      id: "MED-114",
      member: "Meera Iyer",
      submittedOn: "20 May 2026",
      status: "review",
      conditions: ["Knee pain"],
      allergies: "None",
      medications: "Vitamin D",
      emergencyContact: "Rohan Iyer, +91 98765 40002",
      notes: "Coach to avoid high-impact jumps until assessed.",
    },
  ],
  memberCredentials: [
    { memberId: "MBR-86108", email: "student1@example.com", password: "password" },
    { memberId: "MBR-1048", email: "student2@example.com", password: "password" },
    { memberId: "MBR-1037", email: "student3@example.com", password: "password" },
    { memberId: "MBR-1019", email: "student4@example.com", password: "password" },
    { memberId: "MBR-1026", email: "student5@example.com", password: "password" },
  ],
  attendanceLogs: [
    {
      id: "ATT-2401",
      memberId: "MBR-1048",
      memberName: "Aarav Sharma",
      branch: "Delhi Branch",
      checkedInAt: "2026-05-30T07:18:00.000+05:30",
      source: "member-qr",
    },
    {
      id: "ATT-2402",
      memberId: "MBR-1037",
      memberName: "Meera Iyer",
      branch: "Delhi Branch",
      checkedInAt: "2026-05-29T18:44:00.000+05:30",
      source: "member-qr",
    },
  ],
  ptPackages: [
    { id: "PT-TRY-01", member: "Walk-in Trial", trainer: "Available coach", sessionsLeft: 1, progress: 0 },
    { id: "PT-771", member: "Aarav Sharma", trainer: "Siddharth Singh", sessionsLeft: 8, progress: 72 },
    { id: "PT-763", member: "Meera Iyer", trainer: "Tarun Yadav", sessionsLeft: 3, progress: 58 },
    { id: "PT-758", member: "Riya Menon", trainer: "Pawan Pratap", sessionsLeft: 12, progress: 34 },
  ],
};

class SeededServerlessStore implements GymDataStore {
  async getDashboardSnapshot() {
    return {
      ...dashboardSeed,
      dbStatus: {
        connected: false,
        message: "Database is not connected. Showing seed/demo data only.",
      },
    };
  }
}

class PrismaGymDataStore implements GymDataStore {
  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    try {
      const { prisma } = await import("@/lib/prisma");
      const [
        branches,
        members,
        membershipPlans,
        invoices,
        staff,
        classes,
        leads,
        dietPlans,
        ptPackages,
        measurements,
        parqForms,
        medicalHistoryForms,
        attendances,
      ] = await Promise.all([
        prisma.branch.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.member.findMany({
          include: {
            branch: true,
            trainer: true,
            memberships: {
              where: { isActive: true },
              include: { plan: true },
              orderBy: { expiresAt: "desc" },
              take: 1,
            },
            attendances: { orderBy: { checkedInAt: "desc" }, take: 1 },
            invoices: { where: { status: "DUE" } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.membershipPlan.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.invoice.findMany({ include: { member: true, payments: { orderBy: { paidAt: "desc" }, take: 1 } }, orderBy: { issuedOn: "desc" } }),
        prisma.staff.findMany({ include: { branch: true }, orderBy: { createdAt: "desc" } }),
        prisma.classSlot.findMany({ include: { coach: true }, orderBy: [{ dayOfWeek: "asc" }, { createdAt: "desc" }] }),
        prisma.lead.findMany({ orderBy: { createdAt: "desc" } }),
        prisma.dietPlan.findMany({ include: { member: true }, orderBy: { createdAt: "desc" } }),
        prisma.ptPackage.findMany({ include: { member: true, trainer: true }, orderBy: { createdAt: "desc" } }),
        prisma.bodyMeasurement.findMany({ include: { member: true }, orderBy: { recordedOn: "desc" } }),
        prisma.parqForm.findMany({ include: { member: true }, orderBy: { submittedOn: "desc" } }),
        prisma.medicalHistoryForm.findMany({ include: { member: true }, orderBy: { submittedOn: "desc" } }),
        prisma.attendance.findMany({ include: { member: true, branch: true }, orderBy: { checkedInAt: "desc" }, take: 100 }),
      ]);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const attendanceToday = await prisma.attendance.count({ where: { checkedInAt: { gte: todayStart } } });
      const paidRevenue = invoices.filter((invoice) => invoice.status === "PAID").reduce((sum, invoice) => sum + invoice.amountInr + invoice.gstInr, 0);
      const dues = invoices.filter((invoice) => invoice.status === "DUE").reduce((sum, invoice) => sum + invoice.amountInr + invoice.gstInr, 0);
      const activeMembers = members.filter((member) => member.status === "ACTIVE").length;
      const activeLeads = leads.filter((lead) => lead.stage !== "WON").length;

      const attendanceChart = weekdays.map((label, index) => {
        const visits = attendances.filter((attendance) => {
          const jsDay = attendance.checkedInAt.getDay();
          const mondayIndex = jsDay === 0 ? 6 : jsDay - 1;
          return mondayIndex === index;
        }).length;
        return { label: label.slice(0, 3), visits, trend: "steady" as AttendanceTrend };
      });

      const snapshot: DashboardSnapshot = {
        dbStatus: {
          connected: true,
          message: "Database connected. Changes are saved to PostgreSQL.",
        },
        metrics: {
          activeMembers,
          monthlyRevenue: paidRevenue,
          dues,
          attendanceToday,
          retention: members.length ? Math.round((activeMembers / members.length) * 100) : 0,
          leads: activeLeads,
        },
        attendance: attendanceChart,
        branches: branches.map((branch) => ({
          id: branch.code,
          name: branch.name,
          area: branch.area,
          city: branch.city,
          address: branch.address,
          phone: branch.phone,
          email: branch.email,
          status: branch.status === "LAUNCHING" ? "launching" : "active",
        })),
        members: members.map((member) => {
          const activeMembership = member.memberships[0];
          const plan = activeMembership?.plan
            ? `${uiPlanCategory(activeMembership.plan.category)} ${durationLabel(activeMembership.plan.durationDays)}`
            : "No active plan";
          return {
            id: member.memberCode,
            name: member.name,
            phone: member.phone,
            email: member.email ?? undefined,
            branch: member.branch.name,
            plan,
            status: uiMemberStatus(member.status),
            expiry: activeMembership ? formatDate(activeMembership.expiresAt) : "No expiry",
            dues: member.invoices.reduce((sum, invoice) => sum + invoice.amountInr + invoice.gstInr, 0),
            lastCheckIn: formatLastCheckIn(member.attendances[0]?.checkedInAt),
            trainer: member.trainer?.name ?? "Unassigned",
          };
        }),
        invoices: invoices.map((invoice) => ({
          id: invoice.invoiceCode,
          member: invoice.member.name,
          amount: invoice.amountInr,
          gst: invoice.gstInr,
          status: uiInvoiceStatus(invoice.status),
          issuedOn: formatDate(invoice.issuedOn),
          paymentMode: uiPaymentMode(invoice.payments?.[0]?.mode ?? "CASH"),
        })),
        membershipPlans: membershipPlans.map((plan) => ({
          id: plan.code,
          category: uiPlanCategory(plan.category),
          duration: durationLabel(plan.durationDays),
          price: plan.priceInr,
          status: uiPlanStatus(plan.status),
        })),
        staff: staff.map((staffMember) => ({
          id: staffMember.staffCode,
          name: staffMember.name,
          role: uiStaffRole(staffMember.role),
          branch: staffMember.branch.name,
          disciplines: staffMember.disciplines,
          access: staffMember.access,
          attendance: staffMember.attendance,
          performance: staffMember.performance ?? "Team member",
          bio: staffMember.bio ?? staffMember.performance ?? "Team member profile",
        })),
        classes: classes.map((slot) => ({
          id: slot.code,
          day: weekdays[Math.max(0, Math.min(6, slot.dayOfWeek))],
          name: slot.name,
          coach: slot.coach?.name ?? "Unassigned",
          time: slot.timeLabel,
          booked: slot.booked,
          capacity: slot.capacity,
        })),
        leads: leads.map((lead) => ({
          id: lead.leadCode,
          name: lead.name,
          source: lead.source,
          stage: uiLeadStage(lead.stage),
          nextFollowUp: lead.nextFollowUp ? formatDate(lead.nextFollowUp) : "Not set",
        })),
        plans: dietPlans.map((plan) => ({
          id: plan.id,
          member: plan.member.name,
          calories: plan.calories,
          protein: plan.proteinGrams,
          workoutSplit: plan.workoutSplit,
          adherence: plan.adherence,
        })),
        measurements: measurements.map((measurement) => ({
          id: measurement.measurementCode,
          member: measurement.member.name,
          recordedOn: formatDate(measurement.recordedOn),
          heightCm: measurement.heightCm,
          weightKg: measurement.weightKg,
          age: measurement.age,
          sex: uiSex(measurement.sex),
          chestCm: measurement.chestCm,
          waistCm: measurement.waistCm,
          hipCm: measurement.hipCm,
          bodyFatPercent: measurement.bodyFatPercent,
          bmi: measurement.bmi,
          bmr: measurement.bmr,
        })),
        parqForms: parqForms.map((form) => ({
          id: form.formCode,
          member: form.member.name,
          submittedOn: formatDate(form.submittedOn),
          status: uiReviewStatus(form.status),
          yesAnswers: form.yesAnswers,
          notes: form.notes ?? "",
        })),
        medicalHistoryForms: medicalHistoryForms.map((form) => ({
          id: form.formCode,
          member: form.member.name,
          submittedOn: formatDate(form.submittedOn),
          status: uiReviewStatus(form.status),
          conditions: form.conditions,
          allergies: form.allergies,
          medications: form.medications,
          emergencyContact: form.emergencyContact,
          notes: form.notes ?? "",
        })),
        memberCredentials: members
          .filter((member) => member.email)
          .map((member) => ({
            memberId: member.memberCode,
            email: member.email!,
            password: "password",
          })),
        attendanceLogs: attendances.map((attendance) => ({
          id: attendance.id,
          memberId: attendance.member.memberCode,
          memberName: attendance.member.name,
          branch: attendance.branch.name,
          checkedInAt: attendance.checkedInAt.toISOString(),
          source: "member-qr",
        })),
        ptPackages: ptPackages.map((pack) => ({
          id: pack.packageCode,
          member: pack.member.name,
          trainer: pack.trainer.name,
          sessionsLeft: pack.sessionsLeft,
          progress: pack.progress,
        })),
      };
      return snapshot;
    } catch {
      return {
        ...dashboardSeed,
        dbStatus: {
          connected: false,
          message: "Database connection failed. Showing seed/demo data only; changes will not be saved.",
        },
      };
    }
  }
}

export function getGymDataStore(): GymDataStore {
  return process.env.DATABASE_URL ? new PrismaGymDataStore() : new SeededServerlessStore();
}
