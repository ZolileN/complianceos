import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAuditAction } from "@/lib/auditLogger";

type AuthToken = {
  id?: string;
  role?: string;
  tenantId?: string | null;
  tenantSlug?: string | null;
  sessionVersion?: number;
  accessRevoked?: boolean;
};

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as import("next-auth/adapters").Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@company.co.za" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        if (!user.isActive) {
          throw new Error("This account has been disabled. Contact your administrator.");
        }

        if (user.tenant && !user.tenant.isActive) {
          throw new Error("This workspace has been suspended. Contact support.");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenant?.slug,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const t = token as AuthToken;

      if (user) {
        const u = user as {
          role?: string;
          tenantId?: string;
          tenantSlug?: string;
          id?: string;
          sessionVersion?: number;
        };
        t.role = u.role;
        t.tenantId = u.tenantId;
        t.tenantSlug = u.tenantSlug;
        t.id = u.id;
        t.sessionVersion = u.sessionVersion ?? 0;
        t.accessRevoked = false;
      }

      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
        if (session.role) t.role = session.role;
        if (session.tenantSlug) t.tenantSlug = session.tenantSlug;
      }

      // Re-validate access on each JWT refresh so suspend/disable takes effect
      if (t.id && !t.accessRevoked) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: t.id },
            select: {
              isActive: true,
              sessionVersion: true,
              role: true,
              tenantId: true,
              tenant: { select: { isActive: true, slug: true } },
            },
          });

          if (
            !dbUser ||
            !dbUser.isActive ||
            (dbUser.tenant && !dbUser.tenant.isActive) ||
            dbUser.sessionVersion !== (t.sessionVersion ?? 0)
          ) {
            t.accessRevoked = true;
            t.role = undefined;
            t.tenantId = undefined;
            t.tenantSlug = undefined;
          } else {
            t.role = dbUser.role;
            t.tenantId = dbUser.tenantId;
            t.tenantSlug = dbUser.tenant?.slug;
            t.sessionVersion = dbUser.sessionVersion;
          }
        } catch (err) {
          console.error('[auth] jwt revalidation failed:', err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      const t = token as AuthToken;
      if (t.accessRevoked) {
        // Force client to treat session as missing
        return { ...session, user: undefined as unknown as typeof session.user };
      }
      if (session.user) {
        (session.user as { role?: string }).role = t.role;
        (session.user as { tenantId?: string | null }).tenantId = t.tenantId;
        (session.user as { tenantSlug?: string | null }).tenantSlug = t.tenantSlug;
        (session.user as { id?: string }).id = t.id;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user }) {
      const customUser = user as { id: string; email: string; tenantId?: string };
      if (customUser && customUser.tenantId) {
        await logAuditAction({
          tenantId: customUser.tenantId,
          userId: customUser.id,
          action: 'LOGIN',
          entityType: 'User',
          entityId: customUser.id,
          details: { email: customUser.email },
        });
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
