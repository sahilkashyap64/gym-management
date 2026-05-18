import { createHash } from "crypto";
import { PrismaClient } from "../lib/generated/prisma/client";
import {
  AttendanceSource,
  BranchStatus,
  InvoiceStatus,
  LeadStage,
  MemberStatus,
  PaymentMode,
  PlanCategory,
  PlanStatus,
  UserRole,
} from "../lib/generated/prisma/enums";

const prisma = new PrismaClient();

const fullAccess = ["Members", "Membership", "Billing", "Payments", "QR", "PT", "Staff", "Classes", "Leads", "Plans", "Reports"];

function date(value: string) {
  return new Date(`${value}T09:00:00.000+05:30`);
}

function demoPasswordHash(password: string) {
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

  const ownerUser = await prisma.user.create({
    data: {
      email: "crosstrainfc@gmail.com",
      name: "Siddharth Singh",
      passwordHash: demoPasswordHash("admin123"),
      role: UserRole.OWNER,
      branchId: delhi.id,
    },
  });

  const frontDeskUser = await prisma.user.create({
    data: {
      email: "frontdesk@crosstrain.local",
      name: "Aanand Thakur",
      passwordHash: demoPasswordHash("frontdesk123"),
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
      userId: ownerUser.id,
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
      bio: "MMA and fitness coach focused on wrestling, striking, functional strength, and beginner-to-competitor development.",
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

  const plans = await Promise.all([
    prisma.membershipPlan.create({ data: { code: "MEM-REG-01", name: "Regular 1 Month", category: PlanCategory.REGULAR, durationDays: 30, priceInr: 10000 } }),
    prisma.membershipPlan.create({ data: { code: "MEM-REG-03", name: "Regular 3 Month", category: PlanCategory.REGULAR, durationDays: 90, priceInr: 20000 } }),
    prisma.membershipPlan.create({ data: { code: "MEM-REG-06", name: "Regular 6 Month", category: PlanCategory.REGULAR, durationDays: 180, priceInr: 35000 } }),
    prisma.membershipPlan.create({ data: { code: "MEM-REG-12", name: "Regular 12 Month", category: PlanCategory.REGULAR, durationDays: 365, priceInr: 60000 } }),
    prisma.membershipPlan.create({ data: { code: "MEM-3DAY-03", name: "3 Days a Week 3 Month", category: PlanCategory.THREE_DAYS_A_WEEK, durationDays: 90, priceInr: 16000 } }),
    prisma.membershipPlan.create({ data: { code: "MEM-2DAY-06", name: "2 Days a Week 6 Month", category: PlanCategory.TWO_DAYS_A_WEEK, durationDays: 180, priceInr: 25000 } }),
    prisma.membershipPlan.create({ data: { code: "MEM-OLD-01", name: "Legacy Fighter Plan", category: PlanCategory.REGULAR, durationDays: 30, priceInr: 7500, status: PlanStatus.ARCHIVED } }),
  ]);

  const [regularOne, regularThree, , regularYear, threeDayThree] = plans;

  const sahil = await prisma.member.create({
    data: {
      memberCode: "MBR-86108",
      name: "Sahil Kashyap",
      phone: "+91 79822 19140",
      email: "sahil@example.com",
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
      email: "aarav@example.com",
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
      email: "meera@example.com",
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
      email: "kabir@example.com",
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
      email: "riya@example.com",
      branchId: faridabad.id,
      trainerId: pawan.id,
      status: MemberStatus.ACTIVE,
      joinedAt: date("2026-03-07"),
    },
  });

  await prisma.memberMembership.createMany({
    data: [
      { memberId: sahil.id, planId: regularYear.id, startsAt: date("2025-10-06"), expiresAt: date("2026-10-06") },
      { memberId: aarav.id, planId: regularYear.id, startsAt: date("2025-08-18"), expiresAt: date("2026-08-18") },
      { memberId: meera.id, planId: regularThree.id, startsAt: date("2026-02-12"), expiresAt: date("2026-05-12") },
      { memberId: kabir.id, planId: regularOne.id, startsAt: date("2026-05-26"), expiresAt: date("2026-06-26"), isActive: false },
      { memberId: riya.id, planId: threeDayThree.id, startsAt: date("2026-03-07"), expiresAt: date("2026-06-07") },
    ],
  });

  const invoiceSahil = await prisma.invoice.create({
    data: { invoiceCode: "INV-1705", memberId: sahil.id, branchId: delhi.id, amountInr: 52500, gstInr: 0, status: InvoiceStatus.PAID, issuedOn: date("2025-10-06") },
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

  const classes = await Promise.all([
    prisma.classSlot.create({ data: { code: "CLS-MON-01", dayOfWeek: 1, name: "Jiu Jitsu", coachId: tarun.id, branchId: delhi.id, timeLabel: "8:00 AM", booked: 18, capacity: 24 } }),
    prisma.classSlot.create({ data: { code: "CLS-MON-03", dayOfWeek: 1, name: "Wrestling", coachId: pawan.id, branchId: faridabad.id, timeLabel: "5:30 PM", booked: 20, capacity: 24 } }),
    prisma.classSlot.create({ data: { code: "CLS-TUE-01", dayOfWeek: 2, name: "Muay Thai", coachId: siddharth.id, branchId: delhi.id, timeLabel: "8:00 AM", booked: 21, capacity: 24 } }),
    prisma.classSlot.create({ data: { code: "CLS-THU-02", dayOfWeek: 4, name: "MMA Fundamentals", coachId: siddharth.id, branchId: delhi.id, timeLabel: "5:30 PM", booked: 23, capacity: 26 } }),
    prisma.classSlot.create({ data: { code: "CLS-SAT-01", dayOfWeek: 6, name: "Jiu Jitsu", coachId: tarun.id, branchId: delhi.id, timeLabel: "11:30 AM", booked: 19, capacity: 24 } }),
  ]);

  await prisma.booking.createMany({
    data: [
      { classId: classes[0].id, memberId: aarav.id, bookedAt: date("2026-05-18") },
      { classId: classes[0].id, memberId: meera.id, bookedAt: date("2026-05-18") },
      { classId: classes[2].id, memberId: sahil.id, bookedAt: date("2026-05-19") },
      { classId: classes[3].id, memberId: riya.id, bookedAt: date("2026-05-19") },
      { classId: classes[4].id, guestName: "Walk-in Trial", bookedAt: date("2026-05-19") },
    ],
  });

  await prisma.attendance.createMany({
    data: [
      { memberId: sahil.id, branchId: delhi.id, source: AttendanceSource.QR, checkedInAt: date("2026-05-19") },
      { memberId: aarav.id, branchId: delhi.id, source: AttendanceSource.QR, checkedInAt: date("2026-05-19") },
      { memberId: meera.id, branchId: delhi.id, source: AttendanceSource.FRONT_DESK, checkedInAt: date("2026-05-18") },
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

  console.log("Seeded Crosstrain demo data.");
  console.log("Admin login: crosstrainfc@gmail.com / admin123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
