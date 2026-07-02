import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import InstalledSkillManager from './InstalledSkillManager';

export const metadata = {
  title: 'Manage Skill | PraxisOne',
};

export default async function ManageSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  if (!['administrator', 'operations_manager'].includes(user.role)) {
    redirect('/dashboard/marketplace');
  }

  const skillId = id;

  const installation = await prisma.skillInstallation.findUnique({
    where: { tenantId_skillId: { tenantId: user.tenantId, skillId } },
    include: {
      skill: {
        include: { steps: true }
      },
      permissions: true
    }
  });

  if (!installation) {
    redirect('/dashboard/marketplace');
  }

  // Get execution stats
  const stats = await prisma.skillExecution.aggregate({
    where: { tenantId: user.tenantId, skillId },
    _count: { id: true },
    _sum: { tokensUsed: true }
  });

  const failedCount = await prisma.skillExecution.count({
    where: { tenantId: user.tenantId, skillId, status: 'failed' }
  });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-3xl">{installation.skill.icon}</span>
            Manage {installation.skill.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure this skill for your workspace.
          </p>
        </div>
        <Link 
          href="/dashboard/marketplace"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
        >
          &larr; Back to Marketplace
        </Link>
      </div>

      <InstalledSkillManager 
        installation={installation} 
        stats={{
          totalExecutions: stats._count.id,
          failedExecutions: failedCount,
          tokensUsed: stats._sum.tokensUsed || 0
        }}
      />
    </div>
  );
}
