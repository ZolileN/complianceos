import { prisma } from './prisma';
import { logAuditAction } from './auditLogger';
import { resolveObligation } from './compliance-catalog';
import { checkDocumentMatch } from './documentMatch';
import {
  emitComplianceStatusChanged,
  nextDueAfterCompliant,
  notifyComplianceStakeholders,
} from './compliance-monitor';

export { checkDocumentMatch };

/**
 * Maps terminal workflow steps to their corresponding compliance categories.
 */
const COMPLIANCE_MAPPING: Record<string, { category: string; name: string }> = {
  'Tax Compliance': { category: 'SARS', name: 'Income Tax' },
  'BEE Certification': { category: 'BEE', name: 'Certificate Expiry' },
  'Annual Returns': { category: 'CIPC', name: 'Annual Returns' },
};

export async function evaluateWorkflowDocumentTriggers(tenantId: string, clientId: string) {
  try {
    // 1. Fetch all documents for this client
    const clientDocs = await prisma.document.findMany({
      where: { tenantId, clientId }
    });

    if (clientDocs.length === 0) return;

    // 2. Fetch all incomplete workflow step progress items for active workflows
    const pendingSteps = await prisma.workflowStepProgress.findMany({
      where: {
        clientWorkflow: {
          clientId,
          tenantId,
          status: { in: ['pending', 'in_progress'] }
        },
        status: 'pending'
      },
      include: {
        step: true,
        clientWorkflow: {
          include: { template: true }
        }
      }
    });

    for (const progress of pendingSteps) {
      if (!progress.step.autoComplete) continue;

      let requiredDocs: string[] = [];
      try {
        requiredDocs = JSON.parse(progress.step.requiredDocuments || '[]');
      } catch {
        continue;
      }

      if (requiredDocs.length === 0) continue; // Nothing required, so we don't auto-complete on docs.

      // 3. Check if all required docs are present via strict Document Intelligence
      const allPresent = requiredDocs.every(reqStr => {
        return clientDocs.some(doc => checkDocumentMatch(reqStr, {
          name: doc.name,
          category: doc.category,
          ocrMetadata: doc.ocrMetadata
        }));
      });

      if (allPresent) {
        console.log(`[WorkflowEngine] Auto-completing step ${progress.step.name} for workflow ${progress.clientWorkflow.template.name}`);
        
        // Mark step as complete
        await prisma.workflowStepProgress.update({
          where: { id: progress.id },
          data: {
            status: 'completed',
            notes: 'Auto-completed by system: All required documents uploaded.',
            completedAt: new Date()
          }
        });

        await logAuditAction({
          tenantId,
          userId: 'system',
          action: 'UPDATE',
          entityType: 'WorkflowStepProgress',
          entityId: progress.id,
          details: { action: 'Auto-complete', stepName: progress.step.name }
        });

        // 4. Update workflow status to in_progress if not already
        if (progress.clientWorkflow.status === 'not_started') {
          await prisma.clientWorkflow.update({
            where: { id: progress.clientWorkflow.id },
            data: { status: 'in_progress', startedAt: new Date() }
          });
        }

        // 5. Global Compliance Automation (Terminal Steps)
        // We consider a step "terminal" if it's the last step.
        // Actually, we can check if there are any remaining pending steps for this workflow.
        const remainingSteps = await prisma.workflowStepProgress.count({
          where: {
            clientWorkflowId: progress.clientWorkflowId,
            status: { in: ['pending', 'in_progress'] }
          }
        });

        if (remainingSteps === 0) {
          // Complete the entire workflow
          await prisma.clientWorkflow.update({
            where: { id: progress.clientWorkflowId },
            data: { status: 'completed', completedAt: new Date() }
          });

          // Check compliance mapping
          const mappingRaw = COMPLIANCE_MAPPING[progress.clientWorkflow.template.name];
          if (mappingRaw) {
            const mapping = resolveObligation(mappingRaw.category, mappingRaw.name);
            console.log(`[WorkflowEngine] Auto-updating compliance item: ${mapping.category} - ${mapping.name}`);
            const compItem = await prisma.complianceItem.findFirst({
              where: {
                tenantId,
                clientId,
                category: mapping.category,
                name: mapping.name,
              },
            });

            if (compItem) {
              const previousStatus = compItem.status;
              const rolled = nextDueAfterCompliant(
                mapping.category,
                mapping.name,
                compItem.dueDate
              );
              const updated = await prisma.complianceItem.update({
                where: { id: compItem.id },
                data: {
                  status: 'compliant',
                  dueDate: rolled,
                  lastChecked: new Date(),
                  notes: `Auto-compliant via ${progress.clientWorkflow.template.name} workflow completion.`,
                },
              });

              const like = {
                id: updated.id,
                clientId: updated.clientId,
                tenantId: updated.tenantId,
                category: updated.category,
                name: updated.name,
                status: updated.status,
                dueDate: updated.dueDate,
              };

              await emitComplianceStatusChanged(like, previousStatus);
              const client = await prisma.client.findUnique({
                where: { id: clientId },
                select: { companyName: true, assignedConsultantId: true },
              });
              await notifyComplianceStakeholders(
                like,
                {
                  title: `Compliance updated: ${updated.name}`,
                  message: `${client?.companyName || 'Client'} — ${updated.category} / ${updated.name} marked compliant via workflow.`,
                  type: 'success',
                  dedupeKey: 'workflow-compliant',
                },
                client?.assignedConsultantId
              );

              await logAuditAction({
                tenantId,
                userId: 'system',
                action: 'UPDATE',
                entityType: 'ComplianceItem',
                entityId: compItem.id,
                details: { action: 'Auto-compliant', source: progress.clientWorkflow.template.name },
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[WorkflowEngine] Error evaluating triggers:', error);
  }
}
