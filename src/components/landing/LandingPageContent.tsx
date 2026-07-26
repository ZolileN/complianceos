'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  formatZarFromCents,
  PLAN_CATALOG,
  TENANT_PLANS,
  type TenantPlan,
} from '@/lib/plans';
import { LANDING_FAQS } from '@/lib/landing-content';

function SectionHeader({
  tag,
  title,
  subtitle,
}: {
  tag: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
        {tag}
      </p>
      <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}

function planCta(plan: TenantPlan): { href: string; label: string; hashModal?: boolean } {
  if (plan === 'starter') {
    return { href: '/signup?plan=starter', label: 'Start 14-day free trial' };
  }
  if (plan === 'enterprise') {
    // Native <a> + hash — Next.js Link does not fire hashchange for hash-only hrefs
    return { href: '#contact-sales', label: 'Contact sales', hashModal: true };
  }
  return { href: `/signup?plan=${plan}`, label: 'Subscribe' };
}

export default function LandingPageContent() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border-primary)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.12),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-[1200px] gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <Badge variant="info" className="mb-4">
              Built for South African professional services
            </Badge>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-[var(--text-primary)] sm:text-5xl">
              Compliance software for South African accounting and advisory firms
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
              PraxisOne unifies CIPC and SARS deadlines, client records, document vaults,
              workflows, and WhatsApp — with POPIA-aware tenant isolation for your firm.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup?plan=starter">
                <Button size="lg" variant="primary">
                  Start 14-day free trial
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#book-demo">
                <Button size="lg" variant="outline">
                  Book a demo
                </Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Starter trial · No credit card · Cancel anytime
            </p>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl shadow-teal-900/10">
              <div className="flex items-center gap-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                  app.praxisone.com
                </span>
              </div>
              <Image
                src="/images/landing/dashboard-tour.jpg"
                alt="PraxisOne operations dashboard"
                width={1024}
                height={516}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] py-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-3 px-6">
          {[
            'Accounting firms',
            'Tax practitioners',
            'Compliance consultants',
            'Corporate secretarial',
            'POPIA-aware workspaces',
          ].map((label) => (
            <Badge key={label} variant="outline" className="px-3 py-1 text-xs">
              {label}
            </Badge>
          ))}
        </div>
      </section>

      {/* Problem / Solution */}
      <section id="solutions" className="mx-auto max-w-[1200px] px-6 py-20">
        <SectionHeader
          tag="The challenge"
          title="Professional services run on too many systems"
          subtitle="WhatsApp, email, spreadsheets, and shared folders don't scale — and they don't protect you at deadline time."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-red-200/60 dark:border-red-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-red-700 dark:text-red-400">
                Without PraxisOne
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[var(--text-secondary)]">
              {[
                'Missed CIPC annual returns and SARS filing deadlines',
                'Documents scattered across WhatsApp and email',
                'No single view of client compliance posture',
                'Manual follow-ups with no audit trail',
              ].map((item) => (
                <p key={item}>• {item}</p>
              ))}
            </CardContent>
          </Card>
          <Card className="border-teal-200/80 shadow-md shadow-teal-900/5 dark:border-teal-900/50">
            <CardHeader>
              <CardTitle className="text-lg text-teal-800 dark:text-teal-300">
                With PraxisOne
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-[var(--text-secondary)]">
              {[
                'Compliance engine tracks CIPC, SARS, VAT, PAYE, and BEE items',
                'WhatsApp inbox linked to client records',
                'Document OCR and secure vault per client',
                'Workflows and tasks with full team visibility',
              ].map((item) => (
                <p key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600" />
                  {item}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-y border-[var(--border-primary)] bg-[var(--bg-secondary)] py-20"
      >
        <div className="mx-auto max-w-[1200px] px-6">
          <SectionHeader
            tag="Platform"
            title="Everything your firm needs to operate"
            subtitle="Purpose-built for compliance-heavy professional services in South Africa."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: 'Compliance engine',
                desc: 'Track statutory items, deadlines, and portfolio health in one view.',
              },
              {
                icon: MessageSquare,
                title: 'WhatsApp inbox',
                desc: 'Client messages and documents linked to the right workspace.',
              },
              {
                icon: FileText,
                title: 'Document intelligence',
                desc: 'OCR extraction, categorisation, and secure storage per client.',
              },
              {
                icon: Workflow,
                title: 'Workflows & tasks',
                desc: 'Standardise registrations, returns, and advisory engagements.',
              },
              {
                icon: UsersRound,
                title: 'Client operations',
                desc: 'Profiles, onboarding portals, and team assignments.',
              },
              {
                icon: Sparkles,
                title: 'AI skills marketplace',
                desc: 'Automate repetitive compliance work on Professional plans.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="h-full">
                <CardHeader className="pb-2">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-[1200px] px-6 py-20">
        <SectionHeader
          tag="How it works"
          title="From client message to filed return"
          subtitle="Three steps to a calmer, more professional operation."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Clients send documents',
              desc: 'Via WhatsApp, your onboarding portal, or direct upload.',
            },
            {
              step: '2',
              title: 'PraxisOne organises',
              desc: 'Files, tasks, and messages attach to the client automatically.',
            },
            {
              step: '3',
              title: 'Your team delivers',
              desc: 'Track deadlines, assign work, and stay audit-ready.',
            },
          ].map((item) => (
            <Card key={item.step}>
              <CardHeader>
                <div className="mb-2 flex size-8 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                  {item.step}
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Dashboard tour */}
      <section
        id="dashboard"
        className="border-y border-[var(--border-primary)] bg-[var(--bg-secondary)] py-20"
      >
        <div className="mx-auto max-w-[1200px] px-6">
          <SectionHeader
            tag="Dashboard tour"
            title="Your entire practice. One dashboard."
            subtitle="Portfolio compliance, critical deadlines, and team workload — the same view your administrators use every day."
          />
          <div className="overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-xl">
            <div className="flex items-center gap-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                app.praxisone.com
              </span>
            </div>
            <Image
              src="/images/landing/dashboard-tour.jpg"
              alt="PraxisOne dashboard showing compliance posture and portfolio metrics"
              width={1024}
              height={516}
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-[1200px] px-6 py-20">
        <SectionHeader
          tag="Plans"
          title="Transparent pricing for every stage"
          subtitle="Start with a 14-day Starter trial. Scale when your firm is ready."
        />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {TENANT_PLANS.map((planId) => {
            const plan = PLAN_CATALOG[planId];
            const cta = planCta(planId);
            const popular = planId === 'growth';
            return (
              <Card
                key={planId}
                className={`flex flex-col ${popular ? 'border-teal-400 shadow-lg shadow-teal-900/10' : ''}`}
              >
                {popular && (
                  <div className="px-6 pt-4">
                    <Badge variant="success">Most popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription className="text-2xl font-semibold text-[var(--text-primary)]">
                    {formatZarFromCents(plan.priceZarCents)}
                    {plan.priceZarCents != null && (
                      <span className="text-sm font-normal text-[var(--text-muted)]">/mo</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="mb-6 flex-1 space-y-2 text-sm text-[var(--text-secondary)]">
                    {plan.marketingBullets.map((b) => (
                      <li key={b} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  {cta.hashModal ? (
                    <a
                      href={cta.href}
                      className="mt-auto"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.hash = cta.href;
                      }}
                    >
                      <Button variant={popular ? 'primary' : 'outline'} className="w-full">
                        {cta.label}
                      </Button>
                    </a>
                  ) : (
                    <Link href={cta.href} className="mt-auto">
                      <Button variant={popular ? 'primary' : 'outline'} className="w-full">
                        {cta.label}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] py-20"
      >
        <div className="mx-auto max-w-[800px] px-6">
          <SectionHeader
            tag="FAQ"
            title="Common questions"
            subtitle="Everything you need to know before starting."
          />
          <div className="space-y-4">
            {LANDING_FAQS.map((item) => (
              <Card key={item.question}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[var(--text-secondary)]">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1200px] px-6 py-20">
        <Card className="overflow-hidden border-teal-200 bg-gradient-to-br from-teal-50 to-white dark:border-teal-900/50 dark:from-teal-950/30 dark:to-[var(--bg-card)]">
          <CardContent className="flex flex-col items-center px-8 py-14 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Stop juggling five different systems
            </h2>
            <p className="mt-3 max-w-lg text-sm text-[var(--text-secondary)]">
              Bring clients, documents, workflows, and WhatsApp into one operating platform
              built for South African firms.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup?plan=starter">
                <Button size="lg" variant="primary">
                  Start 14-day free trial
                </Button>
              </Link>
              <a href="#book-demo">
                <Button size="lg" variant="outline">
                  Book a demo
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
