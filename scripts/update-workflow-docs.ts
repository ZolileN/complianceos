import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TEMPLATES = [
  { name: 'Company Registration', category: 'company_registration', description: 'Full CIPC company registration process', steps: [
    { name: 'Document Collection', requiredDocuments: ['Director ID documents', 'Proof of residence (directors)', 'CoR9.1 Name Reservation Application'] },
    { name: 'Name Reservation', requiredDocuments: ['Completed CoR9.1', 'Name reservation fee receipt'] },
    { name: 'Mandate Signature', requiredDocuments: ['Signed mandate/power of attorney from client'] },
    { name: 'Registration Filing', requiredDocuments: ['CoR14.1 (Memorandum of Incorporation)', 'CoR14.1A (Notice of Incorporation)', 'CoR15.1A'] },
    { name: 'Certificate Delivery', requiredDocuments: ['CoR14.3 Registration Certificate from CIPC'] }
  ]},
  { name: 'VAT Registration', category: 'vat_registration', description: 'SARS VAT registration process', steps: [
    { name: 'Collect Documents', requiredDocuments: ['Director ID', '3-month bank statement', 'Proof of business address', 'Turnover evidence'] },
    { name: 'Verify Information', requiredDocuments: ['Completed VAT101 application form'] },
    { name: 'Submit to SARS', requiredDocuments: ['VAT101 submission confirmation / SARS reference number'] },
    { name: 'Follow Up', requiredDocuments: ['SARS correspondence or acknowledgement'] },
    { name: 'Completed', requiredDocuments: ['VAT registration certificate'] }
  ]},
  { name: 'Tax Compliance', category: 'tax_compliance', description: 'Annual tax compliance workflow', steps: [
    { name: 'Gather Financials', requiredDocuments: ['AFS (Annual Financial Statements)', '12-month bank statements'] },
    { name: 'Prepare Return', requiredDocuments: ['Draft ITR14 / IRP6 provisional return'] },
    { name: 'Review', requiredDocuments: ['Signed review confirmation from client'] },
    { name: 'Submit to SARS', requiredDocuments: ['ITR14 / IRP6 submission confirmation'] },
    { name: 'Assessment Received', requiredDocuments: ['ITA34 Notice of Assessment'] }
  ]},
  { name: 'BEE Certification', category: 'bee_certification', description: 'BEE verification and certification', steps: [
    { name: 'Collect Scorecard Data', requiredDocuments: ['Latest AFS', 'Payroll records', 'Training records', 'Procurement spend data'] },
    { name: 'Calculate Scores', requiredDocuments: ['Completed BEE scorecard worksheet'] },
    { name: 'Submit to Agency', requiredDocuments: ['Scorecard submission letter to verification agency'] },
    { name: 'Verification', requiredDocuments: ['Verification agency site visit report'] },
    { name: 'Certificate Issued', requiredDocuments: ['B-BBEE certificate'] }
  ]},
  { name: 'Annual Returns', category: 'annual_returns', description: 'CIPC annual return filing', steps: [
    { name: 'Confirm Details', requiredDocuments: ['CoR14.3 (latest registration cert)', 'Updated director/address details'] },
    { name: 'Prepare Return', requiredDocuments: ['CoR30.1 Annual Return form'] },
    { name: 'Submit to CIPC', requiredDocuments: ['CIPC submission confirmation'] },
    { name: 'Payment', requiredDocuments: ['Annual return fee payment receipt'] },
    { name: 'Confirmation', requiredDocuments: ['CIPC confirmation / updated compliance certificate'] }
  ]},
  { name: 'Payroll Setup', category: 'payroll_setup', description: 'New client payroll setup', steps: [
    { name: 'Employee Details', requiredDocuments: ['Employee ID documents', 'Signed employment contracts', 'Banking details'] },
    { name: 'SARS Registration', requiredDocuments: ['Completed EMP101 form'] },
    { name: 'UIF Registration', requiredDocuments: ['Completed UI-8 form'] },
    { name: 'COIDA Registration', requiredDocuments: ['Completed W.As.2 form'] },
    { name: 'Payroll Configuration', requiredDocuments: ['Signed payroll configuration sign-off from client'] }
  ]},
];

async function main() {
  const tenantSlug = process.argv[2] || 'praxisone';
  
  const tenant = await prisma.tenant.findFirst({
    where: { slug: tenantSlug }
  });

  if (!tenant) {
    console.error(`Tenant ${tenantSlug} not found`);
    return;
  }

  // Delete existing templates so we can freshly insert the exact data the user wants
  await prisma.workflowTemplate.deleteMany({
    where: { tenantId: tenant.id }
  });
  console.log(`Deleted old workflow templates for ${tenant.name}`);

  for (const tpl of DEFAULT_TEMPLATES) {
    const template = await prisma.workflowTemplate.create({
      data: {
        name: tpl.name,
        category: tpl.category,
        description: tpl.description,
        tenantId: tenant.id,
        steps: {
          create: tpl.steps.map((s, i) => ({
            name: s.name,
            stepOrder: i + 1,
            slaDays: 3,
            requiredDocuments: JSON.stringify(s.requiredDocuments)
          }))
        }
      }
    });
    console.log(`Created template: ${template.name}`);
  }

  console.log('Successfully updated workflow templates with exact document strings!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
