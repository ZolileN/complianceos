"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleGauge,
  FileText,
  Plus,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import CompliancePostureChart from "@/components/dashboard/CompliancePostureChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ComplianceStats {
  compliant: number;
  action_required: number;
  critical: number;
}

interface PortfolioStats {
  clients_compliant: number;
  clients_need_action: number;
  clients_critical: number;
  critical_deadlines_this_week: number;
}

interface Stats {
  clients: number;
  tasks: number;
  documents: number;
  overdue: number;
  compliance?: ComplianceStats;
  portfolio?: PortfolioStats;
}

interface RecentClient {
  id: string;
  company_name: string;
  status: string;
  created_at: string;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface ComplianceIssue {
  id: string;
  client_id: string;
  company_name: string;
  category: string;
  name: string;
  status: string;
  due_date: string | null;
}

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info" | "outline";

function statusVariant(status: string): BadgeVariant {
  const variants: Record<string, BadgeVariant> = {
    active: "success",
    completed: "success",
    compliant: "success",
    inactive: "outline",
    onboarding: "info",
    new: "info",
    processing: "info",
    submitted: "info",
    waiting_on_client: "warning",
    action_required: "warning",
    overdue: "destructive",
    critical: "destructive",
  };

  return variants[status] || "default";
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState<Stats>({
    clients: 0,
    tasks: 0,
    documents: 0,
    overdue: 0,
  });
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;

    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setStats(data.stats);
          if (data.recentClients) setRecentClients(data.recentClients);
          if (data.recentTasks) setRecentTasks(data.recentTasks);
          if (data.complianceIssues) setComplianceIssues(data.complianceIssues);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tenant]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="spinner size-9" />
      </div>
    );
  }

  if (user?.role === "client") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <BriefcaseBusiness className="size-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-950">Welcome to PraxisOne</h2>
            <p className="text-sm leading-6 text-slate-500">
              We are preparing your company dashboard. Contact your consultant if your
              company details do not appear shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const compliance = stats.compliance || {
    compliant: 0,
    action_required: 0,
    critical: 0,
  };

  const metrics = [
    {
      label: "Total clients",
      value: stats.clients,
      detail: "Active portfolio",
      icon: UsersRound,
      href: "/dashboard/clients",
      iconClass: "bg-teal-50 text-teal-700",
    },
    {
      label: "Active tasks",
      value: stats.tasks,
      detail: "Across all consultants",
      icon: CircleGauge,
      href: "/dashboard/tasks",
      iconClass: "bg-blue-50 text-blue-700",
    },
    {
      label: "Documents",
      value: stats.documents,
      detail: "Stored securely",
      icon: FileText,
      href: "/dashboard/documents",
      iconClass: "bg-violet-50 text-violet-700",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      detail: stats.overdue > 0 ? "Requires attention" : "Nothing overdue",
      icon: CalendarClock,
      href: "/dashboard/tasks",
      iconClass: stats.overdue > 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <section className="flex w-full flex-col items-start justify-between gap-4 text-left sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <span className="size-1.5 rounded-full bg-teal-600" />
            Operations overview
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Good morning, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Here&apos;s the current state of your client operations and compliance workload.
          </p>
        </div>
        <Button asChild variant="primary" className="shrink-0">
          <Link href="/dashboard/clients/new">
            <Plus />
            New client
          </Link>
        </Button>
      </section>

      {stats.portfolio && (
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Clients compliant',
              value: stats.portfolio.clients_compliant,
              hint: 'All active obligations clear',
            },
            {
              label: 'Clients need action',
              value: stats.portfolio.clients_need_action,
              hint: 'Open action-required items',
            },
            {
              label: 'Critical deadlines this week',
              value: stats.portfolio.critical_deadlines_this_week,
              hint: 'Overdue or due within 7 days',
            },
          ].map((row) => (
            <Card key={row.label}>
              <CardContent className="p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {row.label}
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {row.value}
                </div>
                <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{row.hint}</div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className="group">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-slate-300 group-hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-5 flex items-start justify-between">
                    <div className={`flex size-10 items-center justify-center rounded-lg ${metric.iconClass}`}>
                      <Icon className="size-[18px]" />
                    </div>
                    <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </div>
                  <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                    {metric.value}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-700">{metric.label}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{metric.detail}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Compliance attention</CardTitle>
              <CardDescription className="mt-1">
                Requirements that need action across your client portfolio.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/compliance">
                View all
                <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="mt-2">
            {complianceIssues.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
                <CheckCircle2 className="mb-3 size-7 text-teal-700" />
                <div className="text-sm font-semibold text-slate-900">Portfolio is clear</div>
                <p className="mt-1 text-sm text-slate-500">
                  No critical compliance issues need attention right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {complianceIssues.slice(0, 6).map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/dashboard/clients/${issue.client_id}?tab=compliance&item=${issue.id}`}
                    className="group flex items-center justify-between gap-4 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                          issue.status === "critical"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {issue.status === "critical" ? (
                          <ShieldAlert className="size-4" />
                        ) : (
                          <AlertTriangle className="size-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {issue.company_name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {issue.category} · {issue.name}
                          {issue.due_date
                            ? ` · Due ${new Date(issue.due_date).toLocaleDateString("en-ZA", {
                                day: "numeric",
                                month: "short",
                              })}`
                            : ""}
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusVariant(issue.status)} className="shrink-0 capitalize">
                      {formatStatus(issue.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance posture</CardTitle>
            <CardDescription>
              Overall health of active requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4">
            <CompliancePostureChart
              compliant={compliance.compliant}
              actionRequired={compliance.action_required}
              critical={compliance.critical}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent clients</CardTitle>
              <CardDescription className="mt-1">Newest additions to your workspace.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/clients">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="mt-2">
            {recentClients.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No clients yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentClients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/dashboard/clients/${client.id}`}
                    className="flex items-center justify-between gap-4 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                        {client.company_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {client.company_name}
                        </div>
                        <div className="text-xs text-slate-400">
                          Added {new Date(client.created_at).toLocaleDateString("en-ZA")}
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusVariant(client.status)} className="capitalize">
                      {formatStatus(client.status)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Active work</CardTitle>
              <CardDescription className="mt-1">Tasks currently moving through the firm.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/tasks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="mt-2">
            {recentTasks.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No active tasks yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{task.title}</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {task.due_date
                          ? `Due ${new Date(task.due_date).toLocaleDateString("en-ZA", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}`
                          : "No due date"}
                        {" · "}
                        {task.priority} priority
                      </div>
                    </div>
                    <Badge variant={statusVariant(task.status)} className="shrink-0 capitalize">
                      {formatStatus(task.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
