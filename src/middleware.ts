import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/pricing",
  "/platform",
  "/use-cases",
  "/resources",
  "/demo",
  "/about",
  "/careers",
  "/privacy",
  "/terms",
  "/contact",
  "/api/neo4j/init-schema",
  "/api/subscription/webhook",
];

// Check if path matches any public route
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => {
    if (route === pathname) return true;
    if (pathname.startsWith(route + "/")) return true;
    return false;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") // Static files like .js, .css, .svg, etc.
  ) {
    return NextResponse.next();
  }

  // Allow onboarding routes for authenticated users
  if (pathname.startsWith("/onboarding")) {
    const privyToken = request.cookies.get("privy-token");
    if (!privyToken) {
      const url = new URL("/", request.url);
      url.searchParams.set("login", "required");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // For protected dashboard routes (/app/*), check for Privy token and onboarding status
  if (pathname.startsWith("/app")) {
    const privyToken = request.cookies.get("privy-token");

    // If no token, redirect to home (Privy handles login via modal)
    if (!privyToken) {
      const url = new URL("/", request.url);
      url.searchParams.set("login", "required");
      return NextResponse.redirect(url);
    }

    // Check if onboarding is complete
    const onboardingComplete = request.cookies.get("onboarding-complete");
    if (!onboardingComplete) {
      // Redirect to onboarding flow
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)"],
};
