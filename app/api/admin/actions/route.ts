import { createHash } from "crypto";
import {
  FormReviewStatus,
  InvoiceStatus,
  LeadStage,
  MemberStatus,
  PaymentMode,
  PlanCategory,
  PlanStatus,
  Sex,
  UserRole,
} from "@/lib/generated/prisma";
import { getGymDataStore } from "@/lib/gym-data";
import { prisma } from "@/lib/prisma";

type AdminActionRequest = {
  action?: unknown;
  payload?: Record<string, unknown>;
};

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function code(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function parseDate(value: unknown, fallbackDays = 30) {
  const parsed = new Date(text(value));
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + fallbackDays);
  return fallback;
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function memberStatus(value: unknown) {
  if (value === "due") return MemberStatus.DUE;
  if (value === "paused") return MemberStatus.PAUSED;
  if (value === "lead") return MemberStatus.LEAD;
  return MemberStatus.ACTIVE;
}

function userRole(value: unknown) {
  if (value === "Owner") return UserRole.OWNER;
  if (value === "Manager") return UserRole.MANAGER;
  if (value === "Trainer") return UserRole.TRAINER;
  return UserRole.FRONT_DESK;
}

function planCategory(value: unknown) {
  if (value === "3 Days a Week") return PlanCategory.THREE_DAYS_A_WEEK;
  if (value === "2 Days a Week") return PlanCategory.TWO_DAYS_A_WEEK;
  return PlanCategory.REGULAR;
}

function durationDays(value: unknown) {
  const label = text(value);
  if (label.includes("12")) return 365;
  if (label.includes("6")) return 180;
  if (label.includes("3")) return 90;
  return 30;
}

function invoiceStatus(value: unknown) {
  if (value === "paid") return InvoiceStatus.PAID;
  if (value === "due") return InvoiceStatus.DUE;
  return InvoiceStatus.DRAFT;
}

function paymentMode(value: unknown) {
  if (value === "Google Pay Screenshot") return PaymentMode.GOOGLE_PAY_SCREENSHOT;
  if (value === "Razorpay") return PaymentMode.RAZORPAY;
  return PaymentMode.CASH;
}

function sex(value: unknown) {
  return value === "female" ? Sex.FEMALE : Sex.MALE;
}

function reviewStatus(value: unknown) {
  return value === "review" ? FormReviewStatus.REVIEW : FormReviewStatus.CLEAR;
}

async function findBranch(name: unknown) {
  const branch = await prisma.branch.findFirst({ where: { name: text(name, "Delhi Branch") } });
  if (!branch) throw new Error("Branch not found.");
  return branch;
}

async function findMemberByCodeOrName(value: unknown) {
  const query = text(value);
  const member = await prisma.member.findFirst({
    where: { OR: [{ memberCode: query }, { name: query }] },
  });
  if (!member) throw new Error("Member not found.");
  return member;
}

async function findStaffByCodeOrName(value: unknown) {
  const query = text(value);
  const staff = await prisma.staff.findFirst({
    where: { OR: [{ staffCode: query }, { name: query }] },
  });
  if (!staff) throw new Error("Staff not found.");
  return staff;
}

async function handleAction(action: string, payload: Record<string, unknown>) {
  if (action === "addMember") {
    const branch = await findBranch(payload.branch);
    const plan = await prisma.membershipPlan.findFirst({
      where: { name: text(payload.plan), status: PlanStatus.ACTIVE },
    });
    const trainerName = text(payload.trainer);
    const trainer = trainerName && trainerName !== "Unassigned" ? await prisma.staff.findFirst({ where: { name: trainerName } }) : null;
    const member = await prisma.member.create({
      data: {
        memberCode: code("MBR"),
        name: text(payload.name),
        phone: text(payload.phone, `Pending-${Date.now()}`),
        email: text(payload.email) || null,
        passwordHash: hashPassword("password"),
        status: memberStatus(payload.status),
        branchId: branch.id,
        trainerId: trainer?.id,
      },
    });
    if (plan) {
      await prisma.memberMembership.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          startsAt: new Date(),
          expiresAt: parseDate(payload.expiry),
        },
      });
    }
    return;
  }

  if (action === "updateMemberStatus") {
    const member = await findMemberByCodeOrName(payload.id);
    await prisma.member.update({ where: { id: member.id }, data: { status: memberStatus(payload.status) } });
    return;
  }

  if (action === "updateMemberBranch") {
    const [member, branch] = await Promise.all([findMemberByCodeOrName(payload.id), findBranch(payload.branch)]);
    await prisma.member.update({ where: { id: member.id }, data: { branchId: branch.id } });
    return;
  }

  if (action === "updateMemberTrainer") {
    const member = await findMemberByCodeOrName(payload.id);
    const trainerName = text(payload.trainer);
    const trainer = trainerName && trainerName !== "Unassigned" ? await prisma.staff.findFirst({ where: { name: trainerName } }) : null;
    await prisma.member.update({ where: { id: member.id }, data: { trainerId: trainer?.id ?? null } });
    return;
  }

  if (action === "addInvoice") {
    const member = await findMemberByCodeOrName(payload.member);
    const amountInr = numberValue(payload.amount);
    await prisma.invoice.create({
      data: {
        invoiceCode: code("INV"),
        memberId: member.id,
        branchId: member.branchId,
        amountInr,
        gstInr: Math.round(amountInr * 0.18),
        status: invoiceStatus(payload.status),
      },
    });
    return;
  }

  if (action === "markInvoicePaid") {
    const invoice = await prisma.invoice.findUnique({ where: { invoiceCode: text(payload.id) } });
    if (!invoice) throw new Error("Invoice not found.");
    await prisma.$transaction([
      prisma.invoice.update({ where: { id: invoice.id }, data: { status: InvoiceStatus.PAID } }),
      prisma.payment.create({
        data: {
          paymentCode: code("PAY"),
          memberId: invoice.memberId,
          invoiceId: invoice.id,
          amountInr: invoice.amountInr + invoice.gstInr,
          mode: paymentMode(payload.paymentMode),
          reference: text(payload.reference) || null,
        },
      }),
    ]);
    return;
  }

  if (action === "addStaff") {
    const branch = await findBranch(payload.branch);
    const role = userRole(payload.role);
    await prisma.staff.create({
      data: {
        staffCode: code("STF"),
        name: text(payload.name),
        role,
        branchId: branch.id,
        disciplines: [text(payload.role, "Trainer")],
        access: Array.isArray(payload.access) ? payload.access.map(String) : [],
        attendance: 100,
        performance: "New staff profile",
        bio: "New team member profile",
      },
    });
    return;
  }

  if (action === "updateStaffBranch") {
    const [staff, branch] = await Promise.all([findStaffByCodeOrName(payload.id), findBranch(payload.branch)]);
    await prisma.staff.update({ where: { id: staff.id }, data: { branchId: branch.id } });
    return;
  }

  if (action === "toggleStaffAccess") {
    const staff = await findStaffByCodeOrName(payload.id);
    const access = text(payload.access);
    const nextAccess = staff.access.includes(access) ? staff.access.filter((item) => item !== access) : [...staff.access, access];
    await prisma.staff.update({ where: { id: staff.id }, data: { access: nextAccess } });
    return;
  }

  if (action === "addMembershipPlan") {
    const category = planCategory(payload.category);
    const days = durationDays(payload.duration);
    await prisma.membershipPlan.create({
      data: {
        code: code("MEM"),
        name: `${text(payload.category, "Regular")} ${text(payload.duration, "1 Month")}`,
        category,
        durationDays: days,
        priceInr: numberValue(payload.price),
      },
    });
    return;
  }

  if (action === "updateMembershipPlan") {
    const category = planCategory(payload.category);
    await prisma.membershipPlan.update({
      where: { code: text(payload.id) },
      data: {
        name: `${text(payload.category, "Regular")} ${text(payload.duration, "1 Month")}`,
        category,
        durationDays: durationDays(payload.duration),
        priceInr: numberValue(payload.price),
      },
    });
    return;
  }

  if (action === "setMembershipPlanStatus") {
    await prisma.membershipPlan.update({
      where: { code: text(payload.id) },
      data: { status: payload.status === "archived" ? PlanStatus.ARCHIVED : PlanStatus.ACTIVE },
    });
    return;
  }

  if (action === "deleteMembershipPlan") {
    await prisma.membershipPlan.delete({ where: { code: text(payload.id) } });
    return;
  }

  if (action === "addClass") {
    const branch = await prisma.branch.findFirst();
    if (!branch) throw new Error("Branch not found.");
    const coach = text(payload.coach) ? await prisma.staff.findFirst({ where: { name: text(payload.coach) } }) : null;
    await prisma.classSlot.create({
      data: {
        code: code("CLS"),
        dayOfWeek: Math.max(0, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(text(payload.day, "Monday"))),
        name: text(payload.name),
        timeLabel: text(payload.time, "7:00 PM"),
        capacity: numberValue(payload.capacity, 20),
        branchId: branch.id,
        coachId: coach?.id,
      },
    });
    return;
  }

  if (action === "adjustClassBooking") {
    const slot = await prisma.classSlot.findUnique({ where: { code: text(payload.id) } });
    if (!slot) throw new Error("Class not found.");
    const delta = numberValue(payload.delta);
    await prisma.classSlot.update({
      where: { id: slot.id },
      data: { booked: Math.max(0, Math.min(slot.capacity, slot.booked + delta)) },
    });
    return;
  }

  if (action === "addLead") {
    const branch = await prisma.branch.findFirst();
    if (!branch) throw new Error("Branch not found.");
    await prisma.lead.create({
      data: {
        leadCode: code("LED"),
        name: text(payload.name),
        source: text(payload.source, "Walk-in"),
        nextFollowUp: parseDate(payload.nextFollowUp, 1),
        branchId: branch.id,
      },
    });
    return;
  }

  if (action === "advanceLead") {
    const lead = await prisma.lead.findUnique({ where: { leadCode: text(payload.id) } });
    if (!lead) throw new Error("Lead not found.");
    const stages = [LeadStage.NEW, LeadStage.FOLLOW_UP, LeadStage.TRIAL_BOOKED, LeadStage.WON];
    const currentIndex = stages.findIndex((stage) => stage === lead.stage);
    await prisma.lead.update({
      where: { id: lead.id },
      data: { stage: stages[Math.min(Math.max(currentIndex, 0) + 1, stages.length - 1)] },
    });
    return;
  }

  if (action === "convertLead") {
    const lead = await prisma.lead.findUnique({ where: { leadCode: text(payload.id) } });
    const branch = await prisma.branch.findFirst();
    if (!lead || !branch) throw new Error("Lead or branch not found.");
    await prisma.$transaction([
      prisma.lead.update({ where: { id: lead.id }, data: { stage: LeadStage.WON } }),
      prisma.member.create({
        data: {
          memberCode: code("MBR"),
          name: lead.name,
          phone: lead.phone ?? `Pending-${Date.now()}`,
          status: MemberStatus.ACTIVE,
          branchId: branch.id,
          passwordHash: hashPassword("password"),
        },
      }),
    ]);
    return;
  }

  if (action === "addPlan") {
    const member = await findMemberByCodeOrName(payload.member);
    await prisma.dietPlan.create({
      data: {
        memberId: member.id,
        calories: numberValue(payload.calories),
        proteinGrams: numberValue(payload.protein),
        workoutSplit: text(payload.workoutSplit),
      },
    });
    return;
  }

  if (action === "adjustPlanAdherence") {
    const plan = await prisma.dietPlan.findUnique({ where: { id: text(payload.id) } });
    if (!plan) throw new Error("Plan not found.");
    await prisma.dietPlan.update({
      where: { id: plan.id },
      data: { adherence: Math.max(0, Math.min(100, plan.adherence + numberValue(payload.delta))) },
    });
    return;
  }

  if (action === "addPtPackage") {
    const member = await findMemberByCodeOrName(payload.member);
    const trainer = await findStaffByCodeOrName(payload.trainer);
    const sessionsLeft = numberValue(payload.sessionsLeft, 12);
    await prisma.ptPackage.create({
      data: {
        packageCode: code("PT"),
        memberId: member.id,
        trainerId: trainer.id,
        sessionsTotal: sessionsLeft,
        sessionsLeft,
      },
    });
    return;
  }

  if (action === "logPtSession") {
    const pack = await prisma.ptPackage.findUnique({ where: { packageCode: text(payload.id) } });
    if (!pack) throw new Error("PT package not found.");
    await prisma.ptPackage.update({
      where: { id: pack.id },
      data: { sessionsLeft: Math.max(0, pack.sessionsLeft - 1), progress: Math.min(100, pack.progress + 8) },
    });
    return;
  }

  if (action === "addMeasurement") {
    const member = await findMemberByCodeOrName(payload.member);
    await prisma.bodyMeasurement.create({
      data: {
        measurementCode: code("MSR"),
        memberId: member.id,
        recordedOn: new Date(),
        heightCm: numberValue(payload.heightCm),
        weightKg: numberValue(payload.weightKg),
        age: numberValue(payload.age),
        sex: sex(payload.sex),
        chestCm: numberValue(payload.chestCm),
        waistCm: numberValue(payload.waistCm),
        hipCm: numberValue(payload.hipCm),
        bodyFatPercent: numberValue(payload.bodyFatPercent),
        bmi: numberValue(payload.bmi),
        bmr: numberValue(payload.bmr),
      },
    });
    return;
  }

  if (action === "addParqForm") {
    const member = await findMemberByCodeOrName(payload.member);
    await prisma.parqForm.create({
      data: {
        formCode: code("PARQ"),
        memberId: member.id,
        submittedOn: new Date(),
        status: reviewStatus(payload.status),
        yesAnswers: Array.isArray(payload.yesAnswers) ? payload.yesAnswers.map(String) : [],
        notes: text(payload.notes) || null,
      },
    });
    return;
  }

  if (action === "addMedicalHistoryForm") {
    const member = await findMemberByCodeOrName(payload.member);
    await prisma.medicalHistoryForm.create({
      data: {
        formCode: code("MED"),
        memberId: member.id,
        submittedOn: new Date(),
        status: reviewStatus(payload.status),
        conditions: Array.isArray(payload.conditions) ? payload.conditions.map(String) : ["None"],
        allergies: text(payload.allergies, "None"),
        medications: text(payload.medications, "None"),
        emergencyContact: text(payload.emergencyContact, "Not provided"),
        notes: text(payload.notes) || null,
      },
    });
    return;
  }

  throw new Error("Unsupported admin action.");
}

export async function POST(request: Request) {
  let body: AdminActionRequest;
  try {
    body = (await request.json()) as AdminActionRequest;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const action = text(body.action);
  if (!action) return Response.json({ error: "Missing admin action." }, { status: 400 });

  try {
    await handleAction(action, body.payload ?? {});
    const snapshot = await getGymDataStore().getDashboardSnapshot();
    return Response.json({ snapshot });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Database action failed." }, { status: 500 });
  }
}
