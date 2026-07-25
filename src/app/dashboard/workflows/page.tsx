'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Rocket, X } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { WORKFLOW_CATEGORIES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkflowTemplate } from '@/types';

const DEFAULT_TEMPLATES = [
  {
    name: 'Company Registration',
    category: 'company_registration',
    description: 'Full CIPC company registration process',
    steps: [
      {
        name: 'Document Collection',
        requiredDocuments: [
          'Director ID documents',
          'Proof of residence (directors)',
          'CoR9.1 Name Reservation Application',
        ],
      },
      {
        name: 'Name Reservation',
        requiredDocuments: ['Completed CoR9.1', 'Name reservation fee receipt'],
      },
      {
        name: 'Mandate Signature',
        requiredDocuments: ['Signed mandate/power of attorney from client'],
      },
      {
        name: 'Registration Filing',
        requiredDocuments: [
          'CoR14.1 (Memorandum of Incorporation)',
          'CoR14.1A (Notice of Incorporation)',
          'CoR15.1A',
        ],
      },
      {
        name: 'Certificate Delivery',
        requiredDocuments: ['CoR14.3 Registration Certificate from CIPC'],
      },
    ],
  },
  {
    name: 'VAT Registration',
    category: 'vat_registration',
    description: 'SARS VAT registration process',
    steps: [
      {
        name: 'Collect Documents',
        requiredDocuments: [
          'Director ID',
          '3-month bank statement',
          'Proof of business address',
          'Turnover evidence',
        ],
      },
      { name: 'Verify Information', requiredDocuments: ['Completed VAT101 application form'] },
      {
        name: 'Submit to SARS',
        requiredDocuments: ['VAT101 submission confirmation / SARS reference number'],
      },
      { name: 'Follow Up', requiredDocuments: ['SARS correspondence or acknowledgement'] },
      { name: 'Completed', requiredDocuments: ['VAT registration certificate'] },
    ],
  },
  {
    name: 'Tax Compliance',
    category: 'tax_compliance',
    description: 'Annual tax compliance workflow',
    steps: [
      {
        name: 'Gather Financials',
        requiredDocuments: ['AFS (Annual Financial Statements)', '12-month bank statements'],
      },
      { name: 'Prepare Return', requiredDocuments: ['Draft ITR14 / IRP6 provisional return'] },
      { name: 'Review', requiredDocuments: ['Signed review confirmation from client'] },
      { name: 'Submit to SARS', requiredDocuments: ['ITR14 / IRP6 submission confirmation'] },
      { name: 'Assessment Received', requiredDocuments: ['ITA34 Notice of Assessment'] },
    ],
  },
  {
    name: 'BEE Certification',
    category: 'bee_certification',
    description: 'BEE verification and certification',
    steps: [
      {
        name: 'Collect Scorecard Data',
        requiredDocuments: [
          'Latest AFS',
          'Payroll records',
          'Training records',
          'Procurement spend data',
        ],
      },
      { name: 'Calculate Scores', requiredDocuments: ['Completed BEE scorecard worksheet'] },
      {
        name: 'Submit to Agency',
        requiredDocuments: ['Scorecard submission letter to verification agency'],
      },
      { name: 'Verification', requiredDocuments: ['Verification agency site visit report'] },
      { name: 'Certificate Issued', requiredDocuments: ['B-BBEE certificate'] },
    ],
  },
  {
    name: 'Annual Returns',
    category: 'annual_returns',
    description: 'CIPC annual return filing',
    steps: [
      {
        name: 'Confirm Details',
        requiredDocuments: ['CoR14.3 (latest registration cert)', 'Updated director/address details'],
      },
      { name: 'Prepare Return', requiredDocuments: ['CoR30.1 Annual Return form'] },
      { name: 'Submit to CIPC', requiredDocuments: ['CIPC submission confirmation'] },
      { name: 'Payment', requiredDocuments: ['Annual return fee payment receipt'] },
      {
        name: 'Confirmation',
        requiredDocuments: ['CIPC confirmation / updated compliance certificate'],
      },
    ],
  },
  {
    name: 'Payroll Setup',
    category: 'payroll_setup',
    description: 'New client payroll setup',
    steps: [
      {
        name: 'Employee Details',
        requiredDocuments: [
          'Employee ID documents',
          'Signed employment contracts',
          'Banking details',
        ],
      },
      { name: 'SARS Registration', requiredDocuments: ['Completed EMP101 form'] },
      { name: 'UIF Registration', requiredDocuments: ['Completed UI-8 form'] },
      { name: 'COIDA Registration', requiredDocuments: ['Completed W.As.2 form'] },
      {
        name: 'Payroll Configuration',
        requiredDocuments: ['Signed payroll configuration sign-off from client'],
      },
    ],
  },
];

