/* ============================================================
   Seed Script — Populates the database with core skills and
   business packs. Run: node scripts/seed-skills.js
   ============================================================ */

/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CORE_SKILLS = [
  {
    slug: 'document-ocr',
    name: 'Document OCR',
    description: 'Extract structured data from uploaded documents — invoices, IDs, tax certificates, and bank statements.',
    category: 'finance',
    icon: '🔍',
    isCore: true,
    isPublished: true,
    triggers: ['document.uploaded', 'invoice.uploaded'],
    requiredPermissions: ['documents.read', 'clients.read'],
    skillDefinition: 'Extract structured data from uploaded documents using OCR and LLM classification.',
    steps: [
      { name: 'Classify Document', stepOrder: 0, stepType: 'llm_call', config: '{"prompt":"Classify document type"}' },
      { name: 'Extract Fields', stepOrder: 1, stepType: 'llm_call', config: '{"prompt":"Extract structured fields"}' },
      { name: 'Store Result', stepOrder: 2, stepType: 'database_query', config: '{"query":"update_document_metadata"}' },
    ],
  },
  {
    slug: 'email-understanding',
    name: 'Email Understanding',
    description: 'Parse incoming emails to extract company name, contact details, opportunity signals, and intent.',
    category: 'crm',
    icon: '📧',
    isCore: true,
    isPublished: true,
    triggers: ['message.received'],
    requiredPermissions: ['crm.read', 'crm.write'],
    skillDefinition: 'Analyze emails to extract entities and classify intent.',
    steps: [
      { name: 'Extract Entities', stepOrder: 0, stepType: 'llm_call', config: '{"prompt":"Extract entities from message"}' },
      { name: 'Classify Intent', stepOrder: 1, stepType: 'llm_call', config: '{"prompt":"Classify message intent"}' },
      { name: 'Lookup Client', stepOrder: 2, stepType: 'database_query', config: '{"query":"client_lookup"}' },
    ],
  },
  {
    slug: 'intent-detection',
    name: 'Intent Detection',
    description: 'Classify WhatsApp and chat messages into actionable intents for automated routing and response.',
    category: 'whatsapp',
    icon: '🎯',
    isCore: true,
    isPublished: true,
    triggers: ['message.received'],
    requiredPermissions: ['whatsapp.read'],
    skillDefinition: 'Detect user intent from WhatsApp messages and route accordingly.',
    steps: [
      { name: 'Detect Intent', stepOrder: 0, stepType: 'llm_call', config: '{"prompt":"Classify WhatsApp message intent"}' },
      { name: 'Check Context', stepOrder: 1, stepType: 'condition', config: '{"condition":"exists:client"}' },
      { name: 'Generate Response', stepOrder: 2, stepType: 'llm_call', config: '{"prompt":"Generate WhatsApp reply"}' },
    ],
  },
  {
    slug: 'sars-deadline-checker',
    name: 'SARS Deadline Checker',
    description: 'Tracks upcoming SARS deadlines and flags items that need attention.',
    category: 'compliance',
    icon: '🗓️',
    isCore: true,
    isPublished: true,
    triggers: ['compliance.deadline_approaching'],
    requiredPermissions: ['compliance.read', 'compliance.write'],
    skillDefinition: 'Checks SARS deadlines and updates compliance item statuses accordingly.',
    steps: [
      { name: 'Check Deadlines', stepOrder: 0, stepType: 'database_query', config: '{"query":"check_sars_deadlines"}' },
      { name: 'Update Statuses', stepOrder: 1, stepType: 'api_call', config: '{"endpoint":"/api/compliance/bulk_update"}' }
    ],
  },
  {
    slug: 'cipc-ar-checker',
    name: 'CIPC Annual Return Checker',
    description: 'Checks CIPC annual return status for clients.',
    category: 'compliance',
    icon: '🏢',
    isCore: true,
    isPublished: true,
    triggers: ['compliance.deadline_approaching'],
    requiredPermissions: ['compliance.read', 'compliance.write'],
    skillDefinition: 'Queries CIPC (or internal DB) to check if annual returns are due.',
    steps: [
      { name: 'Check AR Status', stepOrder: 0, stepType: 'api_call', config: '{"endpoint":"https://api.cipc.co.za/ar_status"}' },
      { name: 'Update Compliance Item', stepOrder: 1, stepType: 'database_query', config: '{"query":"update_cipc_status"}' }
    ],
  },
  {
    slug: 'bee-expiry-monitor',
    name: 'BEE Expiry Monitor',
    description: 'Monitors BEE certificate expiry and alerts 60 days before.',
    category: 'compliance',
    icon: '⏳',
    isCore: true,
    isPublished: true,
    triggers: ['compliance.deadline_approaching'],
    requiredPermissions: ['compliance.read', 'notifications.send'],
    skillDefinition: 'Monitors BEE certificates and sends notifications before expiry.',
    steps: [
      { name: 'Find Expiring BEE Certs', stepOrder: 0, stepType: 'database_query', config: '{"query":"find_expiring_bee"}' },
      { name: 'Send Alert', stepOrder: 1, stepType: 'api_call', config: '{"endpoint":"/api/notifications"}' }
    ],
  },
  {
    slug: 'escalation-skill',
    name: 'Compliance Escalation',
    description: 'Auto-notifies ops manager and client via WhatsApp for critical compliance changes.',
    category: 'compliance',
    icon: '⚠️',
    isCore: true,
    isPublished: true,
    triggers: ['compliance.status_changed'],
    requiredPermissions: ['compliance.read', 'whatsapp.send'],
    skillDefinition: 'Escalates critical compliance issues to managers.',
    steps: [
      { name: 'Check Severity', stepOrder: 0, stepType: 'condition', config: '{"condition":"status == \'critical\'"}' },
      { name: 'Notify Ops Manager', stepOrder: 1, stepType: 'api_call', config: '{"endpoint":"/api/notifications"}' },
      { name: 'WhatsApp Client', stepOrder: 2, stepType: 'llm_call', config: '{"prompt":"Draft urgent compliance alert"}' }
    ],
  },
];

