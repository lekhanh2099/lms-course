import { NextRequest, NextResponse } from "next/server";

// Initialize a Map to track rate limits per IP
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT = 100; // Max requests allowed in the time window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute (in milliseconds)

// List of User-Agent strings commonly associated with bots
const botUserAgents = ["bot", "spider", "crawl", "googlebot", "bingbot"];

// Function to detect bots based on User-Agent
function isBot(userAgent: string): boolean {
 return botUserAgents.some((bot) => userAgent.toLowerCase().includes(bot));
}

// Middleware function
export function middleware(request: NextRequest) {
 // Get the IP address from the 'x-forwarded-for' header
 const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
 // Get the User-Agent from the headers
 const userAgent = request.headers.get("user-agent") || "";

 // Check if the request is from a bot
 if (isBot(userAgent)) {
  return new NextResponse("Bot detected", { status: 403 });
 }

 // Rate-limiting logic
 const now = Date.now();
 const rateLimitData = rateLimitMap.get(ip) || { count: 0, lastRequest: now };

 // Reset the count if the time window has passed
 if (now - rateLimitData.lastRequest > RATE_LIMIT_WINDOW) {
  rateLimitData.count = 1;
  rateLimitData.lastRequest = now;
 } else {
  rateLimitData.count += 1;
 }

 // Update the Map with the new rate limit data
 rateLimitMap.set(ip, rateLimitData);

 // Block if the request exceeds the rate limit
 if (rateLimitData.count > RATE_LIMIT) {
  return new NextResponse("Too many requests", { status: 429 });
 }

 // Allow the request to proceed
 return NextResponse.next();
}

// Configuration to apply the middleware to specific routes
export const config = {
 matcher: ["/api/:path*"], // Applies to all API routes
};
