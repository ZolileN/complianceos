'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, CreditCard, MessageSquare, Settings2, UserRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import CompanyProfileTab from '@/components/settings/CompanyProfileTab';
import WhatsAppTab from '@/components/settings/WhatsAppTab';
import PersonalProfileTab from '@/components/settings/PersonalProfileTab';
import BillingPlanTab from '@/components/settings/BillingPlanTab';
import { Card, CardContent } from '@/components/ui/card';
import { getOnboardingUrl } from '@/lib/appUrl';
import { openFirmOnboardingWizard } from '@/components/help/FirmOnboardingWizard';
import type {
  CompanyData,
  PersonalData,
  CompanyProfileForm,
  PersonalProfileForm,
} from '@/components/settings/types';

function SettingsPageContent() {
  const { user, tenant, updateUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const billingParam = searchParams.get('billing');

  const [activeTab, setActiveTab] = useState<
    'profile' | 'whatsapp' | 'personal' | 'billing'
  >('personal');

  const isAdminOrOps = user?.role === 'administrator' || user?.role === 'operations_manager';
  const isAdmin = user?.role === 'administrator';

  // Checkout return URLs now land on /dashboard/billing; keep legacy settings links working
  useEffect(() => {
    if (billingParam) {
      if (user?.role === 'administrator') {
        router.replace(`/dashboard/billing?billing=${billingParam}`);
      } else {
        router.replace('/dashboard');
      }
    }
  }, [billingParam, router, user?.role]);

  useEffect(() => {
    if (user) {
      if (user.role !== 'administrator' && user.role !== 'operations_manager') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab('personal');
      } else {
        if (tabParam === 'personal') {
          setActiveTab('personal');
        } else if (tabParam === 'whatsapp') {
          setActiveTab('whatsapp');
        } else if (tabParam === 'billing' && user.role === 'administrator') {
          setActiveTab('billing');
        } else if (tabParam === 'billing') {
          setActiveTab('profile');
        } else {
          setActiveTab('profile');
        }
      }
    }
  }, [user, tabParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [inboundEmailDomain, setInboundEmailDomain] = useState<string | null>(null);
  const [personal, setPersonal] = useState<PersonalData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [connectPhone, setConnectPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [connectStep, setConnectStep] = useState<'phone' | 'otp'>('phone');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileForm, setProfileForm] = useState<CompanyProfileForm>({
    name: '',
    slug: '',
    email: '',
    contactNumber: '',
    address: '',
    website: '',
  });

  const [personalForm, setPersonalForm] = useState<PersonalProfileForm>({
    name: '',
    email: '',
    contactNumber: '',
    image: '',
  });

  useEffect(() => {
    if (!tenant) return;
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const [compRes, persRes] = await Promise.all([
          fetch('/api/settings/company'),
          fetch('/api/settings/profile'),
        ]);

        if (compRes.ok && persRes.ok) {
          const compDataObj = await compRes.json();
          const persDataObj = await persRes.json();

          if (isMounted) {
            const compData = compDataObj.data;
            const persData = persDataObj.data;

            setCompany(compData);
            setInboundEmailDomain(compDataObj.inboundEmailDomain || null);
            setProfileForm({
              name: compData.name || '',
              slug: compData.slug || '',
              email: compData.email || '',
              contactNumber: compData.contactNumber || '',
              address: compData.address || '',
              website: compData.website || '',
            });

            setPersonal(persData);
            setPersonalForm({
              name: persData.name || '',
              email: persData.email || '',
              contactNumber: persData.contactNumber || '',
              image: persData.image || '',
            });
          }
        } else {
          toast('Failed to load settings', 'error');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        toast('Failed to load settings', 'error');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, [tenant, toast, refreshKey]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectPhone.trim()) {
      toast('Please enter your WhatsApp number', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: connectPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect WhatsApp');

      // Testing path: TWILIO_SKIP_OTP marks the tenant connected immediately
      if (data.connected || data.skippedOtp) {
        toast(data.message || 'WhatsApp connected!', 'success');
        setConnectStep('phone');
        setConnectPhone('');
        setOtpCode('');
        setRefreshKey((prev) => prev + 1);
        return;
      }

      toast('Verification code sent to your phone!', 'success');
      setConnectStep('otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect WhatsApp';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      toast('Please enter the verification code', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      toast('WhatsApp number verified and connected!', 'success');
      setConnectStep('phone');
      setConnectPhone('');
      setOtpCode('');
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast('Company Name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          slug: profileForm.slug,
          email: profileForm.email,
          contactNumber: profileForm.contactNumber,
          address: profileForm.address,
          website: profileForm.website,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      toast('Company profile updated successfully!', 'success');
      setCompany(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalForm.name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    if (!personalForm.email.trim()) {
      toast('Email is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalForm.name,
          email: personalForm.email,
          contactNumber: personalForm.contactNumber,
          image: personalForm.image,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update personal profile');

      toast('Personal profile updated successfully!', 'success');
      setPersonal(data.data);
      if (updateUser) {
        await updateUser({
          name: data.data.name,
          email: data.data.email,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update personal profile';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast('Current password is required', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalForm.name,
          email: personalForm.email,
          contactNumber: personalForm.contactNumber,
          image: personalForm.image,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      toast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect WhatsApp? You will no longer be able to message clients directly.'
      )
    )
      return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/whatsapp/status', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast('WhatsApp successfully disconnected');
      setRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const copyOnboardingLink = () => {
    if (!company) return;
    const link = getOnboardingUrl(company.slug);
    navigator.clipboard.writeText(link);
    toast('Client onboarding link copied to clipboard!', 'success');
  };

  const copyText = (value: string, successMessage: string) => {
    navigator.clipboard.writeText(value);
    toast(successMessage, 'success');
  };

  const replayFirmOnboarding = async () => {
    try {
      const res = await fetch('/api/settings/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (!res.ok) throw new Error('Could not reset setup wizard');
      openFirmOnboardingWizard(1);
      toast('Setup wizard opened', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Could not reset wizard', 'error');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[800px] space-y-4">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  const onboardingUrl = company ? getOnboardingUrl(company.slug) : '';

  const settingsTabs = [
    ...(isAdminOrOps
      ? [
          { id: 'profile' as const, label: 'Company profile', icon: <Building2 className="size-3.5" /> },
          { id: 'whatsapp' as const, label: 'WhatsApp', icon: <MessageSquare className="size-3.5" /> },
        ]
      : []),
    ...(isAdmin
      ? [
          { id: 'billing' as const, label: 'Plan & billing', icon: <CreditCard className="size-3.5" /> },
        ]
      : []),
    { id: 'personal' as const, label: 'Personal profile', icon: <UserRound className="size-3.5" /> },
  ];

  return (
    <div className="mx-auto max-w-[800px] space-y-6">
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Settings2 className="size-3.5" />
          Workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">Settings</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Manage your company profile and external integrations
        </p>
      </section>

      {saving && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex items-center gap-3 py-3 text-sm text-slate-600">
            <span className="spinner" />
            Processing settings updates…
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-1 border-b border-[var(--border-primary)] pb-1">
        {settingsTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-teal-50 text-teal-800'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && company && isAdminOrOps && (
        <>
          <CompanyProfileTab
            company={company}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            saving={saving}
            onSave={handleSaveProfile}
            onCopyOnboardingLink={copyOnboardingLink}
            onboardingUrl={onboardingUrl}
            inboundEmailDomain={inboundEmailDomain}
            onCopy={copyText}
          />
          <div className="card mt-4 p-4 text-sm text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">Firm setup wizard</p>
            <p className="mt-1">
              Replay the guided tour for new workspaces — configure profile, team, clients, and inbox.
            </p>
            <button
              type="button"
              className="btn btn-outline btn-sm mt-3"
              onClick={replayFirmOnboarding}
            >
              Show setup wizard again
            </button>
          </div>
        </>
      )}

      {activeTab === 'whatsapp' && company && isAdminOrOps && (
        <WhatsAppTab
          company={company}
          saving={saving}
          connectPhone={connectPhone}
          setConnectPhone={setConnectPhone}
          otpCode={otpCode}
          setOtpCode={setOtpCode}
          connectStep={connectStep}
          setConnectStep={setConnectStep}
          onSendOtp={handleSendOtp}
          onVerifyOtp={handleVerifyOtp}
          onDisconnect={handleDisconnect}
        />
      )}

      {activeTab === 'billing' && isAdmin && (
        <BillingPlanTab onToast={toast} />
      )}

      {activeTab === 'personal' && personal && (
        <PersonalProfileTab
          personal={personal}
          personalForm={personalForm}
          setPersonalForm={setPersonalForm}
          saving={saving}
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          onSavePersonal={handleSavePersonal}
          onChangePassword={handleChangePassword}
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
