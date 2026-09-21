import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Kiểm tra cookie session của NextAuth / Auth.js (hỗ trợ cả HTTP local và HTTPS Vercel)
  const token =
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value;

  if (!token) {
    // Nếu truy cập API nội bộ mà chưa đăng nhập, trả về mã 401
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Nếu vào trang học (/focus), chuyển hướng về trang đăng nhập
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/focus/:path*",
    "/api/study-sessions/:path*",
    "/api/presence/:path*",
    "/api/user/:path*",
  ],
};