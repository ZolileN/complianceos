/* ============================================================
   PraxisOne — Skill Runtime Engine
   
   The execution core of the Skills.sh layer. Resolves skills,
   validates permissions, executes steps, and logs everything.
   ============================================================ */

import { prisma } from '@/lib/prisma';
import { pushTenantLog } from '@/lib/redis';

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
 * LLM Call Step — sends a prompt to the configured LLM provider
 */
async function executeLLMStep(
  config: StepConfig,
  context: SkillExecutionContext,
  previousOutput: Record<string, unknown>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  const prompt = config.prompt || '';
  
  // Interpolate variables from context and previous output
  const interpolated = prompt
    .replace(/\{\{input\.([\w.]+)\}\}/g, (_, key: string) => {
      return String(context.input[key] ?? '');
    })
    .replace(/\{\{previous\.([\w.]+)\}\}/g, (_, key: string) => {
      return String(previousOutput[key] ?? '');
    });

  // For now, simulate LLM execution
  // In production, this would call OpenAI/Anthropic
  const simulatedTokens = Math.ceil(interpolated.length / 4);
  
  return {
    output: {
      result: `[LLM Response] Processed: "${interpolated.substring(0, 100)}..."`,
      prompt_length: interpolated.length,
      model: 'gpt-4o-mini',
    },
    tokensUsed: simulatedTokens,
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
    return { output: { error: 'No endpoint configured' }, tokensUsed: 0 };
  }

  // In production, make the actual HTTP call
  // For now, simulate the response
  return {
    output: {
      result: `[API Response] Called: ${endpoint}`,
      status: 200,
      previousData: previousOutput,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _previousOutput: Record<string, unknown>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  const query = config.query || '';
  
  // Supported queries: client_lookup, document_search, etc.
  if (query === 'client_lookup' && context.input['email']) {
    const client = await prisma.client.findFirst({
      where: {
        tenantId: context.tenantId,
        email: String(context.input['email']),
      },
    });
    return { output: { client: client || null, found: !!client }, tokensUsed: 0 };
  }

  return {
    output: { result: `[DB Query] Executed: ${query}`, tenantId: context.tenantId },
    tokensUsed: 0,
  };
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
