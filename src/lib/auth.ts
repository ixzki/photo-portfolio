import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const AUTH_COOKIE = "admin_auth";

function adminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  if (password) return password;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD must be set in production.");
  }
  return "admin123";
}

function sign(value: string) {
  return createHmac("sha256", adminPassword()).update(value).digest("hex");
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
  return safeEqual(password, adminPassword());
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
