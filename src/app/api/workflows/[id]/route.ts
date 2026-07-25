import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isRbacResponse,
  requireManager,
  requireStaff,
  requireTenantSession,
} from '@/lib/rbac';
import { logAuditAction } from '@/lib/auditLogger';

type StepInput = {
  name: string;
  sla_days?: number;
  requiredDocuments?: string[];
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id } = await params;

  try {
    const template = await prisma.workflowTemplate.findFirst({
      where: { id, tenantId: user.tenantId! },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });

    if (!template) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: template });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireManager(user);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();
  const { name, description, category, isActive, steps } = body as {
    name?: string;
    description?: string | null;
    category?: string;
    isActive?: boolean;
    steps?: StepInput[];
  };

  try {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { id, tenantId: user.tenantId! },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const template = await prisma.$transaction(async (tx) => {
      if (Array.isArray(steps)) {
        await tx.workflowStep.deleteMany({ where: { templateId: id } });
        if (steps.length > 0) {
          await tx.workflowStep.createMany({
            data: steps.map((s, i) => ({
              templateId: id,
              name: s.name,
              stepOrder: i + 1,
              slaDays: s.sla_days || 3,
              requiredDocuments: s.requiredDocuments
                ? JSON.stringify(s.requiredDocuments)
                : '[]',
            })),
          });
        }
      }

      return tx.workflowTemplate.update({
        where: { id },
        data: {
          ...(typeof name === 'string' ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(typeof category === 'string' ? { category } : {}),
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
        },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });
    });

    await logAuditAction({
      tenantId: user.tenantId!,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'WorkflowTemplate',
      entityId: template.id,
      details: { name: template.name, category: template.category },
    });

    return NextResponse.json({ data: template });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireManager(user);
  if (forbidden) return forbidden;

  const { id } = await params;

  try {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { id, tenantId: user.tenantId! },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Soft-deactivate if any client workflows reference it; otherwise hard delete
    const inUse = await prisma.clientWorkflow.count({
      where: { templateId: id },
    });

    if (inUse > 0) {
      const template = await prisma.workflowTemplate.update({
        where: { id },
        data: { isActive: false },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      await logAuditAction({
        tenantId: user.tenantId!,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'WorkflowTemplate',
        entityId: id,
        details: { name: existing.name, deactivated: true, inUse },
      });

      return NextResponse.json({
        data: template,
        message: 'Template deactivated (in use by client workflows)',
      });
    }

    await prisma.workflowTemplate.delete({ where: { id } });

    await logAuditAction({
      tenantId: user.tenantId!,
      userId: user.id,
      action: 'DELETE',
      entityType: 'WorkflowTemplate',
      entityId: id,
      details: { name: existing.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
