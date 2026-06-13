'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WORKFLOW_CATEGORIES } from '@/lib/constants';
import type { WorkflowTemplate } from '@/types';

const DEFAULT_TEMPLATES = [
  { name: 'Company Registration', category: 'company_registration', description: 'Full CIPC company registration process', steps: ['Document Collection', 'Name Reservation', 'Mandate Signature', 'Registration Filing', 'Certificate Delivery'] },
  { name: 'VAT Registration', category: 'vat_registration', description: 'SARS VAT registration process', steps: ['Collect Documents', 'Verify Information', 'Submit to SARS', 'Follow Up', 'Completed'] },
  { name: 'Tax Compliance', category: 'tax_compliance', description: 'Annual tax compliance workflow', steps: ['Gather Financials', 'Prepare Return', 'Review', 'Submit to SARS', 'Assessment Received'] },
  { name: 'BEE Certification', category: 'bee_certification', description: 'BEE verification and certification', steps: ['Collect Scorecard Data', 'Calculate Scores', 'Submit to Agency', 'Verification', 'Certificate Issued'] },
  { name: 'Annual Returns', category: 'annual_returns', description: 'CIPC annual return filing', steps: ['Confirm Details', 'Prepare Return', 'Submit to CIPC', 'Payment', 'Confirmation'] },
  { name: 'Payroll Setup', category: 'payroll_setup', description: 'New client payroll setup', steps: ['Employee Details', 'SARS Registration', 'UIF Registration', 'COIDA Registration', 'Payroll Configuration'] },
];

export default function WorkflowsPage() {
  const { tenant } = useAuth();
  const supabase = createClient();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    if (!tenant) return;
    const { data } = await supabase.from('workflow_templates').select('*, steps:workflow_steps(*)').eq('tenant_id', tenant.id).order('created_at');
    setTemplates((data as unknown as WorkflowTemplate[]) || []);
    setLoading(false);
  }, [tenant]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const seedTemplates = async () => {
    if (!tenant) return;
    for (const tpl of DEFAULT_TEMPLATES) {
      const { data: created } = await supabase.from('workflow_templates').insert({ name: tpl.name, category: tpl.category, description: tpl.description, tenant_id: tenant.id }).select().single();
      if (created) {
        const stepsData = tpl.steps.map((s, i) => ({ template_id: created.id, name: s, step_order: i + 1, sla_days: 3 }));
        await supabase.from('workflow_steps').insert(stepsData);
      }
    }
    loadTemplates();
  };

  const getCategoryInfo = (cat: string) => WORKFLOW_CATEGORIES.find((c) => c.value === cat) || WORKFLOW_CATEGORIES[6];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Workflows</h1>
          <p className="page-subtitle">Standardized processes for your practice</p>
        </div>
        {templates.length === 0 && !loading && (
          <button className="btn btn-primary" onClick={seedTemplates}>🚀 Load Default Templates</button>
        )}
      </div>

      {loading ? (
        <div className="content-grid grid-3">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 200 }} />)}</div>
      ) : templates.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⑂</div>
            <h3>No workflow templates</h3>
            <p>Load the default SA compliance templates or create your own</p>
          </div>
        </div>
      ) : (
        <div className="content-grid grid-3">
          {templates.map((tpl, i) => {
            const cat = getCategoryInfo(tpl.category);
            const steps = tpl.steps || [];
            return (
              <div key={tpl.id} className={`card card-hover animate-in animate-delay-${(i % 4) + 1}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>{cat.icon}</div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{tpl.name}</h3>
                    <span className="badge badge-gray" style={{ marginTop: 4 }}>{cat.label}</span>
                  </div>
                </div>
                {tpl.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>{tpl.description}</p>}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>{steps.length} STEPS</div>
                  {steps.sort((a, b) => a.step_order - b.step_order).map((s, si) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.8rem' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{si + 1}</div>
                      <span>{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
