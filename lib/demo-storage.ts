import type { DashboardSnapshot, Member } from "@/lib/gym-data";

export const DASHBOARD_STORAGE_KEY = "crosstrain-admin-snapshot-v10";
export const ADMIN_SESSION_STORAGE_KEY = "crosstrain-admin-session-v1";
export const MEMBER_SESSION_STORAGE_KEY = "crosstrain-member-session-v1";

export const DEMO_ADMIN_EMAIL = "admin@example.com";
export const DEMO_STUDENT_EMAIL = "student1@example.com";
export const DEMO_PASSWORD = "password";
export const DEMO_STUDENT_ACCOUNTS = [
  { memberId: "MBR-86108", email: "student1@example.com", password: DEMO_PASSWORD },
  { memberId: "MBR-1048", email: "student2@example.com", password: DEMO_PASSWORD },
  { memberId: "MBR-1037", email: "student3@example.com", password: DEMO_PASSWORD },
  { memberId: "MBR-1019", email: "student4@example.com", password: DEMO_PASSWORD },
  { memberId: "MBR-1026", email: "student5@example.com", password: DEMO_PASSWORD },
];

export type MemberSession = {
  memberId: string;
  memberName: string;
};

export type AdminSession = {
  email: string;
  name: string;
  role: "Admin";
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
  const knownMemberIds = new Set(members.map((member) => member.id));
  return DEMO_STUDENT_ACCOUNTS.filter((account) => knownMemberIds.has(account.memberId));
}

export function ensureDemoSnapshot(snapshot: DashboardSnapshot, fallback: DashboardSnapshot): DashboardSnapshot {
  const members = Array.isArray(snapshot.members) ? snapshot.members : fallback.members;
  const existingCredentials = Array.isArray(snapshot.memberCredentials)
    ? snapshot.memberCredentials
    : fallback.memberCredentials ?? [];
  const knownMemberIds = new Set(members.map((member) => member.id));
  const demoCredentials = createDefaultMemberCredentials(members);
  const demoEmails = new Set(demoCredentials.map((credential) => credential.email.toLowerCase()));
  const memberCredentials = [
    ...demoCredentials,
    ...existingCredentials.filter(
      (credential) => knownMemberIds.has(credential.memberId) && !demoEmails.has(credential.email.toLowerCase()),
    ),
  ];

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

export function loadAdminSession() {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as AdminSession;
  } catch {
    return null;
  }
}

export function saveAdminSession(session: AdminSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAdminSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
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
