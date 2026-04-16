import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, isLLMEndpoint } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  // Only protect API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Health endpoint is public (for load balancer / monitoring)
  if (request.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  // Authentication: Authelia forward_auth (Remote-User header) or Bearer token
  const remoteUser = request.headers.get("remote-user");
  const authHeader = request.headers.get("authorization");
  let rateLimitKey: string;

  if (remoteUser) {
    // Authenticated via Authelia — Caddy injects Remote-User after forward_auth
    rateLimitKey = `authelia:${remoteUser}`;
  } else {
    // Fallback: programmatic access via Bearer token
    const expectedToken = process.env.API_SECRET;

    if (!expectedToken) {
      return NextResponse.json(
        { error: "Server misconfigured: API_SECRET not set" },
        { status: 500 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    rateLimitKey = authHeader.replace("Bearer ", "");
  }

  // Rate limit LLM endpoints (20 req/min per key)
  if (request.method === "POST" && isLLMEndpoint(request.nextUrl.pathname)) {
    const result = checkRateLimit(rateLimitKey);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.retryAfterMs || 60000) / 1000)),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
