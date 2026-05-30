import type { Member } from "@/lib/gym-data";

export type MembershipReminder = {
  memberId: string;
  memberName: string;
  phone: string;
  plan: string;
  expiry: string;
  daysUntilExpiry: number;
  message: string;
};

const monthIndex: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseMembershipExpiry(value: string) {
  const [day, month, year] = value.trim().split(/\s+/);
  const monthNumber = monthIndex[month];
  const dayNumber = Number(day);
  const yearNumber = Number(year);
  if (!dayNumber || monthNumber === undefined || !yearNumber) return null;
  return new Date(yearNumber, monthNumber, dayNumber);
}

export function getDaysUntilExpiry(expiry: string, now = new Date()) {
  const expiryDate = parseMembershipExpiry(expiry);
  if (!expiryDate) return null;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((startOfDay(expiryDate).getTime() - startOfDay(now).getTime()) / millisecondsPerDay);
}

export function normalizeWhatsAppPhone(value: string) {
  return value.replace(/\D/g, "");
}

export function buildMembershipReminderMessage(member: Pick<Member, "name" | "plan" | "expiry">, daysUntilExpiry: number) {
  const dayCopy = daysUntilExpiry === 0 ? "today" : `in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`;
  return `Hi ${member.name}, your Crosstrain membership (${member.plan}) expires ${dayCopy} on ${member.expiry}. Please renew to continue training without interruption.`;
}

export function getMembershipReminders(members: Member[], daysWindow: number, now = new Date()) {
  return members
    .map((member) => {
      const daysUntilExpiry = getDaysUntilExpiry(member.expiry, now);
      if (daysUntilExpiry === null || daysUntilExpiry < 0 || daysUntilExpiry > daysWindow) return null;
      const phone = normalizeWhatsAppPhone(member.phone);
      if (!phone) return null;
      return {
        memberId: member.id,
        memberName: member.name,
        phone,
        plan: member.plan,
        expiry: member.expiry,
        daysUntilExpiry,
        message: buildMembershipReminderMessage(member, daysUntilExpiry),
      } satisfies MembershipReminder;
    })
    .filter((reminder): reminder is MembershipReminder => Boolean(reminder));
}
