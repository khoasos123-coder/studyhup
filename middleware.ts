export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/focus/:path*",
    "/api/study-sessions/:path*",
    "/api/presence/:path*",
    "/api/user/:path*",
  ],
};