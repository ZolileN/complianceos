import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { data, error } = await supabase.from('workflow_templates').select('*, steps:workflow_steps(*)').eq('tenant_id', profile.tenant_id).order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { name, description, category, steps } = await request.json();

  const { data: template, error } = await supabase.from('workflow_templates').insert({ name, description, category, tenant_id: profile.tenant_id }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (steps && Array.isArray(steps)) {
    const stepsData = steps.map((s: { name: string; sla_days?: number }, i: number) => ({
      template_id: template.id, name: s.name, step_order: i + 1, sla_days: s.sla_days || 3,
    }));
    await supabase.from('workflow_steps').insert(stepsData);
  }

  return NextResponse.json({ data: template }, { status: 201 });
}
