'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WORKFLOW_CATEGORIES } from '@/lib/constants';
import type { WorkflowTemplate } from '@/types';

const DEFAULT_TEMPLATES = [
  { name: 'Company Registration', category: 'company_registration', description: 'Full CIPC company registration process', steps: [{ name: 'Document Collection' }, { name: 'Name Reservation' }, { name: 'Mandate Signature' }, { name: 'Registration Filing' }, { name: 'Certificate Delivery' }] },
  { name: 'VAT Registration', category: 'vat_registration', description: 'SARS VAT registration process', steps: [{ name: 'Collect Documents' }, { name: 'Verify Information' }, { name: 'Submit to SARS' }, { name: 'Follow Up' }, { name: 'Completed' }] },
  { name: 'Tax Compliance', category: 'tax_compliance', description: 'Annual tax compliance workflow', steps: [{ name: 'Gather Financials' }, { name: 'Prepare Return' }, { name: 'Review' }, { name: 'Submit to SARS' }, { name: 'Assessment Received' }] },
  { name: 'BEE Certification', category: 'bee_certification', description: 'BEE verification and certification', steps: [{ name: 'Collect Scorecard Data' }, { name: 'Calculate Scores' }, { name: 'Submit to Agency' }, { name: 'Verification' }, { name: 'Certificate Issued' }] },
  { name: 'Annual Returns', category: 'annual_returns', description: 'CIPC annual return filing', steps: [{ name: 'Confirm Details' }, { name: 'Prepare Return' }, { name: 'Submit to CIPC' }, { name: 'Payment' }, { name: 'Confirmation' }] },
  { name: 'Payroll Setup', category: 'payroll_setup', description: 'New client payroll setup', steps: [{ name: 'Employee Details' }, { name: 'SARS Registration' }, { name: 'UIF Registration' }, { name: 'COIDA Registration' }, { name: 'Payroll Configuration' }] },
];

export default function WorkflowsPage() {
  const { tenant } = useAuth();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    if (!tenant) return;
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const { data } = await res.json();
        setTemplates(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenant]);

  useEffect(() => {
    const init = async () => {
      await loadTemplates();
    };
    init();
  }, [loadTemplates]);

  const seedTemplates = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      for (const tpl of DEFAULT_TEMPLATES) {
        await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tpl)
        });
      }
      loadTemplates();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
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
                  {steps.map((s, si) => (
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
