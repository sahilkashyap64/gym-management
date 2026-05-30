"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { DashboardSnapshot } from "@/lib/gym-data";
import {
  loadDemoSnapshot,
  saveDemoSnapshot,
  saveMemberSession,
} from "@/lib/demo-storage";

const inputClass =
  "min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export default function MemberLoginClient({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [memberId, setMemberId] = useState(initialSnapshot.members[0]?.id ?? "");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    window.setTimeout(() => {
      if (!mounted) return;
      const savedSnapshot = loadDemoSnapshot(initialSnapshot);
      setSnapshot(savedSnapshot);
      setMemberId(savedSnapshot.members[0]?.id ?? "");
      saveDemoSnapshot(savedSnapshot);
    }, 0);

    return () => {
      mounted = false;
    };
  }, [initialSnapshot]);

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const member = snapshot.members.find((item) => item.id === memberId);
    const credential = snapshot.memberCredentials.find((item) => item.memberId === memberId);

    if (!member || !credential || credential.pin !== pin.trim()) {
      setError("Invalid member or PIN");
      return;
    }

    saveMemberSession({ memberId: member.id, memberName: member.name });
    setError("");
    router.push("/member/attendance");
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] px-4 py-6 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-md place-items-center">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Link className="inline-flex items-center gap-3" href="/">
            <div className="grid size-11 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">CT</div>
            <div>
              <p className="text-lg font-bold">Crosstrain</p>
              <p className="text-xs font-medium text-slate-500">Member attendance</p>
            </div>
          </Link>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Member Login</p>
            <h1 className="mt-2 text-3xl font-black">Crosstrain Member Login</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose your member profile and enter the demo PIN to open the QR attendance scanner.
            </p>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={submitLogin}>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Member
              <select className={inputClass} onChange={(event) => setMemberId(event.target.value)} value={memberId}>
                {snapshot.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              PIN
              <input
                className={inputClass}
                inputMode="numeric"
                onChange={(event) => setPin(event.target.value)}
                placeholder="Demo PIN 1234"
                type="password"
                value={pin}
              />
            </label>
            {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
            <button className="rounded-md bg-slate-950 px-4 py-3 text-sm font-bold text-white" type="submit">
              Login and scan QR
            </button>
          </form>

          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-black text-slate-950">Demo PIN</p>
            <p className="mt-1 text-sm text-slate-700">All seeded members use PIN 1234.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
