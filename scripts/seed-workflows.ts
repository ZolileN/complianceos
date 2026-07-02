/* ============================================================
   Seed Script — Populates the database with 6 standard 
   document-aware workflows for a target tenant.
   Run: npx tsx scripts/seed-workflows.ts <tenant_slug>
   ============================================================ */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORKFLOWS = [
  {
    name: 'Company Registration',
    category: 'onboarding',
    description: 'End-to-end new company registration with CIPC.',
    steps: [
      { name: 'Document Collection', requiredDocuments: ['id_document', 'proof_of_residence'], autoComplete: true },
      { name: 'Name Reservation', requiredDocuments: ['cor9_1', 'name_reservation_receipt'], autoComplete: true },
      { name: 'Mandate Signature', requiredDocuments: ['mandate'], autoComplete: true },
      { name: 'Registration Filing', requiredDocuments: ['cor14_1', 'cor14_1a', 'cor15_1a'], autoComplete: true },
      { name: 'Certificate Delivery', requiredDocuments: ['cor14_3'], autoComplete: true },
    ]
  },
  {
    name: 'VAT Registration',
    category: 'sars',
    description: 'SARS VAT registration for a business.',
    steps: [
      { name: 'Collect Documents', requiredDocuments: ['id_document', 'bank_statement', 'proof_of_business_address', 'turnover_evidence'], autoComplete: true },
      { name: 'Verify Information', requiredDocuments: ['vat101'], autoComplete: true },
      { name: 'Submit to SARS', requiredDocuments: ['vat101_submission'], autoComplete: true },
      { name: 'Follow Up', requiredDocuments: ['sars_correspondence'], autoComplete: true },
      { name: 'Completed', requiredDocuments: ['vat_certificate'], autoComplete: true },
    ]
  },
  {
    name: 'Tax Compliance',
    category: 'sars',
    description: 'Provisional or annual income tax return filing.',
    steps: [
      { name: 'Gather Financials', requiredDocuments: ['afs', '12_month_bank_statements'], autoComplete: true },
      { name: 'Prepare Return', requiredDocuments: ['draft_tax_return'], autoComplete: true },
      { name: 'Review', requiredDocuments: ['tax_review_confirmation'], autoComplete: true },
      { name: 'Submit to SARS', requiredDocuments: ['tax_submission_confirmation'], autoComplete: true },
      { name: 'Assessment Received', requiredDocuments: ['ita34'], autoComplete: true },
    ]
  },
  {
    name: 'BEE Certification',
    category: 'bee',
    description: 'B-BBEE verification and certificate issuance.',
    steps: [
      { name: 'Collect Scorecard Data', requiredDocuments: ['afs', 'payroll_records', 'training_records', 'procurement_data'], autoComplete: true },
      { name: 'Calculate Scores', requiredDocuments: ['bee_scorecard'], autoComplete: true },
      { name: 'Submit to Agency', requiredDocuments: ['bee_submission_letter'], autoComplete: true },
      { name: 'Verification', requiredDocuments: ['bee_verification_report'], autoComplete: true },
      { name: 'Certificate Issued', requiredDocuments: ['bee_certificate'], autoComplete: true },
    ]
  },
  {
    name: 'Annual Returns',
    category: 'cipc',
    description: 'CIPC annual return compliance and payment.',
    steps: [
      { name: 'Confirm Details', requiredDocuments: ['cor14_3', 'director_address_details'], autoComplete: true },
      { name: 'Prepare Return', requiredDocuments: ['cor30_1'], autoComplete: true },
      { name: 'Submit to CIPC', requiredDocuments: ['cipc_submission'], autoComplete: true },
      { name: 'Payment', requiredDocuments: ['annual_return_receipt'], autoComplete: true },
      { name: 'Confirmation', requiredDocuments: ['cipc_confirmation'], autoComplete: true },
    ]
  },
  {
    name: 'Payroll Setup',
    category: 'labour',
    description: 'New employer payroll, PAYE, UIF, and COIDA setup.',
    steps: [
      { name: 'Employee Details', requiredDocuments: ['employee_ids', 'employment_contracts', 'banking_details'], autoComplete: true },
      { name: 'SARS Registration', requiredDocuments: ['emp101'], autoComplete: true },
      { name: 'UIF Registration', requiredDocuments: ['ui8'], autoComplete: true },
      { name: 'COIDA Registration', requiredDocuments: ['was2'], autoComplete: true },
      { name: 'Payroll Configuration', requiredDocuments: ['payroll_signoff'], autoComplete: true },
    ]
  }
];

async function main() {
  const tenantSlug = process.argv[2];
  if (!tenantSlug) {
    console.error('❌ Please provide a tenant slug. Example: npx tsx scripts/seed-workflows.ts praxisone');
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    console.error(`❌ Tenant '${tenantSlug}' not found.`);
    process.exit(1);
  }

  console.log(`🌱 Seeding standard workflows for tenant: ${tenant.name}...\n`);

  for (const workflow of WORKFLOWS) {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { tenantId: tenant.id, name: workflow.name }
    });

    if (existing) {
      console.log(`  ⏭️  Workflow "${workflow.name}" already exists`);
      // Update steps if needed
      for (let i = 0; i < workflow.steps.length; i++) {
        const stepDef = workflow.steps[i];
        const stepExists = await prisma.workflowStep.findFirst({
          where: { templateId: existing.id, name: stepDef.name }
        });
        
        if (stepExists) {
          await prisma.workflowStep.update({
            where: { id: stepExists.id },
            data: {
              requiredDocuments: JSON.stringify(stepDef.requiredDocuments),
              autoComplete: stepDef.autoComplete,
              stepOrder: i + 1,
            }
          });
        } else {
          await prisma.workflowStep.create({
            data: {
              templateId: existing.id,
              name: stepDef.name,
              stepOrder: i + 1,
              requiredDocuments: JSON.stringify(stepDef.requiredDocuments),
              autoComplete: stepDef.autoComplete,
            }
          });
        }
      }
      console.log(`  ✅ Updated steps for: ${workflow.name}`);
      continue;
    }

    const { steps, ...workflowData } = workflow;
    const template = await prisma.workflowTemplate.create({
      data: {
        ...workflowData,
        tenantId: tenant.id,
        steps: {
          create: steps.map((s, idx) => ({
            name: s.name,
            stepOrder: idx + 1,
            requiredDocuments: JSON.stringify(s.requiredDocuments),
            autoComplete: s.autoComplete,
          }))
        }
      },
    });
    console.log(`  ✅ Created workflow: ${template.name} (${steps.length} steps)`);
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
