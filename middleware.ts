import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the maintenance page, static assets, and Next.js internals through untouched
  if (
    pathname === "/maintenance" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    /\.(ico|png|svg|jpg|jpeg|webp|gif|woff|woff2|ttf|otf|js|css|map|json|txt|xml)$/.test(
      pathname
    )
  ) {
    return NextResponse.next();
  }

  // Rewrite every other route to the maintenance page
  // (rewrite keeps the original URL in the address bar)
  return NextResponse.rewrite(new URL("/maintenance", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
