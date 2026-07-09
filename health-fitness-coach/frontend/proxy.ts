import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

const GUEST_ONLY = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("fitcoach_token")?.value;

  const isProtected = PROTECTED.some((r) => pathname.startsWith(r));
  const isGuestOnly = GUEST_ONLY.some((r) => pathname.startsWith(r));

  if (isProtected && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

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