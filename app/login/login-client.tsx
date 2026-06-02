"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_PASSWORD,
  loadAdminSession,
  saveAdminSession,
} from "@/lib/demo-storage";

const inputClass =
  "min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_ADMIN_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loadAdminSession()) {
      router.replace("/");
    }
  }, [router]);

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (email.trim().toLowerCase() !== DEMO_ADMIN_EMAIL || password !== DEMO_PASSWORD) {
      setError("Invalid admin email or password");
      return;
    }

    saveAdminSession({ email: DEMO_ADMIN_EMAIL, name: "Demo Admin", role: "Admin" });
    setError("");
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] px-4 py-6 text-slate-950">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-md place-items-center">
        <div className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Link className="inline-flex items-center gap-3" href="/login">
            <div className="grid size-11 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">CT</div>
            <div>
              <p className="text-lg font-bold">Crosstrain</p>
              <p className="text-xs font-medium text-slate-500">Admin operations</p>
            </div>
          </Link>

          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Admin Login</p>
            <h1 className="mt-2 text-3xl font-black">Crosstrain Admin Login</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the generic test account to open the admin dashboard.
            </p>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={submitLogin}>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Email
              <input
                autoComplete="username"
                className={inputClass}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={DEMO_ADMIN_EMAIL}
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
              Login to dashboard
            </button>
          </form>

          <div className="mt-5 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div>
              <p className="text-sm font-black text-slate-950">Demo admin account</p>
              <p className="mt-1 text-sm text-slate-700">{DEMO_ADMIN_EMAIL} / {DEMO_PASSWORD}</p>
            </div>
            <Link className="text-sm font-bold text-emerald-800" href="/member-login">
              Student login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
