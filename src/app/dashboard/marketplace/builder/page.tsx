'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function BuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suggestionId = searchParams.get('suggestion');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('document.uploaded');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [steps, setSteps] = useState<any[]>(
    suggestionId ? [] : [{ name: 'New Step', stepType: 'api_call', config: {} }]
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch suggestion if present
  useEffect(() => {
    if (suggestionId) {
      // In a real app we'd fetch the suggestion by ID from a dedicated API.
      // For MVP, we query the analyze endpoint to fetch pending suggestions and find ours.
      fetch('/api/skills/analyze', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sug = data.data.find((s: any) => s.id === suggestionId);
            if (sug) {
              setName(sug.title);
              setDescription(sug.description);
              setTriggerEvent(sug.triggerEvent);
              setSteps(JSON.parse(sug.suggestedSteps));
            }
          }
        });
    }
  }, [suggestionId]);

  const addStep = () => {
    setSteps([...steps, { name: `Step ${steps.length + 1}`, stepType: 'api_call', config: {} }]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/skills/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          triggerEvent,
          steps,
          requiredPermissions: ['tenant.custom'] // simple default for custom skills
        })
      });

      if (!res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = await res.json() as any;
        throw new Error(d.error || 'Failed to create skill');
      }

      router.push('/dashboard/marketplace');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🔧 Custom Skill Builder</h1>
        <p className="text-gray-500 mt-2">Design a tailored automation for your workspace.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white dark:bg-[#1a1c23] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skill Name</label>
            <input required type="text" className="w-full px-4 py-2 border rounded-md dark:bg-[#13151a] dark:border-gray-700" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auto-Reply to Invoices" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea className="w-full px-4 py-2 border rounded-md dark:bg-[#13151a] dark:border-gray-700" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this skill do?" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trigger Event</label>
            <select className="w-full px-4 py-2 border rounded-md dark:bg-[#13151a] dark:border-gray-700" value={triggerEvent} onChange={e => setTriggerEvent(e.target.value)}>
              <option value="document.uploaded">document.uploaded</option>
              <option value="document.classified">document.classified</option>
              <option value="message.received">message.received</option>
              <option value="workflow.step_advanced">workflow.step_advanced</option>
              <option value="workflow.step_overdue">workflow.step_overdue</option>
              <option value="manual">Manual Trigger</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Execution Flow</h2>
            <button type="button" onClick={addStep} className="btn btn-ghost text-sm border border-gray-300 dark:border-gray-700">+ Add Step</button>
          </div>
          
          {steps.map((step, i) => (
            <div key={i} className="bg-white dark:bg-[#1a1c23] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative">
              <button type="button" onClick={() => removeStep(i)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">✕</button>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Step Name</label>
                      <input type="text" className="w-full px-3 py-1.5 border rounded-md dark:bg-[#13151a] dark:border-gray-700 text-sm" value={step.name} onChange={e => updateStep(i, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Step Type</label>
                      <select className="w-full px-3 py-1.5 border rounded-md dark:bg-[#13151a] dark:border-gray-700 text-sm" value={step.stepType} onChange={e => updateStep(i, 'stepType', e.target.value)}>
                        <option value="api_call">API Call</option>
                        <option value="llm_call">LLM Generation</option>
                        <option value="database_query">Database Query</option>
                        <option value="condition">Condition / Branch</option>
                        <option value="human_approval">Human Approval</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
          <span className="text-red-500 text-sm">{message}</span>
          <div className="flex gap-4">
            <button type="button" onClick={() => router.back()} className="btn btn-ghost border border-gray-300 dark:border-gray-700">Cancel</button>
            <button type="submit" disabled={loading || steps.length === 0} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create & Install Skill'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
