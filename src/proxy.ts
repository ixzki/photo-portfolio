import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { databaseUrl, isDemoPreview, isPreviewWriteBlocked } from "./lib/preview-config.mjs";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    if (isPreviewWriteBlocked(pathname, request.method)) {
      return NextResponse.json({ error: "当前为只读预览，新增、修改和删除已禁用。" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Don't redirect setup page or static assets.
  if (pathname.startsWith("/setup") || pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  if (!databaseUrl() && !isDemoPreview()) {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
