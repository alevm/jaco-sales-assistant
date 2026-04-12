import { NextRequest, NextResponse } from "next/server";

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

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
