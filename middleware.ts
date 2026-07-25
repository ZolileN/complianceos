import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { PLATFORM_ADMIN_SLUGS } from "@/lib/platform-admin";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as
      | { role?: string; tenantSlug?: string; accessRevoked?: boolean }
      | null;
    const path = req.nextUrl.pathname;

    if (token?.accessRevoked) {
      if (path.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Session revoked. Please sign in again.' }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        );
      }
      return NextResponse.redirect(new URL('/login?error=session_revoked', req.url));
    }

    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
      const userRole = token?.role;
      const tenantSlug = token?.tenantSlug;

      if (
        userRole !== 'administrator' ||
        !(PLATFORM_ADMIN_SLUGS as readonly string[]).includes(tenantSlug as string)
      ) {
        if (path.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: 'Forbidden: Platform Administrator access required' }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          );
        }
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => {
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
     * Protect all routes except:
     * - /login
     * - /signup
     * - /forgot-password
     * - /reset-password
     * - /onboard/* (public client self-onboarding pages)
     * - /api/auth/* (NextAuth routes and register)
     * - /api/onboard/* (public onboarding API — no auth required)
     * - /api/uploadthing (UploadThing API callback)
     * - /api/webhooks/twilio (Public Twilio WhatsApp webhook)
     * - /api/whatsapp/webhook (Deprecated Meta stub — keep public so it can return 410)
     * - /api/cron/* (Secured by CRON_SECRET bearer token)
     * - _next/static, _next/image, favicon.ico, etc.
     */
    '/((?!$|login|signup|forgot-password|reset-password|onboard|api/auth|api/onboard|api/uploadthing|api/webhooks|api/whatsapp/webhook|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
