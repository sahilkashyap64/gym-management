"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardSnapshot } from "@/lib/gym-data";
import {
  clearMemberSession,
  formatCheckInTime,
  getTodayKey,
  loadDemoSnapshot,
  loadMemberSession,
  parseAttendancePayload,
  saveDemoSnapshot,
  type MemberSession,
} from "@/lib/demo-storage";

type ScannerInstance = {
  start: (
    cameraConfig: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onScanSuccess: (decodedText: string) => void,
    onScanFailure?: () => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

const readerId = "member-attendance-qr-reader";

function statusClass(tone: "idle" | "success" | "error") {
  if (tone === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "error") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatLogTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MemberAttendanceClient({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const router = useRouter();
  const scannerRef = useRef<ScannerInstance | null>(null);
  const handlingScanRef = useRef(false);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [session, setSession] = useState<MemberSession | null>(null);
  const [scannerRunning, setScannerRunning] = useState(false);
  const [message, setMessage] = useState({ tone: "idle" as "idle" | "success" | "error", text: "Ready to scan the gym attendance QR." });

  useEffect(() => {
    let mounted = true;
    window.setTimeout(() => {
      if (!mounted) return;
      setSnapshot(loadDemoSnapshot(initialSnapshot));
      setSession(loadMemberSession());
    }, 0);

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (!scanner) return;
      void scanner.stop().catch(() => undefined);
      try {
        scanner.clear();
      } catch {
        // Clear is best effort for demo cleanup.
      }
      scannerRef.current = null;
    };
  }, [initialSnapshot]);

  const member = useMemo(
    () => (session ? snapshot.members.find((item) => item.id === session.memberId) : undefined),
    [session, snapshot.members],
  );

  const memberLogs = useMemo(
    () =>
      session
        ? snapshot.attendanceLogs
            .filter((log) => log.memberId === session.memberId)
            .sort((first, second) => Date.parse(second.checkedInAt) - Date.parse(first.checkedInAt))
            .slice(0, 8)
        : [],
    [session, snapshot.attendanceLogs],
  );

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // The library throws if stop is called while the camera is already stopped.
    }
    try {
      scanner.clear();
    } catch {
      // Clear is best effort for demo cleanup.
    }
    scannerRef.current = null;
    setScannerRunning(false);
  }

  async function startScanner() {
    if (!member || scannerRunning) return;
    setMessage({ tone: "idle", text: "Requesting camera access..." });

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(readerId) as ScannerInstance;
      scannerRef.current = scanner;
      handlingScanRef.current = false;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (handlingScanRef.current) return;
          handlingScanRef.current = true;
          void stopScanner().then(() => handleScan(decodedText));
        },
      );

      setScannerRunning(true);
      setMessage({ tone: "idle", text: "Scanner running. Point your camera at the admin attendance QR." });
    } catch {
      scannerRef.current = null;
      setScannerRunning(false);
      setMessage({ tone: "error", text: "Camera could not be started. Use localhost or HTTPS and allow camera access." });
    }
  }

  function handleScan(decodedText: string) {
    if (!member || !session) {
      setMessage({ tone: "error", text: "Please log in again before scanning." });
      return;
    }

    const payload = parseAttendancePayload(decodedText);
    const today = getTodayKey();

    if (!payload) {
      setMessage({ tone: "error", text: "Invalid QR code. Scan the Crosstrain attendance QR from the admin screen." });
      return;
    }

    if (payload.date !== today) {
      setMessage({ tone: "error", text: "This QR code is expired. Ask the front desk to show today’s attendance QR." });
      return;
    }

    const knownBranch = snapshot.branches.some((branch) => branch.name === payload.branch);
    if (!knownBranch) {
      setMessage({ tone: "error", text: "This QR code is not for a registered Crosstrain branch." });
      return;
    }

    const alreadyCheckedIn = snapshot.attendanceLogs.some(
      (log) => log.memberId === member.id && getTodayKey(new Date(log.checkedInAt)) === today,
    );

    if (alreadyCheckedIn) {
      setMessage({ tone: "error", text: "You have already checked in today." });
      return;
    }

    const now = new Date();
    const log = {
      id: `ATT-${now.getTime()}`,
      memberId: member.id,
      memberName: member.name,
      branch: payload.branch,
      checkedInAt: now.toISOString(),
      source: "member-qr" as const,
    };

    const nextSnapshot: DashboardSnapshot = {
      ...snapshot,
      metrics: {
        ...snapshot.metrics,
        attendanceToday: snapshot.metrics.attendanceToday + 1,
      },
      members: snapshot.members.map((item) =>
        item.id === member.id
          ? { ...item, lastCheckIn: `Today, ${formatCheckInTime(now).split(", ").at(-1) ?? "now"}` }
          : item,
      ),
      attendanceLogs: [log, ...snapshot.attendanceLogs],
    };

    saveDemoSnapshot(nextSnapshot);
    setSnapshot(nextSnapshot);
    setMessage({ tone: "success", text: `Checked in at ${payload.branch}.` });
  }

  function logout() {
    void stopScanner();
    clearMemberSession();
    router.push("/member-login");
  }

  if (!session || !member) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 py-6 text-slate-950">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Member Attendance</p>
          <h1 className="mt-2 text-3xl font-black">Login Required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Log in as a member before opening the QR scanner.</p>
          <Link className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-bold text-white" href="/member-login">
            Go to member login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] px-4 py-6 text-slate-950">
      <section className="mx-auto grid w-full max-w-3xl gap-5">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Member Attendance</p>
              <h1 className="mt-2 text-3xl font-black">QR Scanner</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">{member.name} · {member.plan}</p>
            </div>
            <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-lg bg-slate-950 p-3">
            <div className="min-h-72 overflow-hidden rounded-md bg-slate-900" id={readerId} />
          </div>
          <div className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${statusClass(message.tone)}`}>
            {message.text}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              className="rounded-md bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              disabled={scannerRunning}
              onClick={startScanner}
              type="button"
            >
              Start scanner
            </button>
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 disabled:opacity-50"
              disabled={!scannerRunning}
              onClick={() => void stopScanner()}
              type="button"
            >
              Stop scanner
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black">Recent Check-ins</h2>
            <p className="mt-1 text-sm text-slate-500">Attendance recorded from this member login.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {memberLogs.length ? (
              memberLogs.map((log) => (
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm" key={log.id}>
                  <div>
                    <p className="font-bold text-slate-950">{log.branch}</p>
                    <p className="mt-1 text-xs text-slate-500">{log.id}</p>
                  </div>
                  <p className="text-xs font-bold text-slate-600">{formatLogTime(log.checkedInAt)}</p>
                </div>
              ))
            ) : (
              <div className="p-5 text-sm font-semibold text-slate-500">No check-ins recorded from this member login yet.</div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
