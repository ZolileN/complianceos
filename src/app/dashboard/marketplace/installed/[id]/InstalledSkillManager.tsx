'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function InstalledSkillManager({ installation, stats }: { installation: any, stats: any }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(installation.isActive);
  const [configStr, setConfigStr] = useState(
    typeof installation.config === 'string' && installation.config.startsWith('{') 
      ? JSON.stringify(JSON.parse(installation.config), null, 2)
      : installation.config
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Validate JSON
      let parsedConfig;
      try {
        parsedConfig = JSON.parse(configStr);
      } catch (e) {
        throw new Error('Invalid JSON configuration');
      }

      const res = await fetch(`/api/skills/install/${installation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive, config: JSON.stringify(parsedConfig) })
      });

      if (!res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await res.json() as any;
        throw new Error(data.error || 'Failed to save');
      }

      setMessage('Saved successfully');
      router.refresh();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Executions</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalExecutions}</div>
        </div>
        <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Success Rate</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalExecutions === 0 ? '—' : `${Math.round(((stats.totalExecutions - stats.failedExecutions) / stats.totalExecutions) * 100)}%`}
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Tokens Consumed</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.tokensUsed.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1c23] rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Configuration</h2>
        </div>
        <div className="p-6 space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Active Status</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">If paused, this skill will not trigger on incoming events.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div>
            <div className="font-medium text-gray-900 dark:text-white mb-2">JSON Configuration Override</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Provide tenant-specific variables or overrides here.</div>
            <textarea
              className="w-full h-48 p-4 font-mono text-sm bg-gray-50 dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:text-gray-300"
              value={configStr}
              onChange={(e) => setConfigStr(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div>
            <div className="font-medium text-gray-900 dark:text-white mb-2">Granted Permissions</div>
            <div className="flex flex-wrap gap-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {installation.permissions.map((p: any) => (
                <span key={p.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  {p.granted ? '✅' : '❌'} {p.permission}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <span className={`text-sm ${message.includes('successfully') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {message}
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
