import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated, setAuthCookie, clearAuthCookie, verifyPassword } from "@/lib/auth";

export async function GET() {
  const authenticated = await isAuthenticated();
  return NextResponse.json({ authenticated });
}

export async function POST(request: NextRequest) {
  const { password, action } = await request.json();

  if (action === "login") {
    if (verifyPassword(password)) {
      await setAuthCookie();
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "密码错误" }, { status: 401 });
  }

  if (action === "logout") {
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
