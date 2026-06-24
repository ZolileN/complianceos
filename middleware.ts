import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
      const userRole = token?.role;
      if (userRole !== 'administrator') {
        if (path.startsWith('/api/')) {
          return new NextResponse(
            JSON.stringify({ error: "Forbidden: Administrator access required" }),
            { status: 403, headers: { 'content-type': 'application/json' } }
          );
        }
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized', req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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
     * - /api/whatsapp/webhook (Public webhook)
     * - _next/static, _next/image, favicon.ico, etc.
     */
    '/((?!$|login|signup|forgot-password|reset-password|onboard|api/auth|api/onboard|api/uploadthing|api/whatsapp/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
