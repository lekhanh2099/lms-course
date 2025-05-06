import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { setUserCountryHeader } from "./lib/userCountryHeader";

// Custom bot detection
const botUserAgents = ["bot", "spider", "crawl", "googlebot", "bingbot"];
function isBot(userAgent: string): boolean {
 return botUserAgents.some((bot) => userAgent.toLowerCase().includes(bot));
}

// Custom rate limiting
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

function checkRateLimit(ip: string): boolean {
 const now = Date.now();
 const rateLimitData = rateLimitMap.get(ip) || { count: 0, lastRequest: now };
 if (now - rateLimitData.lastRequest > RATE_LIMIT_WINDOW) {
  rateLimitData.count = 1;
  rateLimitData.lastRequest = now;
 } else {
  rateLimitData.count += 1;
 }
 rateLimitMap.set(ip, rateLimitData);
 return rateLimitData.count <= RATE_LIMIT;
}

// Route matchers
const isPublicRoute = createRouteMatcher([
 "/",
 "/sign-in(.*)",
 "/sign-up(.*)",
 "/api(.*)",
 "/courses/:courseId/lessons/:lessonId",
 "/products(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// Main middleware
export default clerkMiddleware(async (auth, req) => {
 const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
 const userAgent = req.headers.get("user-agent") || "";

 // Check for bots
 if (isBot(userAgent)) {
  return new NextResponse("Bot detected", { status: 403 });
 }

 // Check rate limit
 if (!checkRateLimit(ip)) {
  return new NextResponse("Too many requests", { status: 429 });
 }

 // Admin route protection
 if (isAdminRoute(req)) {
  const user = await auth.protect();
  if (user.sessionClaims.role !== "admin") {
   return new NextResponse(null, { status: 404 });
  }
 }

 // Non-public route protection
 if (!isPublicRoute(req)) {
  await auth.protect();
 }
 let country = "unknown";
 const headers = new Headers(req.headers);

 // If IP is available, use a GeoIP service to detect the country

 if (ip !== "unknown") {
  try {
   const response = await fetch(`http://ip-api.com/json/${ip}`);
   const data = await response.json();
   if (data.status === "success") {
    country = data.countryCode; // e.g., 'US', 'VN', etc.
   }
  } catch (error) {
   console.error("GeoIP lookup failed:", error);
  }
 }
 setUserCountryHeader(headers, country);

 return NextResponse.next({ request: { headers } });
});

// Config
export const config = {
 matcher: [
  "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  "/(api|trpc)(.*)",
 ],
};
