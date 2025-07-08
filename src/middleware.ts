import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: ["/", "/api/neo4j/init-schema", "/api/find-mutuals", "/api/user/sync-followers"],
  // Routes that require authentication but should be processed by the middleware
  // Removed from ignoredRoutes so authentication context is available
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
