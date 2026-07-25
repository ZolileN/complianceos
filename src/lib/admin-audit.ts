import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "./prisma";
import { AdminActionType } from "@prisma/client";
import { isPlatformAdmin } from "./platform-admin";

/**
 * Centrally logs high-risk platform administrator actions.
 */
export async function logAdminAction(
  action: AdminActionType,
  targetId: string | null = null,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as {
      id?: string;
      email?: string;
      role?: string;
      tenantSlug?: string;
    } | undefined;

    if (!session || !user?.id || !isPlatformAdmin(user)) {
      console.warn(`Unauthorized admin audit log attempt: ${action} blocked.`);
      return;
    }

    await prisma.adminAuditLog.create({
      data: {
        action,
        adminId: user.id,
        adminEmail: user.email || '',
        targetId,
        details: JSON.stringify(details),
      },
    });
  } catch (error) {
    console.error("Failed to record admin audit action:", error);
  }
}
