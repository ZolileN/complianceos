"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface CompliancePostureChartProps {
  compliant: number;
  actionRequired: number;
  critical: number;
}

const COLORS = {
  compliant: "#0f766e",
  actionRequired: "#d97706",
  critical: "#dc2626",
};

export default function CompliancePostureChart({
  compliant,
  actionRequired,
  critical,
}: CompliancePostureChartProps) {
  const data = [
    { name: "Compliant", value: compliant, color: COLORS.compliant },
    { name: "Action required", value: actionRequired, color: COLORS.actionRequired },
    { name: "Critical", value: critical, color: COLORS.critical },
  ].filter((item) => item.value > 0);

  const total = compliant + actionRequired + critical;
  const score = total > 0 ? Math.round((compliant / total) * 100) : 100;

  return (
    <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
      <div className="relative mx-auto h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ name: "No requirements", value: 1, color: "#e2e8f0" }]}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={80}
              paddingAngle={data.length > 1 ? 3 : 0}
              stroke="none"
            >
              {(data.length ? data : [{ color: "#e2e8f0" }]).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [Number(value), "Requirements"]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--border-primary)",
                background: "var(--card)",
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-md)",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{score}%</span>
          <span className="text-xs font-medium text-[var(--text-muted)]">compliant</span>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { label: "Compliant", value: compliant, color: COLORS.compliant },
          { label: "Action required", value: actionRequired, color: COLORS.actionRequired },
          { label: "Critical", value: critical, color: COLORS.critical },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
        <div className="border-t border-[var(--border-subtle)] pt-3 text-xs leading-5 text-[var(--text-muted)]">
          Based on {total} active compliance requirements across your client portfolio.
        </div>
      </div>
    </div>
  );
}
