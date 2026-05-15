import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const token = request.cookies.get("bharatpayu.refreshToken")?.value;
  if (isDashboard && !token && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
