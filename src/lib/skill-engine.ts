/* ============================================================
   PraxisOne — Skill Runtime Engine
   
   The execution core of the Skills.sh layer. Resolves skills,
   validates permissions, executes steps, and logs everything.
   ============================================================ */

import { prisma } from '@/lib/prisma';
import { pushTenantLog } from '@/lib/redis';
import { completePrompt, parseLLMJson } from '@/lib/llm';

// ── Types ──────────────────────────────────────────────────

export interface SkillExecutionContext {
  tenantId: string;
  userId: string;
  userRole: string;
  triggerEvent: string;
  input: Record<string, unknown>;
}

export interface SkillExecutionResult {
  executionId: string;
  status: 'completed' | 'failed';
  output: Record<string, unknown> | null;
  error: string | null;
  stepsCompleted: number;
  totalSteps: number;
  tokensUsed: number;
  durationMs: number;
}

export interface StepConfig {
  prompt?: string;
  endpoint?: string;
  query?: string;
  condition?: string;
  approverRole?: string;
  [key: string]: unknown;
}

// ── Permission Validation ──────────────────────────────────

/**
 * Checks whether a user's role is authorized to execute a skill
 * based on the installation's granted permissions.
 */
export async function validateSkillPermissions(
  tenantId: string,
  skillId: string,
  userRole: string
): Promise<{ allowed: boolean; missingPermissions: string[] }> {
  const installation = await prisma.skillInstallation.findUnique({
    where: { tenantId_skillId: { tenantId, skillId } },
    include: { permissions: true },
  });

  if (!installation) {
    return { allowed: false, missingPermissions: ['skill_not_installed'] };
  }

  if (!installation.isActive) {
    return { allowed: false, missingPermissions: ['skill_disabled'] };
  }

  const missingPermissions: string[] = [];

  for (const perm of installation.permissions) {
    if (!perm.granted) continue;
    const allowedRoles: string[] = JSON.parse(perm.allowedRoles);
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      missingPermissions.push(perm.permission);
    }
  }

  return {
    allowed: missingPermissions.length === 0,
    missingPermissions,
  };
}

// ── Step Executors ─────────────────────────────────────────

/**
 * Executes a single step based on its type.
 * Each step type has its own executor function.
 */
async function executeStep(
  stepType: string,
  config: StepConfig,
  context: SkillExecutionContext,
  previousOutput: Record<string, unknown>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  switch (stepType) {
    case 'llm_call':
      return executeLLMStep(config, context, previousOutput);
    case 'api_call':
      return executeAPIStep(config, previousOutput);
    case 'database_query':
      return executeDatabaseStep(config, context, previousOutput);
    case 'condition':
      return executeConditionStep(config, previousOutput);
    case 'human_approval':
      return executeHumanApprovalStep(config);
    default:
      return { output: { warning: `Unknown step type: ${stepType}` }, tokensUsed: 0 };
  }
}

/**
 * LLM Call Step — sends a prompt to the configured OpenAI-compatible provider.
 * Set OPENAI_API_KEY for real calls, or SKILL_LLM_SIMULATE=true for local stubs.
 */
async function executeLLMStep(
  config: StepConfig,
  context: SkillExecutionContext,
  previousOutput: Record<string, unknown>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  const prompt = config.prompt || '';

  const interpolated = prompt
    .replace(/\{\{input\.([\w.]+)\}\}/g, (_, key: string) => {
      return String(context.input[key] ?? '');
    })
    .replace(/\{\{previous\.([\w.]+)\}\}/g, (_, key: string) => {
      return String(previousOutput[key] ?? '');
    });

  const completion = await completePrompt(interpolated);
  const parsed = parseLLMJson(completion.text);

  return {
    output: {
      ...parsed,
      result: parsed.result ?? completion.text,
      prompt_length: interpolated.length,
      model: completion.model,
      simulated: completion.simulated,
    },
    tokensUsed: completion.tokensUsed,
  };
}

/**
 * API Call Step — makes an HTTP request to an external API
 */
async function executeAPIStep(
  config: StepConfig,
  previousOutput: Record<string, unknown>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  const endpoint = config.endpoint || '';

  if (!endpoint) {
    throw new Error('api_call step has no endpoint configured');
  }

  const method = String(config.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof config.headers === 'object' && config.headers
      ? (config.headers as Record<string, string>)
      : {}),
  };

  const init: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(config.body ?? previousOutput);
  }

  const response = await fetch(endpoint, init);
  const contentType = response.headers.get('content-type') || '';
  let body: unknown;
  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => null);
  } else {
    body = await response.text().catch(() => '');
  }

  if (!response.ok) {
    throw new Error(
      `api_call failed (${response.status}) for ${endpoint}: ${
        typeof body === 'string' ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200)
      }`
    );
  }

  return {
    output: {
      result: body,
      status: response.status,
      endpoint,
    },
    tokensUsed: 0,
  };
}

