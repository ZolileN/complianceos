'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Loader2, RefreshCw } from 'lucide-react';

import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type CipcRegistryPanelProps = {
  clientId: string;
  registrationNumber?: string | null;
};

type RegistryProfile = {
  enterpriseNumber: string;
  companyName: string;
  registrationDate?: string;
  status?: string;
  financialYearEnd?: string;
  taxNumber?: string;
  source: string;
};

export default function CipcRegistryPanel({
  clientId,
  registrationNumber,
}: CipcRegistryPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [profile, setProfile] = useState<RegistryProfile | null>(null);
  const [annualReturnsDue, setAnnualReturnsDue] = useState<string | null>(null);

  const lookup = async () => {
    if (!registrationNumber?.trim()) {
      toast('Add a CIPC registration number first.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/cipc-registry`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setProfile(json.data.profile);
      setAnnualReturnsDue(json.data.annual_returns_due_date);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Lookup failed', 'error');
      setProfile(null);
      setAnnualReturnsDue(null);
    } finally {
      setLoading(false);
    }
  };

  const applyToCompliance = async () => {
    setApplying(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/cipc-registry`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not update compliance');
      toast('CIPC data applied — annual returns due date updated', 'success');
      if (json.data?.profile) setProfile(json.data.profile);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-teal-700" />
            CIPC registry
          </CardTitle>
          <CardDescription className="mt-1">
            Look up company details from approved COR14.3 OCR data or your configured provider.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || !registrationNumber?.trim()}
          onClick={lookup}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Lookup
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!registrationNumber?.trim() ? (
          <p className="text-[var(--text-muted)]">
            Add a registration number in{' '}
            <Link href={`/dashboard/clients/${clientId}/edit`} className="text-teal-700 hover:underline">
              edit client
            </Link>{' '}
            to enable registry lookup.
          </p>
        ) : profile ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Source: {profile.source}</Badge>
              {profile.status ? <Badge variant="info">{profile.status}</Badge> : null}
            </div>
            <dl className="grid gap-2">
              {[
                ['Company', profile.companyName],
                ['Enterprise no.', profile.enterpriseNumber],
                ['Registered', profile.registrationDate],
                ['Financial year end', profile.financialYearEnd],
                ['Tax number', profile.taxNumber],
                [
                  'Annual returns due',
                  annualReturnsDue
                    ? new Date(annualReturnsDue).toLocaleDateString('en-ZA')
                    : null,
                ],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between gap-4">
                  <dt className="text-[var(--text-secondary)]">{label}</dt>
                  <dd className="text-right font-medium text-[var(--text-primary)]">{val || '—'}</dd>
                </div>
              ))}
            </dl>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={applying}
              onClick={applyToCompliance}
            >
              {applying ? 'Applying…' : 'Apply to compliance calendar'}
            </Button>
          </>
        ) : (
          <p className="text-[var(--text-muted)]">
            Run a lookup to preview registry data and roll annual returns due dates forward.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
