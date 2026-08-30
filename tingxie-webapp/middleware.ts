import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  FAMILY_SESSION_COOKIE,
  verifyFamilySessionToken,
} from "@/lib/family-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, Next.js internal requests, uploaded prompts, login page, and public APIs
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/essay_prompts") ||
    pathname.startsWith("/api/") ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i) ||
    pathname === "/favicon.ico" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(FAMILY_SESSION_COOKIE)?.value;

  if (!(await verifyFamilySessionToken(authCookie))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
