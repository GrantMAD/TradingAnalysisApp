import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js Middleware — runs on every matched request.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie (keeps auth alive).
 * 2. Protect app routes — redirect unauthenticated users to /login.
 * 3. Redirect authenticated users away from auth pages.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh session and get current user
  const { supabaseResponse, user } = await updateSession(request);

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isApiCallback = pathname.startsWith("/api/auth");
  const isPublic = isAuthPage || isApiCallback;

  // Unauthenticated user trying to access a protected route
  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting the auth pages — send to dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
