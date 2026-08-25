'use client';

import React, { useEffect, useState } from 'react';
import { FIRM_ONBOARDING_VISIBILITY_EVENT } from '@/lib/firm-onboarding-events';
import Link from 'next/link';
import {
  AtSign,
  HelpCircle,
  Lightbulb,
  Mail,
  MessageCircle,
  Search,
  X,
} from 'lucide-react';

import SimpleInquiryModal from '@/components/landing/SimpleInquiryModal';
import SuggestImprovementModal from '@/components/support/SuggestImprovementModal';
import { useAuth } from '@/contexts/AuthContext';

type Panel = 'menu' | 'contact';

const FAQ_URL = '/#faq';
const SUPPORT_URL = '/#contact';

export default function TenantSupportWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('menu');
  const [contactOpen, setContactOpen] = useState(false);
  const [improvementOpen, setImprovementOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    const onVisibility = (event: Event) => {
      const open = (event as CustomEvent<{ open: boolean }>).detail?.open ?? false;
      setOnboardingOpen(open);
      if (open) {
        setOpen(false);
        setPanel('menu');
      }
    };
    window.addEventListener(FIRM_ONBOARDING_VISIBILITY_EVENT, onVisibility);
    return () => window.removeEventListener(FIRM_ONBOARDING_VISIBILITY_EVENT, onVisibility);
  }, []);

  const inquiryDefaults = {
    name: user?.name || '',
    email: user?.email || '',
    company: user?.tenantSlug
      ? user.tenantSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : '',
  };

  const closeWidget = () => {
    setOpen(false);
    setPanel('menu');
  };

  const openContactModal = () => {
    setContactOpen(true);
    closeWidget();
  };

  const openImprovementModal = () => {
    setImprovementOpen(true);
    closeWidget();
  };

  if (onboardingOpen) return null;

  return (
    <>
      <div className="tenant-support-widget" aria-live="polite">
        {open && (
          <div className="tenant-support-panel card card-glass animate-in">
            {panel === 'menu' ? (
              <ul className="tenant-support-menu">
                <li>
                  <a href={FAQ_URL} target="_blank" rel="noreferrer" onClick={closeWidget}>
                    <Search className="size-4" aria-hidden="true" />
                    Find answers
                  </a>
                </li>
                <li>
                  <button type="button" onClick={() => setPanel('contact')}>
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Contact us
                  </button>
                </li>
                <li>
                  <button type="button" onClick={openImprovementModal}>
                    <Lightbulb className="size-4" aria-hidden="true" />
                    Suggest an improvement
                  </button>
                </li>
                <li>
                  <Link href={SUPPORT_URL} target="_blank" onClick={closeWidget}>
                    <HelpCircle className="size-4" aria-hidden="true" />
                    Support page
                  </Link>
                </li>
              </ul>
            ) : (
              <div className="tenant-support-contact">
                <div className="tenant-support-contact-header">
                  <button
                    type="button"
                    className="tenant-support-tab"
                    onClick={() => window.open(FAQ_URL, '_blank')}
                  >
                    <Search className="size-4" aria-hidden="true" />
                    Find answers
                  </button>
                  <span className="tenant-support-tab active">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    Contact us
                  </span>
                </div>
                <button
                  type="button"
                  className="tenant-support-email-card"
                  onClick={openContactModal}
                >
                  <span className="tenant-support-email-icon" aria-hidden="true">
                    <AtSign className="size-5" />
                  </span>
                  <span>
                    <span className="tenant-support-email-title">Send an email</span>
                    <span className="tenant-support-email-subtitle">
                      Get a response within hours
                    </span>
                  </span>
                  <Mail className="size-4 tenant-support-email-arrow" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className={`tenant-support-trigger ${open ? 'is-open' : ''}`}
          onClick={() => {
            if (open) closeWidget();
            else {
              setOpen(true);
              setPanel('menu');
            }
          }}
          aria-expanded={open}
          aria-label={open ? 'Close support menu' : 'Open support menu'}
        >
          {open ? (
            <>
              <X className="size-4" aria-hidden="true" />
              Close
            </>
          ) : (
            <>
              <HelpCircle className="size-4" aria-hidden="true" />
              Support
            </>
          )}
        </button>
      </div>

      <SimpleInquiryModal
        key={contactOpen ? `contact-${user?.email || 'open'}` : 'contact-closed'}
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        badge="Contact"
        title="Get in touch"
        description="Tell us how we can help your firm."
        submitLabel="Send message"
        successTitle="Message received"
        successMessage="Thanks for contacting PraxisOne. We'll reply within one business day."
        apiPath="/api/contact/general"
        initialValues={inquiryDefaults}
      />

      <SuggestImprovementModal
        key={improvementOpen ? `improvement-${user?.email || 'open'}` : 'improvement-closed'}
        isOpen={improvementOpen}
        onClose={() => setImprovementOpen(false)}
        reporter={inquiryDefaults}
      />

      <style jsx>{`
        .tenant-support-widget {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 900;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        .tenant-support-panel {
          width: min(320px, calc(100vw - 32px));
          padding: 8px;
          border: 1px solid var(--border-primary);
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
        }

        .tenant-support-menu {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .tenant-support-menu li :global(a),
        .tenant-support-menu li button {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 0;
          background: transparent;
          color: var(--text-primary);
          font-size: 0.92rem;
          text-align: left;
          text-decoration: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .tenant-support-menu li :global(a:hover),
        .tenant-support-menu li button:hover {
          background: var(--bg-hover);
        }

        .tenant-support-contact-header {
          display: flex;
          gap: 4px;
          padding: 4px 4px 8px;
          border-bottom: 1px solid var(--border-primary);
          margin-bottom: 8px;
        }

        .tenant-support-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
        }

        .tenant-support-tab.active {
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-weight: 600;
        }

        .tenant-support-email-card {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          background: var(--bg-card);
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .tenant-support-email-card:hover {
          border-color: var(--accent);
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .tenant-support-email-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 999px;
          background: var(--accent-muted);
          color: var(--accent);
          flex-shrink: 0;
        }

        .tenant-support-email-title {
          display: block;
          font-size: 0.92rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .tenant-support-email-subtitle {
          display: block;
          margin-top: 2px;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .tenant-support-email-arrow {
          margin-left: auto;
          color: var(--text-muted);
        }

        .tenant-support-trigger {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          border: 0;
          border-radius: 999px;
          background: #1e293b;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.28);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .tenant-support-trigger:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.32);
        }

        .tenant-support-trigger.is-open {
          background: #334155;
        }

        @media (max-width: 640px) {
          .tenant-support-widget {
            right: 16px;
            bottom: 16px;
          }
        }
      `}</style>
    </>
  );
}
