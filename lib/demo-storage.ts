import type { DashboardSnapshot, Member } from "@/lib/gym-data";

export const DASHBOARD_STORAGE_KEY = "crosstrain-admin-snapshot-v10";
export const MEMBER_SESSION_STORAGE_KEY = "crosstrain-member-session-v1";

export type MemberSession = {
  memberId: string;
  memberName: string;
};

export type AttendanceQrPayload = {
  app: "crosstrain";
  type: "attendance-checkin";
  branch: string;
  date: string;
};

export function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatCheckInTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function createAttendancePayload(branch: string, date = getTodayKey()): AttendanceQrPayload {
  return {
    app: "crosstrain",
    type: "attendance-checkin",
    branch,
    date,
  };
}

export function parseAttendancePayload(value: string): AttendanceQrPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<AttendanceQrPayload>;
    if (
      parsed.app === "crosstrain" &&
      parsed.type === "attendance-checkin" &&
      typeof parsed.branch === "string" &&
      typeof parsed.date === "string"
    ) {
      return parsed as AttendanceQrPayload;
    }
  } catch {
    return null;
  }
  return null;
}

export function createDefaultMemberCredentials(members: Member[]) {
  return members.map((member) => ({ memberId: member.id, pin: "1234" }));
}

export function ensureDemoSnapshot(snapshot: DashboardSnapshot, fallback: DashboardSnapshot): DashboardSnapshot {
  const members = Array.isArray(snapshot.members) ? snapshot.members : fallback.members;
  const existingCredentials = Array.isArray(snapshot.memberCredentials)
    ? snapshot.memberCredentials
    : fallback.memberCredentials ?? [];
  const credentialsByMember = new Map(existingCredentials.map((credential) => [credential.memberId, credential]));
  const memberCredentials = members.map((member) => credentialsByMember.get(member.id) ?? { memberId: member.id, pin: "1234" });

  return {
    ...fallback,
    ...snapshot,
    members,
    memberCredentials,
    attendanceLogs: Array.isArray(snapshot.attendanceLogs) ? snapshot.attendanceLogs : fallback.attendanceLogs ?? [],
  };
}

export function loadDemoSnapshot(fallback: DashboardSnapshot) {
  if (typeof window === "undefined") return fallback;
  const saved = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
  if (!saved) return fallback;
  try {
    return ensureDemoSnapshot(JSON.parse(saved) as DashboardSnapshot, fallback);
  } catch {
    return fallback;
  }
}

export function saveDemoSnapshot(snapshot: DashboardSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadMemberSession() {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(MEMBER_SESSION_STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as MemberSession;
  } catch {
    return null;
  }
}

export function saveMemberSession(session: MemberSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMBER_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearMemberSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MEMBER_SESSION_STORAGE_KEY);
}
