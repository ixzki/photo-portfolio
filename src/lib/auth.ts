import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const AUTH_COOKIE = "admin_auth";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
function sign(value: string) {
  return createHmac("sha256", ADMIN_PASSWORD).update(value).digest("hex");
}

function tokenValue() {
  return `v1.${sign("admin")}`;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE);
  return Boolean(token?.value && safeEqual(token.value, tokenValue()));
}

export function verifyPassword(password: string): boolean {
  return safeEqual(password, ADMIN_PASSWORD);
}

export async function setAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, tokenValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}

export async function requireAdmin() {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
