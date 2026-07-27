import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { getExecutionHistory } from '@/lib/skill-engine';
import Link from 'next/link';
import { ExecutionApprovalActions } from '@/components/marketplace/ExecutionApprovalActions';
import { ExecutionErrorInspector } from '@/components/marketplace/ExecutionErrorInspector';

export const metadata = {
  title: 'Skill Execution Log | PraxisOne',
};

function statusClass(status: string): string {
  if (status === 'completed') {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  }
  if (status === 'failed' || status === 'cancelled') {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
  if (status === 'pending_approval' || status === 'pending') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  }
  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
}

export default async function ExecutionLogPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  if (!['administrator', 'operations_manager'].includes(user.role)) {
    redirect('/dashboard/marketplace');
  }

  const executions = await getExecutionHistory(user.tenantId, 100);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skill Execution Log</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Audit trail of all automated skill executions in your workspace.
          </p>
        </div>
        <Link
          href="/dashboard/marketplace"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
        >
          &larr; Back to Marketplace
        </Link>
      </div>

      <div className="bg-white dark:bg-[#1a1c23] shadow-sm rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-[#13151a]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Skill</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trigger Event</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tokens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#1a1c23] divide-y divide-gray-200 dark:divide-gray-800">
            {executions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  No skill executions found yet.
                </td>
              </tr>
            ) : (
              executions.map((exec) => (
                <tr key={exec.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{exec.skill.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{exec.skill.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{exec.skill.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                      {exec.triggerEvent}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(exec.status)}`}
                    >
                      {exec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {exec.tokensUsed.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {exec.durationMs ? `${(exec.durationMs / 1000).toFixed(2)}s` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(exec.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(exec.status === 'failed' || exec.status === 'cancelled') && exec.error ? (
                        <ExecutionErrorInspector
                          error={exec.error}
                          skillName={exec.skill.name}
                          executionId={exec.id}
                        />
                      ) : null}
                      <ExecutionApprovalActions executionId={exec.id} status={exec.status} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
