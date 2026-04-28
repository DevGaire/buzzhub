import { NextRequest, NextResponse } from "next/server";

const DEBUG_PREFIXES = [
    "/api/debug",
    "/api/debug-login",
    "/api/debug-forgot-password",
    "/api/debug-media",
    "/api/debug-users",
    "/api/test-email",
    "/api/fix-oauth-emails",
    "/debug-forgot",
    "/debug-login",
    "/debug-media",
    "/debug-users",
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (process.env.NODE_ENV === "production") {
        const hit = DEBUG_PREFIXES.find(
            (p) => pathname === p || pathname.startsWith(`${p}/`),
        );
        if (hit) {
            return new NextResponse("Not Found", { status: 404 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/api/debug/:path*",
        "/api/debug-:path*",
        "/api/test-email",
        "/api/fix-oauth-emails",
        "/debug-forgot/:path*",
        "/debug-login/:path*",
        "/debug-media/:path*",
        "/debug-users/:path*",
    ],
};
