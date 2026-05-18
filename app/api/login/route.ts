import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionCookieValue, sessionCookieName, sessionCookieOptions, verifyAdminCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminCredentials(email, password)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, createSessionCookieValue(email), sessionCookieOptions);

  return NextResponse.redirect(new URL("/", request.url), 303);
}
