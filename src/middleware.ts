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

  const authHeader = request.headers.get("authorization");
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

  // Rate limit LLM endpoints (20 req/min per token)
  if (request.method === "POST" && isLLMEndpoint(request.nextUrl.pathname)) {
    const token = authHeader.replace("Bearer ", "");
    const result = checkRateLimit(token);
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
