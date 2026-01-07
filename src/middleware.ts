import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: ["/", "/pricing", "/platform(.*)", "/use-cases(.*)", "/resources(.*)", "/demo", "/about", "/careers", "/privacy", "/terms", "/contact", "/api/neo4j/init-schema", "/api/find-mutuals", "/api/user/sync-followers", "/sign-in(.*)", "/sign-up(.*)"],
  // Routes that require authentication but should be processed by the middleware
  // Removed from ignoredRoutes so authentication context is available
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
