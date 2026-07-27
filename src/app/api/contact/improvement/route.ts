import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import {
  improvementCategoryLabel,
  improvementUrgencyLabel,
  IMPROVEMENT_CATEGORIES,
  IMPROVEMENT_URGENCIES,
} from '@/lib/improvement-categories';
import { sendImprovementEmail } from '@/lib/contact-inquiry';

function parseImprovementBody(body: unknown) {
  const data = body as Record<string, unknown>;
  const category = String(data.category || '').trim();
  const urgency = String(data.urgency || '').trim();
  const title = String(data.title || '').trim();
  const description = String(data.description || '').trim();

  if (!category || !urgency || !title || !description) {
    return { error: 'Please fill in all required fields' as const };
  }

  const validCategory = IMPROVEMENT_CATEGORIES.some((item) => item.value === category);
  const validUrgency = IMPROVEMENT_URGENCIES.some((item) => item.value === urgency);

  if (!validCategory) {
    return { error: 'Please select a valid product category' as const };
  }
  if (!validUrgency) {
    return { error: 'Please select a valid urgency' as const };
  }

  if (title.length > 120) {
    return { error: 'Title must be 120 characters or fewer' as const };
  }

  return {
    category,
    urgency,
    title,
    description,
    categoryLabel: improvementCategoryLabel(category),
    urgencyLabel: improvementUrgencyLabel(urgency),
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as
      | {
          name?: string | null;
          email?: string | null;
          tenantSlug?: string | null;
        }
      | undefined;

    if (!user?.email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const parsed = parseImprovementBody(await request.json());
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const company = user.tenantSlug
      ? user.tenantSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Tenant workspace';

    const result = await sendImprovementEmail({
      name: user.name || user.email,
      email: user.email,
      company,
      tenantSlug: user.tenantSlug || undefined,
      category: parsed.category,
      categoryLabel: parsed.categoryLabel,
      urgency: parsed.urgency,
      urgencyLabel: parsed.urgencyLabel,
      title: parsed.title,
      description: parsed.description,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Unable to send your request right now. Please try again shortly.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message.includes('not configured') ? 503 : 500;

    return NextResponse.json(
      {
        error:
          status === 503
            ? 'Feature requests are temporarily unavailable. Please try again later.'
            : 'Something went wrong. Please try again.',
      },
      { status }
    );
  }
}