/**
 * Database Query Step — queries PraxisOne's own database
 */
async function executeDatabaseStep(
  config: StepConfig,
  context: SkillExecutionContext,
  previousOutput: Record<string, unknown>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  const query = config.query || '';

  if (query === 'client_lookup') {
    const email = context.input['email'] ?? previousOutput['email'];
    const phone = context.input['phone'] ?? previousOutput['phone'];
    const client = await prisma.client.findFirst({
      where: {
        tenantId: context.tenantId,
        OR: [
          ...(email ? [{ email: String(email) }] : []),
          ...(phone ? [{ phone: String(phone) }, { whatsappNumber: String(phone) }] : []),
        ],
      },
    });
    return { output: { client: client || null, found: !!client }, tokensUsed: 0 };
  }

  // Thin DB-only handlers for compliance monitoring skills (no fake HTTP endpoints)
  if (query === 'log_compliance_event' || query === 'find_expiring_bee') {
    return {
      output: {
        acknowledged: true,
        query,
        triggerEvent: context.triggerEvent,
        input: context.input,
        previous: previousOutput,
        note: 'Compliance monitoring is handled by /api/cron/compliance-deadlines; skill step is a no-op ack.',
      },
      tokensUsed: 0,
    };
  }

  if (query === 'update_document_metadata') {
    const documentId = String(
      context.input['documentId'] ?? previousOutput['documentId'] ?? ''
    );
    if (!documentId) {
      throw new Error('update_document_metadata requires documentId in input');
    }

    const metadata: Record<string, unknown> = { ...previousOutput };
    if (metadata.document_type === undefined && metadata.result !== undefined) {
      metadata.document_type = metadata.result;
    }
    delete metadata.simulated;
    delete metadata.model;
    delete metadata.prompt_length;

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrMetadata: JSON.stringify(metadata),
        ocrStatus: 'completed',
      },
    });

    return {
      output: { documentId: document.id, updated: true, metadata },
      tokensUsed: 0,
    };
  }

  if (query === 'document_search') {
    const clientId = String(context.input['clientId'] ?? previousOutput['clientId'] ?? '');
    const documents = await prisma.document.findMany({
      where: {
        tenantId: context.tenantId,
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        name: true,
        category: true,
        ocrStatus: true,
        createdAt: true,
      },
    });
    return { output: { documents, count: documents.length }, tokensUsed: 0 };
  }

  throw new Error(
    `Unsupported database_query "${query}". Supported: client_lookup, update_document_metadata, document_search, log_compliance_event, find_expiring_bee`
  );
}

/**
 * Condition Step — evaluates a boolean expression to control flow
 */
async function executeConditionStep(
  config: StepConfig,
  previousOutput: Record<string, unknown>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  const condition = config.condition || 'true';
  
  // Simple condition evaluation (safe — no eval)
  let result = false;
  if (condition === 'true') result = true;
  else if (condition === 'false') result = false;
  else if (condition.startsWith('exists:')) {
    const key = condition.replace('exists:', '');
    result = previousOutput[key] !== undefined && previousOutput[key] !== null;
  }

  return {
    output: { conditionMet: result, condition },
    tokensUsed: 0,
  };
}

/**
 * Human Approval Step — pauses execution for manual review
 */
async function executeHumanApprovalStep(
  config: StepConfig
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  return {
    output: {
      status: 'pending_approval',
      approverRole: config.approverRole || 'administrator',
      message: 'This step requires manual approval to proceed.',
    },
    tokensUsed: 0,
  };
}

// ── Main Execution Engine ──────────────────────────────────

/**
 * Execute a skill by slug or ID within a tenant context.
 * This is the primary entry point for skill execution.
 */
