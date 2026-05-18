import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const sessionCookieName = "crosstrain_admin_session";

const sessionMaxAgeSeconds = 60 * 60 * 8;

function getSecret() {
  return process.env.AUTH_SECRET ?? process.env.SESSION_SECRET ?? "local-crosstrain-dev-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionCookieValue(email: string) {
  const expiresAt = Date.now() + sessionMaxAgeSeconds * 1000;
  const nonce = randomBytes(16).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ email, expiresAt, nonce })).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifySessionCookieValue(value?: string) {
  if (!value) {
    return false;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { expiresAt?: number };
    return typeof session.expiresAt === "number" && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  maxAge: sessionMaxAgeSeconds,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function verifyAdminCredentials(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_EMAIL ?? "crosstrainfc@gmail.com";
  const configuredPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  return email.trim().toLowerCase() === configuredEmail.trim().toLowerCase() && password === configuredPassword;
}