export default function WorkflowsPage() {
  const { user, tenant } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState<WorkflowTemplate | null>(null);

  useEffect(() => {
    if (user && user.role !== 'administrator' && user.role !== 'operations_manager') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/workflows');
        const { data } = await res.json();
        if (!cancelled) setTemplates(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant, refreshKey]);

  const seedTemplates = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      for (const tpl of DEFAULT_TEMPLATES) {
        await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tpl),
        });
      }
      toast('Default workflow templates loaded successfully');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast((err as Error).message || 'Failed to load templates', 'error');
      setLoading(false);
    }
  };

  const getCategoryInfo = (cat: string) =>
    WORKFLOW_CATEGORIES.find((c) => c.value === cat) || WORKFLOW_CATEGORIES[6];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <GitBranch className="size-3.5" />
            Processes
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Workflows
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Standardized processes for your practice
          </p>
        </div>
        {templates.length === 0 && !loading && (
          <Button variant="primary" onClick={seedTemplates}>
            <Rocket />
            Load default templates
          </Button>
        )}
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[200px] rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <GitBranch className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">No workflow templates</h2>
            <p className="max-w-sm text-sm text-slate-500">
              Load the default SA compliance templates or create your own.
            </p>
            <Button variant="primary" className="mt-2" onClick={seedTemplates}>
              <Rocket />
              Load default templates
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const cat = getCategoryInfo(tpl.category);
            const steps = tpl.steps || [];
            return (
              <Card
                key={tpl.id}
                className="cursor-pointer transition-colors hover:border-teal-600/30"
                onClick={() => setActiveTemplate(tpl)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-11 items-center justify-center rounded-lg text-lg"
                      style={{ background: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{tpl.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {cat.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {tpl.description && (
                    <p className="mb-4 text-sm text-[var(--text-secondary)]">{tpl.description}</p>
                  )}
                  <div className="border-t border-[var(--border-subtle)] pt-3">
                    <div className="mb-2 text-[0.7rem] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                      {steps.length} steps
                    </div>
                    {steps.map((s, si) => (
                      <div
                        key={s.id || si}
                        className="flex items-center gap-2 py-1 text-xs text-[var(--text-primary)]"
                      >
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[0.65rem] font-semibold text-[var(--text-muted)]">
                          {si + 1}
                        </div>
                        <span>{s.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTemplate && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveTemplate(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="z-[101] w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{activeTemplate.name}</CardTitle>
                    <Badge variant="outline">
                      {getCategoryInfo(activeTemplate.category).label}
                    </Badge>
                  </div>
                  {activeTemplate.description && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {activeTemplate.description}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveTemplate(null)}
                  aria-label="Close"
                >
                  <X />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeTemplate.steps?.map((step, index) => {
                let docs: string[] = [];
                try {
                  // @ts-expect-error - Fallback to prisma casing if frontend type lacks it
                  const reqDocsStr = step.required_documents || step.requiredDocuments || '[]';
                  docs = JSON.parse(reqDocsStr);
                } catch {
                  docs = [];
                }

                return (
                  <div
                    key={step.id || index}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{step.name}</div>
                        {step.description && (
                          <div className="text-xs text-[var(--text-secondary)]">
                            {step.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {docs.length > 0 && (
                      <div className="mt-3 ml-10">
                        <div className="mb-1.5 text-[0.7rem] font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                          Required documents
                        </div>
                        <ul className="space-y-1.5">
                          {docs.map((d) => (
                            <li
                              key={d}
                              className="flex items-center gap-2 text-xs text-[var(--text-primary)]"
                            >
                              <span className="text-teal-700">•</span>
                              {d
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