const PACKS = [
  { slug: 'compliance-starter', name: 'Compliance Starter', description: 'Essential skills for SA compliance firms.', industry: 'compliance', icon: '🛡️', price: 0 },
  { slug: 'construction-pack', name: 'Construction Pack', description: 'BOQ analysis, quotation generation, progress reports.', industry: 'construction', icon: '🏗️', price: 49900 },
  { slug: 'medical-pack', name: 'Medical Pack', description: 'Appointment triage, clinical notes, claims prep.', industry: 'medical', icon: '🏥', price: 69900 },
  { slug: 'legal-pack', name: 'Legal Pack', description: 'Contract review, case summaries, legal research.', industry: 'legal', icon: '⚖️', price: 59900 },
  { slug: 'real-estate-pack', name: 'Real Estate Pack', description: 'Lead qualification, property descriptions, tenant screening.', industry: 'real-estate', icon: '🏠', price: 49900 },
];

async function main() {
  console.log('🌱 Seeding core skills and business packs...\n');

  // Create business packs
  for (const pack of PACKS) {
    const existing = await prisma.businessPack.findUnique({ where: { slug: pack.slug } });
    if (existing) {
      console.log(`  ⏭️  Pack "${pack.name}" already exists`);
    } else {
      await prisma.businessPack.create({ data: pack });
      console.log(`  ✅ Created pack: ${pack.icon} ${pack.name}`);
    }
  }

  // Create skills
  const compliancePack = await prisma.businessPack.findUnique({ where: { slug: 'compliance-starter' } });

  for (const skillDef of CORE_SKILLS) {
    const existing = await prisma.skill.findUnique({ where: { slug: skillDef.slug } });
    if (existing) {
      console.log(`  ⏭️  Skill "${skillDef.name}" already exists`);
      continue;
    }

    const { steps, ...skillData } = skillDef;
    const skill = await prisma.skill.create({
      data: {
        ...skillData,
        triggers: JSON.stringify(skillData.triggers),
        requiredPermissions: JSON.stringify(skillData.requiredPermissions),
        packId: compliancePack?.id || null,
        steps: {
          create: steps,
        },
      },
    });
    console.log(`  ✅ Created skill: ${skill.icon} ${skill.name} (${steps.length} steps)`);
  }

  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
