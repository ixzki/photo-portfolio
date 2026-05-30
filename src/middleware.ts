import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Don't redirect setup page or static assets
  if (pathname.startsWith("/setup") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // If no DATABASE_URL, redirect to setup
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};