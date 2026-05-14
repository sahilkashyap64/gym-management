export type MemberStatus = "active" | "due" | "paused" | "lead";
export type StaffRole = "Owner" | "Manager" | "Trainer" | "Front Desk";
export type AttendanceTrend = "up" | "steady" | "down";
export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

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
  membershipPlans: MembershipPlan[];
  branches: Branch[];
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
      id: "MBR-86108",
      name: "Sahil Kashyap",
      phone: "+91 79822 19140",
      plan: "VIP 12 Months",
      status: "active",
      expiry: "06 Oct 2026",
      dues: 0,
      lastCheckIn: "MMA package active",
      trainer: "Aanand Thakur",
    },
    {
      id: "MBR-1048",
      name: "Aarav Sharma",
      phone: "+91 98765 41048",
      plan: "Annual Strength",
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
      plan: "Quarterly Plus",
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
    { id: "MEM-REG-01", category: "Regular", duration: "1 Month", price: 10000 },
    { id: "MEM-REG-03", category: "Regular", duration: "3 Month", price: 20000 },
    { id: "MEM-REG-06", category: "Regular", duration: "6 Month", price: 35000 },
    { id: "MEM-REG-12", category: "Regular", duration: "12 Month", price: 60000 },
    { id: "MEM-3DAY-01", category: "3 Days a Week", duration: "1 Month", price: 8000 },
    { id: "MEM-3DAY-03", category: "3 Days a Week", duration: "3 Month", price: 16000 },
    { id: "MEM-3DAY-06", category: "3 Days a Week", duration: "6 Month", price: 30000 },
    { id: "MEM-3DAY-12", category: "3 Days a Week", duration: "12 Month", price: 48000 },
    { id: "MEM-2DAY-03", category: "2 Days a Week", duration: "3 Month", price: 14000 },
    { id: "MEM-2DAY-06", category: "2 Days a Week", duration: "6 Month", price: 25000 },
    { id: "MEM-2DAY-12", category: "2 Days a Week", duration: "12 Month", price: 40000 },
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
      role: "Trainer",
      branch: "Delhi Branch",
      disciplines: ["MMA", "Brazilian Jiu-Jitsu", "Grappling", "Muay Thai"],
      access: ["Members", "PT", "Plans"],
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
  ptPackages: [
    { id: "PT-TRY-01", member: "Walk-in Trial", trainer: "Available coach", sessionsLeft: 1, progress: 0 },
    { id: "PT-771", member: "Aarav Sharma", trainer: "Siddharth Singh", sessionsLeft: 8, progress: 72 },
    { id: "PT-763", member: "Meera Iyer", trainer: "Tarun Yadav", sessionsLeft: 3, progress: 58 },
    { id: "PT-758", member: "Riya Menon", trainer: "Pawan Pratap", sessionsLeft: 12, progress: 34 },
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
