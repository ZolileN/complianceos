'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import CompanyProfileTab from '@/components/settings/CompanyProfileTab';
import WhatsAppTab from '@/components/settings/WhatsAppTab';
import PersonalProfileTab from '@/components/settings/PersonalProfileTab';
import type {
  CompanyData,
  PersonalData,
  CompanyProfileForm,
  PersonalProfileForm,
} from '@/components/settings/types';

function SettingsPageContent() {
  const { user, tenant, updateUser } = useAuth();
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp' | 'personal'>('personal');

  const isAdminOrOps = user?.role === 'administrator' || user?.role === 'operations_manager';

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
        } else {
          setActiveTab('profile');
        }
      }
    }
  }, [user, tabParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
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
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      toast('Verification code sent to your phone!', 'success');
      setConnectStep('otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code';
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
    const link = `${window.location.origin}/onboard/${company.slug}`;
    navigator.clipboard.writeText(link);
    toast('Client onboarding link copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ padding: 80 }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const onboardingUrl = company
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/onboard/${company.slug}`
    : '';

  return (
    <div style={{ maxWidth: 800 }} className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your company profile and external integrations</p>
        </div>
      </div>

      {saving && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(59,130,246,0.05)',
            border: '1px solid rgba(59,130,246,0.15)',
          }}
        >
          <span className="spinner" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Processing settings updates…</span>
        </div>
      )}

      <div className="tabs">
        {isAdminOrOps && (
          <>
            <button
              className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              🏢 Company Profile
            </button>
            <button
              className={`tab ${activeTab === 'whatsapp' ? 'active' : ''}`}
              onClick={() => setActiveTab('whatsapp')}
            >
              💬 WhatsApp Integration
            </button>
          </>
        )}
        <button
          className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          👤 Personal Profile
        </button>
      </div>

      {activeTab === 'profile' && company && isAdminOrOps && (
        <CompanyProfileTab
          company={company}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          saving={saving}
          onSave={handleSaveProfile}
          onCopyOnboardingLink={copyOnboardingLink}
          onboardingUrl={onboardingUrl}
        />
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
