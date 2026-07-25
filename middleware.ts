import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { PLATFORM_ADMIN_SLUGS } from "@/lib/platform-admin-constants";

function isCronPath(pathname: string): boolean {
  return pathname === "/api/cron" || pathname.startsWith("/api/cron/");
}

export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;

    // Cron routes authenticate via CRON_SECRET in the route handler — never session.
    if (isCronPath(path)) {
      return NextResponse.next();
    }

    const token = req.nextauth.token as
      | { role?: string; tenantSlug?: string; accessRevoked?: boolean }
      | null;

    if (token?.accessRevoked) {
      if (path.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({ error: "Session revoked. Please sign in again." }),
          { status: 401, headers: { "content-type": "application/json" } }
        );
      }
      return NextResponse.redirect(
        new URL("/login?error=session_revoked", req.url)
      );
    }

    if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
      const userRole = token?.role;
      const tenantSlug = token?.tenantSlug;

      if (
        userRole !== "administrator" ||
        !(PLATFORM_ADMIN_SLUGS as readonly string[]).includes(
          tenantSlug as string
        )
      ) {
        if (path.startsWith("/api/")) {
          return new NextResponse(
            JSON.stringify({
              error: "Forbidden: Platform Administrator access required",
            }),
            { status: 403, headers: { "content-type": "application/json" } }
          );
        }
        return NextResponse.redirect(
          new URL("/dashboard?error=unauthorized", req.url)
        );
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Must allow cron before the session check — matcher exclusion is unreliable
        // with nested paths like /api/cron/* under NextAuth withAuth.
        if (isCronPath(req.nextUrl.pathname)) return true;

        if (!token) return false;
        if ((token as { accessRevoked?: boolean }).accessRevoked) return false;
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protect all routes except public auth/onboarding/webhooks/static.
     * /api/cron/* is intentionally INCLUDED so withAuth can allow it explicitly
     * (negative-lookahead exclusions for nested api/cron paths are unreliable).
     * Cron handlers still require Authorization: Bearer $CRON_SECRET.
     */
    "/((?!$|login|signup|forgot-password|reset-password|onboard|api/auth|api/onboard|api/uploadthing|api/webhooks|api/whatsapp/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
