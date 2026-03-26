import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that require login
const PROTECTED = [
  "/dashboard",
  "/ai-coach",
  "/workouts",
  "/nutrition",
  "/progress",
  "/profile",
  "/settings",
  "/help",
];

// Pages only for guests
const GUEST_ONLY = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read token from cookie (set by AuthContext on login)
  const token = request.cookies.get("fitcoach_token")?.value;

  const isProtected = PROTECTED.some((r) => pathname.startsWith(r));
  const isGuestOnly = GUEST_ONLY.some((r) => pathname.startsWith(r));

  // Not logged in → redirect to login
  if (isProtected && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Already logged in → redirect away from login/register
  if (isGuestOnly && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ai-coach/:path*",
    "/workouts/:path*",
    "/nutrition/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/help/:path*",
    "/login",
    "/register",
  ],
};