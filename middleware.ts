export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login
     * - /signup
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
