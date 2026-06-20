import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = session.user as { tenantId: string; role: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Clients cannot view client workflows unless they belong to them (checked below)
  const { id: clientId } = await params;

  // Verify client belongs to this tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId }
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    const workflows = await prisma.clientWorkflow.findMany({
      where: { clientId, tenantId },
      include: {
        template: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' }
            }
          }
        },
        progress: {
          include: {
            step: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    const mapped = workflows.map(w => ({
      id: w.id,
      client_id: w.clientId,
      template_id: w.templateId,
      tenant_id: w.tenantId,
      status: w.status,
      assigned_to: w.assignedTo,
      started_at: w.startedAt ? w.startedAt.toISOString() : null,
      completed_at: w.completedAt ? w.completedAt.toISOString() : null,
      template: w.template ? {
        id: w.template.id,
        name: w.template.name,
        description: w.template.description,
        category: w.template.category,
        is_active: w.template.isActive,
        steps: w.template.steps.map(s => ({
          id: s.id,
          template_id: s.templateId,
          name: s.name,
          description: s.description,
          step_order: s.stepOrder,
          sla_days: s.slaDays
        }))
      } : null,
      progress: w.progress.map(p => ({
        id: p.id,
        client_workflow_id: p.clientWorkflowId,
        step_id: p.stepId,
        status: p.status,
        notes: p.notes,
        completed_by: p.completedById,
        completed_at: p.completedAt ? p.completedAt.toISOString() : null,
        step: p.step ? {
          id: p.step.id,
          name: p.step.name,
          description: p.step.description,
          step_order: p.step.stepOrder,
          sla_days: p.step.slaDays
        } : null
      })).sort((a, b) => (a.step?.step_order || 0) - (b.step?.step_order || 0))
    }));

    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = session.user as { tenantId: string; role: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only staff roles can assign workflows
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: clientId } = await params;

  // Verify client belongs to this tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId }
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { templateId, assignedTo } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const template = await prisma.workflowTemplate.findFirst({
      where: { id: templateId, tenantId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } }
    });

    if (!template) {
      return NextResponse.json({ error: 'Workflow template not found' }, { status: 404 });
    }

    const clientWorkflow = await prisma.clientWorkflow.create({
      data: {
        clientId,
        tenantId,
        templateId,
        status: 'in_progress',
        assignedTo: assignedTo || null,
        startedAt: new Date(),
        progress: {
          create: template.steps.map(step => ({
            stepId: step.id,
            status: 'pending',
            notes: ''
          }))
        }
      },
      include: {
        template: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' }
            }
          }
        },
        progress: {
          include: {
            step: true
          }
        }
      }
    });

    const mapped = {
      id: clientWorkflow.id,
      client_id: clientWorkflow.clientId,
      template_id: clientWorkflow.templateId,
      tenant_id: clientWorkflow.tenantId,
      status: clientWorkflow.status,
      assigned_to: clientWorkflow.assignedTo,
      started_at: clientWorkflow.startedAt ? clientWorkflow.startedAt.toISOString() : null,
      completed_at: clientWorkflow.completedAt ? clientWorkflow.completedAt.toISOString() : null,
      template: clientWorkflow.template ? {
        id: clientWorkflow.template.id,
        name: clientWorkflow.template.name,
        description: clientWorkflow.template.description,
        category: clientWorkflow.template.category,
        is_active: clientWorkflow.template.isActive,
        steps: clientWorkflow.template.steps.map(s => ({
          id: s.id,
          template_id: s.templateId,
          name: s.name,
          description: s.description,
          step_order: s.stepOrder,
          sla_days: s.slaDays
        }))
      } : null,
      progress: clientWorkflow.progress.map(p => ({
        id: p.id,
        client_workflow_id: p.clientWorkflowId,
        step_id: p.stepId,
        status: p.status,
        notes: p.notes,
        completed_by: p.completedById,
        completed_at: p.completedAt ? p.completedAt.toISOString() : null,
        step: p.step ? {
          id: p.step.id,
          name: p.step.name,
          description: p.step.description,
          step_order: p.step.stepOrder,
          sla_days: p.step.slaDays
        } : null
      })).sort((a, b) => (a.step?.step_order || 0) - (b.step?.step_order || 0))
    };

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'ClientWorkflow',
      entityId: clientWorkflow.id,
      details: { templateName: template.name, status: clientWorkflow.status },
    });

    return NextResponse.json({ data: mapped }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;
  const userId = currentUser.id;
  if (!tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only staff roles can update workflow steps/status
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: clientId } = await params;

  // Verify client belongs to this tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId }
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { progressId, status, notes, workflowId, workflowStatus } = body;

    // Option A: Update a single step progress
    if (progressId) {
      if (!status) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
      }

      // Verify the step belongs to a workflow of this client/tenant
      const stepProgress = await prisma.workflowStepProgress.findFirst({
        where: {
          id: progressId,
          clientWorkflow: {
            clientId,
            tenantId
          }
        }
      });

      if (!stepProgress) {
        return NextResponse.json({ error: 'Workflow step not found' }, { status: 404 });
      }

      const updatedProgress = await prisma.workflowStepProgress.update({
        where: { id: progressId },
        data: {
          status,
          notes: notes !== undefined ? notes : undefined,
          completedAt: status === 'completed' || status === 'skipped' ? new Date() : null,
          completedById: status === 'completed' || status === 'skipped' ? userId : null
        },
        include: {
          clientWorkflow: {
            include: {
              progress: true
            }
          }
        }
      });

      // Recalculate workflow status based on all step progress
      const allProgress = updatedProgress.clientWorkflow.progress;
      const allDone = allProgress.every(p => p.status === 'completed' || p.status === 'skipped');

      let newWorkflowStatus = updatedProgress.clientWorkflow.status;
      let completedAt = updatedProgress.clientWorkflow.completedAt;

      if (allDone) {
        newWorkflowStatus = 'completed';
        completedAt = new Date();
        await prisma.clientWorkflow.update({
          where: { id: updatedProgress.clientWorkflowId },
          data: {
            status: newWorkflowStatus,
            completedAt
          }
        });
      } else {
        // If it was completed, move it back to in_progress
        if (updatedProgress.clientWorkflow.status === 'completed') {
          newWorkflowStatus = 'in_progress';
          completedAt = null;
          await prisma.clientWorkflow.update({
            where: { id: updatedProgress.clientWorkflowId },
            data: {
              status: newWorkflowStatus,
              completedAt
            }
          });
        }
      }

      await logAuditAction({
        tenantId,
        userId,
        action: 'UPDATE',
        entityType: 'WorkflowStepProgress',
        entityId: updatedProgress.id,
        details: { status: updatedProgress.status, workflowStatus: newWorkflowStatus },
      });

      return NextResponse.json({
        data: {
          step: {
            id: updatedProgress.id,
            client_workflow_id: updatedProgress.clientWorkflowId,
            step_id: updatedProgress.stepId,
            status: updatedProgress.status,
            notes: updatedProgress.notes,
            completed_by: updatedProgress.completedById,
            completed_at: updatedProgress.completedAt ? updatedProgress.completedAt.toISOString() : null
          },
          workflow: {
            id: updatedProgress.clientWorkflowId,
            status: newWorkflowStatus,
            completed_at: completedAt ? completedAt.toISOString() : null
          }
        }
      });
    }
    // Option B: Update the overall workflow status (e.g. Cancelled)
    if (workflowId && workflowStatus) {
      const clientWorkflow = await prisma.clientWorkflow.findFirst({
        where: { id: workflowId, clientId, tenantId }
      });

      if (!clientWorkflow) {
        return NextResponse.json({ error: 'Client workflow not found' }, { status: 404 });
      }

      const updatedWorkflow = await prisma.clientWorkflow.update({
        where: { id: workflowId },
        data: {
          status: workflowStatus,
          completedAt: workflowStatus === 'completed' || workflowStatus === 'cancelled' ? new Date() : null
        }
      });

      await logAuditAction({
        tenantId,
        userId,
        action: 'UPDATE',
        entityType: 'ClientWorkflow',
        entityId: updatedWorkflow.id,
        details: { status: updatedWorkflow.status },
      });

      return NextResponse.json({
        data: {
          workflow: {
            id: updatedWorkflow.id,
            status: updatedWorkflow.status,
            completed_at: updatedWorkflow.completedAt ? updatedWorkflow.completedAt.toISOString() : null
          }
        }
      });
    }
    return NextResponse.json({ error: 'Missing parameters. Provide progressId or workflowId.' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
