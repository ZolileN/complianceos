/**
 * Edge-safe platform admin constants (no Node/NextAuth imports).
 * Safe to use from middleware.
 */

export const PLATFORM_ADMIN_SLUGS = ['praxisone', 'mlk-computer-consulting'] as const;

export function isPlatformAdminSlug(slug: string | null | undefined): boolean {
  return !!slug && (PLATFORM_ADMIN_SLUGS as readonly string[]).includes(slug);
}

export function isPlatformAdmin(user: {
  role?: string | null;
  tenantSlug?: string | null;
} | null | undefined): boolean {
  return (
    user?.role === 'administrator' && isPlatformAdminSlug(user.tenantSlug)
  );
}
