import { NextRequest, NextResponse } from "next/server";

const SHUTTING_DOWN = true;

export function middleware(req: NextRequest) {
  if (!SHUTTING_DOWN) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/shutting-down" || pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL("/shutting-down", req.url));
}

export const config = {
  matcher: "/((?!_next|api).*)",
};
