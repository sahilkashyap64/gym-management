"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { DashboardSnapshot } from "@/lib/gym-data";
import {
  DEMO_PASSWORD,
  DEMO_STUDENT_ACCOUNTS,
  DEMO_STUDENT_EMAIL,
  loadDemoSnapshot,
  saveDemoSnapshot,
  saveMemberSession,
} from "@/lib/demo-storage";

const inputClass =
  "min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export default function MemberLoginClient({ initialSnapshot }: { initialSnapshot: DashboardSnapshot }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [email, setEmail] = useState(DEMO_STUDENT_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSnapshot.dbStatus?.connected) return;
    let mounted = true;
    window.setTimeout(() => {
      if (!mounted) return;
      const savedSnapshot = loadDemoSnapshot(initialSnapshot);
      setSnapshot(savedSnapshot);
      saveDemoSnapshot(savedSnapshot);
    }, 0);

    return () => {
      mounted = false;
    };
  }, [initialSnapshot]);

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const credential = snapshot.memberCredentials.find((item) => item.email.toLowerCase() === normalizedEmail);
    const member = credential ? snapshot.members.find((item) => item.id === credential.memberId) : undefined;

    if (!member || !credential || credential.password !== password) {
      setError("Invalid student email or password");
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
              Enter any student test account to open the QR attendance scanner.
            </p>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={submitLogin}>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Email
              <input
                autoComplete="username"
                className={inputClass}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={DEMO_STUDENT_EMAIL}
                type="email"
                value={email}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Password
              <input
                autoComplete="current-password"
                className={inputClass}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={DEMO_PASSWORD}
                type="password"
                value={password}
              />
            </label>
            {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
            <button className="rounded-md bg-slate-950 px-4 py-3 text-sm font-bold text-white" type="submit">
              Login and scan QR
            </button>
          </form>

          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-black text-slate-950">Demo student accounts</p>
            <div className="mt-3 grid gap-2">
              {DEMO_STUDENT_ACCOUNTS.map((account) => {
                const member = snapshot.members.find((item) => item.id === account.memberId);
                return (
                  <button
                    className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-emerald-500"
                    key={account.email}
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    type="button"
                  >
                    <span className="block font-bold text-slate-950">{member?.name ?? "Student"}</span>
                    <span>{account.email} / {account.password}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
