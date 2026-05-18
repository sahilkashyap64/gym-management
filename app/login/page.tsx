import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieName, verifySessionCookieValue } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  if (verifySessionCookieValue(cookieStore.get(sessionCookieName)?.value)) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#dff7e8,transparent_32%),linear-gradient(135deg,#f8faf7,#e8ede7)] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-7 shadow-2xl shadow-slate-900/10 backdrop-blur">
        <div className="mb-7">
          <div className="grid size-12 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">CT</div>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Crosstrain Admin</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Sign in to manage the gym</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use the admin credentials configured in your environment.</p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">
            Invalid email or password.
          </p>
        ) : null}

        <form action="/api/login" className="grid gap-4" method="post">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            Email
            <input
              autoComplete="email"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              defaultValue="crosstrainfc@gmail.com"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            Password
            <input
              autoComplete="current-password"
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              name="password"
              placeholder="Enter password"
              required
              type="password"
            />
          </label>
          <button className="mt-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800" type="submit">
            Sign in
          </button>
        </form>

        <p className="mt-5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold leading-5 text-slate-600">
          Local default: crosstrainfc@gmail.com / admin123. Set ADMIN_EMAIL, ADMIN_PASSWORD, and AUTH_SECRET in .env before production.
        </p>
      </section>
    </main>
  );
}