export async function executeSkill(
  skillSlug: string,
  context: SkillExecutionContext
): Promise<SkillExecutionResult> {
  const startTime = Date.now();

  // 1. Resolve the skill
  const skill = await prisma.skill.findUnique({
    where: { slug: skillSlug },
    include: {
      steps: { orderBy: { stepOrder: 'asc' } },
    },
  });

  if (!skill) {
    throw new Error(`Skill not found: ${skillSlug}`);
  }

  // 2. Validate permissions
  const permCheck = await validateSkillPermissions(
    context.tenantId,
    skill.id,
    context.userRole
  );

  if (!permCheck.allowed) {
    throw new Error(
      `Permission denied for skill "${skill.name}". Missing: ${permCheck.missingPermissions.join(', ')}`
    );
  }

  // 3. Create execution record
  const execution = await prisma.skillExecution.create({
    data: {
      tenantId: context.tenantId,
      skillId: skill.id,
      triggeredBy: context.userId,
      triggerEvent: context.triggerEvent,
      status: 'running',
      input: JSON.stringify(context.input),
      totalSteps: skill.steps.length,
      startedAt: new Date(),
    },
  });

  // 4. Log to tenant telemetry
  await pushTenantLog(
    context.tenantId,
    `Skill execution started: ${skill.name}`,
    'skill',
    { executionId: execution.id, skillSlug, trigger: context.triggerEvent }
  );

  // 5. Execute steps sequentially
  let currentOutput: Record<string, unknown> = { ...context.input };
  let totalTokens = 0;
  let stepsCompleted = 0;

  try {
    for (const step of skill.steps) {
      const stepConfig: StepConfig = JSON.parse(step.config);
      const result = await executeStep(step.stepType, stepConfig, context, currentOutput);
      
      currentOutput = { ...currentOutput, ...result.output };
      totalTokens += result.tokensUsed;
      stepsCompleted++;

      // Update progress
      await prisma.skillExecution.update({
        where: { id: execution.id },
        data: { stepsCompleted },
      });

      // Check for human approval pause
      if (step.stepType === 'human_approval') {
        const durationMs = Date.now() - startTime;
        await prisma.skillExecution.update({
          where: { id: execution.id },
          data: {
            status: 'pending',
            output: JSON.stringify(currentOutput),
            tokensUsed: totalTokens,
            durationMs,
          },
        });

        return {
          executionId: execution.id,
          status: 'completed',
          output: currentOutput,
          error: null,
          stepsCompleted,
          totalSteps: skill.steps.length,
          tokensUsed: totalTokens,
          durationMs,
        };
      }
    }

    // 6. Mark as completed
    const durationMs = Date.now() - startTime;
    await prisma.skillExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        output: JSON.stringify(currentOutput),
        tokensUsed: totalTokens,
        durationMs,
        completedAt: new Date(),
      },
    });

    await pushTenantLog(
      context.tenantId,
      `Skill completed: ${skill.name} (${durationMs}ms, ${totalTokens} tokens)`,
      'skill',
      { executionId: execution.id, stepsCompleted, totalTokens }
    );

    return {
      executionId: execution.id,
      status: 'completed',
      output: currentOutput,
      error: null,
      stepsCompleted,
      totalSteps: skill.steps.length,
      tokensUsed: totalTokens,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.skillExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        error: errorMessage,
        tokensUsed: totalTokens,
        durationMs,
        completedAt: new Date(),
      },
    });

    await pushTenantLog(
      context.tenantId,
      `Skill failed: ${skill.name} — ${errorMessage}`,
      'error',
      { executionId: execution.id, error: errorMessage }
    );

    return {
      executionId: execution.id,
      status: 'failed',
      output: null,
      error: errorMessage,
      stepsCompleted,
      totalSteps: skill.steps.length,
      tokensUsed: totalTokens,
      durationMs,
    };
  }
}

// ── Utility ────────────────────────────────────────────────

/**
 * Get all skills available for a tenant (installed + marketplace)
 */
export async function getAvailableSkills(tenantId: string) {
  const [allSkills, installations] = await Promise.all([
    prisma.skill.findMany({
      where: { isPublished: true },
      include: {
        pack: { select: { id: true, name: true, slug: true, icon: true } },
        steps: { select: { id: true, name: true, stepType: true, stepOrder: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { installCount: 'desc' },
    }),
    prisma.skillInstallation.findMany({
      where: { tenantId },
      select: { skillId: true, isActive: true },
    }),
  ]);

  const installMap = new Map(
    installations.map((i: { skillId: string; isActive: boolean }) => [i.skillId, i.isActive])
  );

  return allSkills.map((skill: { id: string; triggers: string; requiredPermissions: string; [key: string]: unknown }) => ({
    ...skill,
    installed: installMap.has(skill.id),
    active: installMap.get(skill.id) ?? false,
    triggers: JSON.parse(skill.triggers) as string[],
    requiredPermissions: JSON.parse(skill.requiredPermissions) as string[],
  }));
}

/**
 * Get execution history for a tenant
 */
export async function getExecutionHistory(
  tenantId: string,
  limit: number = 50
) {
  return prisma.skillExecution.findMany({
    where: { tenantId },
    include: {
      skill: { select: { name: true, slug: true, icon: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
