import { prisma } from './prisma';
import { logAuditAction } from './auditLogger';

/**
 * Maps terminal workflow steps to their corresponding compliance categories.
 */
const COMPLIANCE_MAPPING: Record<string, { category: string; name: string }> = {
  'Tax Compliance': { category: 'SARS', name: 'Income Tax' },
  'BEE Certification': { category: 'BEE', name: 'Certificate Expiry' },
  'Annual Returns': { category: 'CIPC', name: 'Annual Returns' }
};

/**
 * Intelligently maps a required document string to an uploaded document.
 * Uses exact specific identifiers (e.g. CoR14.1, VAT101) against document name and OCR data.
 */
export function checkDocumentMatch(requiredStr: string, document: { name: string; category: string; ocrMetadata?: string | null }): boolean {
  const req = requiredStr.toLowerCase().replace(/[\s\-_]/g, '');
  const name = (document.name || '').toLowerCase().replace(/[\s\-_]/g, '');
  
  let ocrType = '';
  try {
    if (document.ocrMetadata) {
      const meta = JSON.parse(document.ocrMetadata);
      ocrType = (meta.document_type || '').toLowerCase().replace(/[\s\-_]/g, '');
    }
  } catch {}

  // 1. CoR Document Intelligence (e.g., CoR14.1, CoR14.3, CoR9.1)
  const corMatch = requiredStr.toLowerCase().match(/cor\s*(\d+(\.\d+[a-z]*)?)/i);
  if (corMatch && document.category === 'cor_document') {
    const specificCor = corMatch[0].toLowerCase().replace(/\s/g, ''); // e.g. "cor14.1a"
    return name.includes(specificCor) || ocrType.includes(specificCor);
  }

  // 2. Specific Form Intelligence (VAT101, ITR14, IRP6, EMP101, UI-8, W.As.2, CoR30.1)
  const formMatch = requiredStr.toLowerCase().match(/(vat101|itr14|irp6|emp101|ui-8|ui8|w\.as\.2|was2|cor30\.1)/i);
  if (formMatch) {
    const specificForm = formMatch[1].toLowerCase().replace(/[\s\-_\.]/g, '');
    return name.includes(specificForm) || ocrType.includes(specificForm);
  }

  // 3. Fallback to generic Category matching if no specific form is mentioned
  const mapToCategory = (docStr: string) => {
    const s = docStr.toLowerCase();
    if (s.includes('id') || s.includes('identity')) return 'id_document';
    if (s.includes('tax') || s.includes('assessment')) return 'tax_certificate';
    if (s.includes('bank') || s.includes('turnover')) return 'bank_statement';
    if (s.includes('cor') || s.includes('annual return')) return 'cor_document';
    if (s.includes('vat registration') || s.includes('vat cert')) return 'vat_certificate';
    if (s.includes('bee') || s.includes('scorecard')) return 'bee_certificate';
    if (s.includes('afs') || s.includes('financials') || s.includes('payroll')) return 'financial_statement';
    if (s.includes('mandate') || s.includes('power of attorney')) return 'mandate';
    return 'other';
  };

  const reqCat = mapToCategory(requiredStr);
  if (reqCat === document.category) {
     return true;
  }

  // 4. Exact/Substring Name match fallback
  if (name.includes(req) || req.includes(name)) return true;

  return false;
}

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
          const mapping = COMPLIANCE_MAPPING[progress.clientWorkflow.template.name];
          if (mapping) {
            console.log(`[WorkflowEngine] Auto-updating compliance item: ${mapping.category} - ${mapping.name}`);
            const compItem = await prisma.complianceItem.findFirst({
              where: { tenantId, clientId, category: mapping.category, name: mapping.name }
            });

            if (compItem) {
              await prisma.complianceItem.update({
                where: { id: compItem.id },
                data: { status: 'compliant', notes: `Auto-compliant via ${progress.clientWorkflow.template.name} workflow completion.` }
              });

              await logAuditAction({
                tenantId,
                userId: 'system',
                action: 'UPDATE',
                entityType: 'ComplianceItem',
                entityId: compItem.id,
                details: { action: 'Auto-compliant', source: progress.clientWorkflow.template.name }
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
