import "dotenv/config";
import { createHash } from "crypto";
import {
  AttendanceSource,
  BranchStatus,
  FormReviewStatus,
  InvoiceStatus,
  LeadStage,
  MemberStatus,
  PaymentMode,
  PlanCategory,
  PlanStatus,
  PrismaClient,
  Sex,
  UserRole,
} from "../lib/generated/prisma";

const prisma = new PrismaClient();

const fullAccess = ["Members", "Membership", "Billing", "Payments", "QR", "PT", "Staff", "Classes", "Leads", "Plans", "Reports"];

function date(value: string) {
  return new Date(`${value}T09:00:00.000+05:30`);
}

function passwordHash(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  await prisma.session.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.dietPlan.deleteMany();
  await prisma.ptPackage.deleteMany();
  await prisma.bodyMeasurement.deleteMany();
  await prisma.parqForm.deleteMany();
  await prisma.medicalHistoryForm.deleteMany();
  await prisma.memberMembership.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.classSlot.deleteMany();
  await prisma.member.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.user.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.branch.deleteMany();

  const delhi = await prisma.branch.create({
    data: {
      code: "BR-DEL",
      name: "Delhi Branch",
      area: "Saket",
      city: "Delhi",
      address: "A-4, Anupam Garden, Sainik Farm, New Delhi, Delhi 110062",
      phone: "+91 88269 14097",
      email: "crosstrainfc@gmail.com",
      status: BranchStatus.ACTIVE,
    },
  });
  const noida = await prisma.branch.create({
    data: {
      code: "BR-NOI-58",
      name: "Noida Sector 58 Branch",
      area: "Sector 58",
      city: "Noida",
      address: "Sector 58, Noida",
      phone: "+91 70673 75497",
      email: "crosstrainfc@gmail.com",
      status: BranchStatus.ACTIVE,
    },
  });
  const faridabad = await prisma.branch.create({
    data: {
      code: "BR-FBD-28",
      name: "Faridabad Sector 28 Branch",
      area: "Sector 28",
      city: "Faridabad",
      address: "Sector 28, Faridabad",
      phone: "+91 70673 75497",
      email: "crosstrainfc@gmail.com",
      status: BranchStatus.ACTIVE,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Demo Admin",
      passwordHash: passwordHash("password"),
      role: UserRole.OWNER,
      branchId: delhi.id,
    },
  });
  const frontDeskUser = await prisma.user.create({
    data: {
      email: "frontdesk@example.com",
      name: "Aanand Thakur",
      passwordHash: passwordHash("password"),
      role: UserRole.FRONT_DESK,
      branchId: delhi.id,
    },
  });

  const siddharth = await prisma.staff.create({
    data: {
      staffCode: "STF-01",
      name: "Siddharth Singh",
      role: UserRole.OWNER,
      branchId: delhi.id,
      userId: adminUser.id,
      disciplines: ["MMA", "Brazilian Jiu-Jitsu", "Grappling", "Muay Thai"],
      access: fullAccess,
      attendance: 96,
      performance: "Head coach and founder",
      bio: "First Indian competitive black belt in Brazilian Jiu-Jitsu, Gold Mongkol Master in Muay Thai, and founder of Crosstrain Fight Club.",
    },
  });
  const tarun = await prisma.staff.create({
    data: {
      staffCode: "STF-02",
      name: "Tarun Yadav",
      role: UserRole.TRAINER,
      branchId: delhi.id,
      disciplines: ["Brazilian Jiu-Jitsu", "Gi", "No-Gi", "Grappling"],
      access: ["Members", "PT", "Classes", "Plans"],
      attendance: 91,
      performance: "Eight-time national BJJ champion",
      bio: "BJJ specialist, Asian Games 2022 competitor, brown belt, and senior grappling coach at the Saket academy.",
    },
  });
  const pawan = await prisma.staff.create({
    data: {
      staffCode: "STF-03",
      name: "Pawan Pratap",
      role: UserRole.TRAINER,
      branchId: faridabad.id,
      disciplines: ["MMA", "Fitness", "Wrestling", "Striking"],
      access: ["Members", "PT", "Classes"],
      attendance: 98,
      performance: "National-level MMA athlete",
      bio: "MMA and fitness coach for the Faridabad branch, focused on wrestling, striking, functional strength, and beginner-to-competitor development.",
    },
  });
  await prisma.staff.create({
    data: {
      staffCode: "STF-04",
      name: "Aanand Thakur",
      role: UserRole.FRONT_DESK,
      branchId: delhi.id,
      userId: frontDeskUser.id,
      disciplines: ["Member onboarding", "Billing support", "Front desk operations"],
      access: ["Members", "Billing", "Payments", "QR", "Leads"],
      attendance: 97,
      performance: "Front desk and member support",
      bio: "Handles member onboarding, payment support, attendance coordination, and daily branch operations.",
    },
  });

  const planRows = [
    ["MEM-REG-01", "Regular 1 Month", PlanCategory.REGULAR, 30, 10000, PlanStatus.ACTIVE],
    ["MEM-REG-03", "Regular 3 Month", PlanCategory.REGULAR, 90, 20000, PlanStatus.ACTIVE],
    ["MEM-REG-06", "Regular 6 Month", PlanCategory.REGULAR, 180, 35000, PlanStatus.ACTIVE],
    ["MEM-REG-12", "Regular 12 Month", PlanCategory.REGULAR, 365, 60000, PlanStatus.ACTIVE],
    ["MEM-3DAY-01", "3 Days a Week 1 Month", PlanCategory.THREE_DAYS_A_WEEK, 30, 8000, PlanStatus.ACTIVE],
    ["MEM-3DAY-03", "3 Days a Week 3 Month", PlanCategory.THREE_DAYS_A_WEEK, 90, 16000, PlanStatus.ACTIVE],
    ["MEM-3DAY-06", "3 Days a Week 6 Month", PlanCategory.THREE_DAYS_A_WEEK, 180, 30000, PlanStatus.ACTIVE],
    ["MEM-3DAY-12", "3 Days a Week 12 Month", PlanCategory.THREE_DAYS_A_WEEK, 365, 48000, PlanStatus.ACTIVE],
    ["MEM-2DAY-03", "2 Days a Week 3 Month", PlanCategory.TWO_DAYS_A_WEEK, 90, 14000, PlanStatus.ACTIVE],
    ["MEM-2DAY-06", "2 Days a Week 6 Month", PlanCategory.TWO_DAYS_A_WEEK, 180, 25000, PlanStatus.ACTIVE],
    ["MEM-2DAY-12", "2 Days a Week 12 Month", PlanCategory.TWO_DAYS_A_WEEK, 365, 40000, PlanStatus.ACTIVE],
    ["MEM-OLD-01", "Legacy Fighter Plan", PlanCategory.REGULAR, 30, 7500, PlanStatus.ARCHIVED],
  ] as const;

  await prisma.membershipPlan.createMany({
    data: planRows.map(([code, name, category, durationDays, priceInr, status]) => ({
      code,
      name,
      category,
      durationDays,
      priceInr,
      status,
    })),
  });
  const plans = await prisma.membershipPlan.findMany();
  const planByCode = new Map(plans.map((plan) => [plan.code, plan]));

  const sahil = await prisma.member.create({
    data: {
      memberCode: "MBR-86108",
      name: "Sahil Kashyap",
      phone: "+91 79822 19140",
      email: "student1@example.com",
      passwordHash: passwordHash("password"),
      branchId: delhi.id,
      trainerId: siddharth.id,
      status: MemberStatus.ACTIVE,
      joinedAt: date("2025-10-06"),
      emergencyName: "Rohit Kashyap",
      emergencyPhone: "+91 90000 10001",
    },
  });
  const aarav = await prisma.member.create({
    data: {
      memberCode: "MBR-1048",
      name: "Aarav Sharma",
      phone: "+91 98765 41048",
      email: "student2@example.com",
      passwordHash: passwordHash("password"),
      branchId: delhi.id,
      trainerId: siddharth.id,
      status: MemberStatus.ACTIVE,
      joinedAt: date("2025-08-18"),
    },
  });
  const meera = await prisma.member.create({
    data: {
      memberCode: "MBR-1037",
      name: "Meera Iyer",
      phone: "+91 98765 41037",
      email: "student3@example.com",
      passwordHash: passwordHash("password"),
      branchId: delhi.id,
      trainerId: tarun.id,
      status: MemberStatus.DUE,
      joinedAt: date("2026-02-12"),
    },
  });
  const kabir = await prisma.member.create({
    data: {
      memberCode: "MBR-1019",
      name: "Kabir Sethi",
      phone: "+91 98765 41019",
      email: "student4@example.com",
      passwordHash: passwordHash("password"),
      branchId: noida.id,
      status: MemberStatus.PAUSED,
      joinedAt: date("2026-01-26"),
    },
  });
  const riya = await prisma.member.create({
    data: {
      memberCode: "MBR-1026",
      name: "Riya Menon",
      phone: "+91 98765 41026",
      email: "student5@example.com",
      passwordHash: passwordHash("password"),
      branchId: faridabad.id,
      trainerId: pawan.id,
      status: MemberStatus.ACTIVE,
      joinedAt: date("2026-03-07"),
    },
  });

  await prisma.memberMembership.createMany({
    data: [
      { memberId: sahil.id, planId: planByCode.get("MEM-REG-12")!.id, startsAt: date("2025-10-06"), expiresAt: date("2026-10-06") },
      { memberId: aarav.id, planId: planByCode.get("MEM-REG-12")!.id, startsAt: date("2025-08-18"), expiresAt: date("2026-08-18") },
      { memberId: meera.id, planId: planByCode.get("MEM-REG-03")!.id, startsAt: date("2026-02-12"), expiresAt: date("2026-05-12") },
      { memberId: kabir.id, planId: planByCode.get("MEM-REG-01")!.id, startsAt: date("2026-05-26"), expiresAt: date("2026-06-26"), isActive: false },
      { memberId: riya.id, planId: planByCode.get("MEM-3DAY-03")!.id, startsAt: date("2026-03-07"), expiresAt: date("2026-06-07") },
    ],
  });

  const invoiceSahil = await prisma.invoice.create({
    data: { invoiceCode: "INV-1705", memberId: sahil.id, branchId: delhi.id, amountInr: 52500, status: InvoiceStatus.PAID, issuedOn: date("2025-10-06") },
  });
  const invoiceMeera = await prisma.invoice.create({
    data: { invoiceCode: "INV-2621", memberId: meera.id, branchId: delhi.id, amountInr: 12500, gstInr: 2250, status: InvoiceStatus.DUE, issuedOn: date("2026-05-10"), dueOn: date("2026-05-20") },
  });
  const invoiceAarav = await prisma.invoice.create({
    data: { invoiceCode: "INV-2618", memberId: aarav.id, branchId: delhi.id, amountInr: 42000, gstInr: 7560, status: InvoiceStatus.PAID, issuedOn: date("2026-05-08") },
  });
  await prisma.invoice.create({
    data: { invoiceCode: "INV-2613", memberId: riya.id, branchId: faridabad.id, amountInr: 9500, gstInr: 1710, status: InvoiceStatus.DRAFT, issuedOn: date("2026-05-07") },
  });

  await prisma.payment.createMany({
    data: [
      { paymentCode: "PAY-1705", memberId: sahil.id, invoiceId: invoiceSahil.id, amountInr: 52500, mode: PaymentMode.GOOGLE_PAY_SCREENSHOT, reference: "GPay demo screenshot", paidAt: date("2025-10-06") },
      { paymentCode: "PAY-2618", memberId: aarav.id, invoiceId: invoiceAarav.id, amountInr: 42000, mode: PaymentMode.CASH, reference: "Cash receipt 2618", paidAt: date("2026-05-08") },
      { paymentCode: "PAY-ADV-01", memberId: meera.id, invoiceId: invoiceMeera.id, amountInr: 5000, mode: PaymentMode.RAZORPAY, reference: "Partial payment demo", paidAt: date("2026-05-11") },
    ],
  });

  const coachByName = new Map([
    ["Siddharth Singh", siddharth.id],
    ["Tarun Yadav", tarun.id],
    ["Pawan Pratap", pawan.id],
  ]);
  const classRows = [
    ["CLS-MON-01", 1, "Jiu Jitsu", "Tarun Yadav", "8:00 AM", 18, 24, delhi.id],
    ["CLS-MON-02", 1, "Kids Class BJJ", "Tarun Yadav", "4:30 PM", 16, 20, delhi.id],
    ["CLS-MON-03", 1, "Wrestling", "Pawan Pratap", "5:30 PM", 20, 24, faridabad.id],
    ["CLS-MON-04", 1, "Jiu Jitsu (Gi)", "Tarun Yadav", "7:00 PM", 19, 24, delhi.id],
    ["CLS-MON-05", 1, "Crosstrain 30", null, "5:00 PM to 9:00 PM", 22, 30, delhi.id],
    ["CLS-TUE-01", 2, "Muay Thai", "Siddharth Singh", "8:00 AM", 21, 24, delhi.id],
    ["CLS-TUE-02", 2, "MMA Fundamentals", "Siddharth Singh", "5:30 PM", 23, 26, delhi.id],
    ["CLS-TUE-03", 2, "BJJ Fundamentals", "Tarun Yadav", "7:00 PM", 20, 24, delhi.id],
    ["CLS-TUE-04", 2, "Crosstrain 30", null, "5:00 PM to 9:00 PM", 24, 30, delhi.id],
    ["CLS-WED-01", 3, "MMA Pro Invite Only", "Siddharth Singh", "11:00 AM", 10, 12, delhi.id],
    ["CLS-WED-02", 3, "Kids Class BJJ", "Tarun Yadav", "4:30 PM", 15, 20, delhi.id],
    ["CLS-WED-03", 3, "Wrestling", "Pawan Pratap", "5:30 PM", 21, 24, faridabad.id],
    ["CLS-WED-04", 3, "Muay Thai", "Siddharth Singh", "7:00 PM", 24, 26, delhi.id],
    ["CLS-WED-05", 3, "Crosstrain 30", null, "5:00 PM to 9:00 PM", 22, 30, delhi.id],
    ["CLS-THU-01", 4, "MMA Fundamentals", "Siddharth Singh", "8:00 AM", 20, 24, delhi.id],
    ["CLS-THU-02", 4, "MMA Fundamentals", "Siddharth Singh", "5:30 PM", 23, 26, delhi.id],
    ["CLS-THU-03", 4, "Jiu Jitsu", "Tarun Yadav", "7:00 PM", 18, 24, delhi.id],
    ["CLS-THU-04", 4, "Crosstrain 30", null, "5:00 PM to 9:00 PM", 24, 30, delhi.id],
    ["CLS-FRI-01", 5, "Wrestling", "Pawan Pratap", "8:00 AM", 18, 24, faridabad.id],
    ["CLS-FRI-02", 5, "Kids Class BJJ", "Tarun Yadav", "4:30 PM", 17, 20, delhi.id],
    ["CLS-FRI-03", 5, "BJJ Fundamentals", "Tarun Yadav", "5:30 PM", 22, 24, delhi.id],
    ["CLS-FRI-04", 5, "Muay Thai", "Siddharth Singh", "7:00 PM", 24, 26, delhi.id],
    ["CLS-FRI-05", 5, "Crosstrain 30", null, "5:00 PM to 9:00 PM", 23, 30, delhi.id],
    ["CLS-SAT-01", 6, "Jiu Jitsu", "Tarun Yadav", "11:30 AM", 19, 24, delhi.id],
    ["CLS-SUN-01", 0, "Off", null, "Closed", 0, 1, delhi.id],
  ] as const;

  for (const [code, dayOfWeek, name, coachName, timeLabel, booked, capacity, branchId] of classRows) {
    await prisma.classSlot.create({
      data: { code, dayOfWeek, name, timeLabel, booked, capacity, branchId, coachId: coachName ? coachByName.get(coachName) : undefined },
    });
  }
  const classes = await prisma.classSlot.findMany();
  const classByCode = new Map(classes.map((slot) => [slot.code, slot]));

  await prisma.booking.createMany({
    data: [
      { classId: classByCode.get("CLS-MON-01")!.id, memberId: aarav.id, bookedAt: date("2026-05-18") },
      { classId: classByCode.get("CLS-MON-01")!.id, memberId: meera.id, bookedAt: date("2026-05-18") },
      { classId: classByCode.get("CLS-TUE-01")!.id, memberId: sahil.id, bookedAt: date("2026-05-19") },
      { classId: classByCode.get("CLS-THU-02")!.id, memberId: riya.id, bookedAt: date("2026-05-19") },
      { classId: classByCode.get("CLS-SAT-01")!.id, guestName: "Walk-in Trial", bookedAt: date("2026-05-19") },
    ],
  });

  await prisma.attendance.createMany({
    data: [
      { memberId: sahil.id, branchId: delhi.id, source: AttendanceSource.QR, checkedInAt: date("2026-05-19") },
      { memberId: aarav.id, branchId: delhi.id, source: AttendanceSource.QR, checkedInAt: date("2026-05-30") },
      { memberId: meera.id, branchId: delhi.id, source: AttendanceSource.FRONT_DESK, checkedInAt: date("2026-05-29") },
      { memberId: kabir.id, branchId: noida.id, source: AttendanceSource.MANUAL, checkedInAt: date("2026-05-03") },
      { memberId: riya.id, branchId: faridabad.id, source: AttendanceSource.QR, checkedInAt: date("2026-05-19") },
    ],
  });

  await prisma.lead.createMany({
    data: [
      { leadCode: "LED-442", name: "Ananya Das", phone: "+91 90000 00442", source: "Instagram", stage: LeadStage.TRIAL_BOOKED, nextFollowUp: date("2026-05-19"), branchId: delhi.id, notes: "Interested in BJJ trial." },
      { leadCode: "LED-438", name: "Dev Patel", phone: "+91 90000 00438", source: "Walk-in", stage: LeadStage.FOLLOW_UP, nextFollowUp: date("2026-05-20"), branchId: noida.id, notes: "Asked for evening MMA batch." },
      { leadCode: "LED-431", name: "Sana Khan", phone: "+91 90000 00431", source: "Referral", stage: LeadStage.NEW, nextFollowUp: date("2026-05-22"), branchId: delhi.id },
      { leadCode: "LED-429", name: "Nikhil Rao", phone: "+91 90000 00429", source: "Website", stage: LeadStage.WON, nextFollowUp: date("2026-05-21"), branchId: faridabad.id },
    ],
  });

  await prisma.dietPlan.createMany({
    data: [
      { memberId: aarav.id, calories: 2400, proteinGrams: 155, workoutSplit: "Push Pull Legs", adherence: 88 },
      { memberId: meera.id, calories: 1850, proteinGrams: 118, workoutSplit: "Strength + Yoga", adherence: 74 },
      { memberId: sahil.id, calories: 2600, proteinGrams: 170, workoutSplit: "MMA conditioning + BJJ", adherence: 82 },
    ],
  });

  await prisma.ptPackage.createMany({
    data: [
      { packageCode: "PT-771", memberId: aarav.id, trainerId: siddharth.id, sessionsTotal: 12, sessionsLeft: 8, progress: 72 },
      { packageCode: "PT-763", memberId: meera.id, trainerId: tarun.id, sessionsTotal: 10, sessionsLeft: 3, progress: 58 },
      { packageCode: "PT-758", memberId: riya.id, trainerId: pawan.id, sessionsTotal: 16, sessionsLeft: 12, progress: 34 },
    ],
  });

  await prisma.bodyMeasurement.createMany({
    data: [
      { measurementCode: "MSR-201", memberId: aarav.id, recordedOn: date("2026-04-01"), heightCm: 178, weightKg: 83.4, age: 31, sex: Sex.MALE, chestCm: 104, waistCm: 91, hipCm: 99, bodyFatPercent: 22, bmi: 26.3, bmr: 1792 },
      { measurementCode: "MSR-226", memberId: aarav.id, recordedOn: date("2026-05-15"), heightCm: 178, weightKg: 80.8, age: 31, sex: Sex.MALE, chestCm: 103, waistCm: 87, hipCm: 98, bodyFatPercent: 19, bmi: 25.5, bmr: 1766 },
      { measurementCode: "MSR-203", memberId: meera.id, recordedOn: date("2026-04-10"), heightCm: 164, weightKg: 67.2, age: 28, sex: Sex.FEMALE, chestCm: 91, waistCm: 78, hipCm: 99, bodyFatPercent: 27, bmi: 25, bmr: 1379 },
      { measurementCode: "MSR-229", memberId: meera.id, recordedOn: date("2026-05-20"), heightCm: 164, weightKg: 65.9, age: 28, sex: Sex.FEMALE, chestCm: 90, waistCm: 75, hipCm: 97, bodyFatPercent: 25, bmi: 24.5, bmr: 1366 },
    ],
  });

  await prisma.parqForm.createMany({
    data: [
      { formCode: "PARQ-118", memberId: aarav.id, submittedOn: date("2026-05-15"), status: FormReviewStatus.CLEAR, yesAnswers: [], notes: "No restrictions reported." },
      { formCode: "PARQ-121", memberId: meera.id, submittedOn: date("2026-05-20"), status: FormReviewStatus.REVIEW, yesAnswers: ["Bone or joint problem"], notes: "Occasional knee pain during lunges." },
    ],
  });

  await prisma.medicalHistoryForm.createMany({
    data: [
      { formCode: "MED-109", memberId: aarav.id, submittedOn: date("2026-05-15"), status: FormReviewStatus.CLEAR, conditions: ["None"], allergies: "None", medications: "None", emergencyContact: "Neha Sharma, +91 98765 40001", notes: "Cleared for regular training." },
      { formCode: "MED-114", memberId: meera.id, submittedOn: date("2026-05-20"), status: FormReviewStatus.REVIEW, conditions: ["Knee pain"], allergies: "None", medications: "Vitamin D", emergencyContact: "Rohan Iyer, +91 98765 40002", notes: "Coach to avoid high-impact jumps until assessed." },
    ],
  });

  console.log("Seeded Crosstrain demo data.");
  console.log("Admin login: admin@example.com / password");
  console.log("Student logins: student1@example.com, student2@example.com, student3@example.com, student4@example.com, student5@example.com / password");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
