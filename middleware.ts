export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    /*
     * Protect all routes except:
     * - /login
     * - /signup
     * - /api/auth/* (NextAuth routes and register)
     * - /api/whatsapp/webhook (Public webhook)
     * - _next/static, _next/image, favicon.ico, etc.
     */
    '/((?!login|signup|api/auth|api/whatsapp/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
