import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    skillExecution: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    skillInstallation: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/redis', () => ({
  pushTenantLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/entitlements', () => ({
  requireAiFeature: vi.fn().mockResolvedValue({ aiEnabled: true }),
}));

import { prisma } from '@/lib/prisma';
import { resumeSkillExecution, SkillResumeError } from '@/lib/skill-engine';

const prismaMock = prisma as unknown as {
  skillExecution: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('resumeSkillExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.skillExecution.update.mockResolvedValue({});
  });

  it('rejects when role cannot approve', async () => {
    prismaMock.skillExecution.findFirst.mockResolvedValue({
      id: 'exec-1',
      tenantId: 't1',
      status: 'pending_approval',
      pausedAtStepOrder: 0,
      stepsCompleted: 1,
      totalSteps: 2,
      tokensUsed: 0,
      triggerEvent: 'manual',
      input: '{}',
      output: '{"status":"pending_approval","approverRole":"administrator"}',
      startedAt: new Date(),
      skill: {
        name: 'Approval Demo',
        steps: [
          {
            stepType: 'human_approval',
            config: JSON.stringify({ approverRole: 'administrator' }),
            stepOrder: 0,
          },
          {
            stepType: 'condition',
            config: JSON.stringify({ condition: 'true' }),
            stepOrder: 1,
          },
        ],
      },
    });

    await expect(
      resumeSkillExecution('exec-1', {
        tenantId: 't1',
        userId: 'u1',
        userRole: 'consultant',
        decision: 'approve',
      })
    ).rejects.toMatchObject({
      name: 'SkillResumeError',
      status: 403,
    } satisfies Partial<SkillResumeError>);
  });

  it('cancels on reject', async () => {
    prismaMock.skillExecution.findFirst.mockResolvedValue({
      id: 'exec-1',
      tenantId: 't1',
      status: 'pending_approval',
      pausedAtStepOrder: 0,
      stepsCompleted: 1,
      totalSteps: 1,
      tokensUsed: 0,
      triggerEvent: 'manual',
      input: '{}',
      output: '{}',
      startedAt: new Date(),
      skill: {
        name: 'Approval Demo',
        steps: [
          {
            stepType: 'human_approval',
            config: JSON.stringify({ approverRole: 'administrator' }),
            stepOrder: 0,
          },
        ],
      },
    });

    const result = await resumeSkillExecution('exec-1', {
      tenantId: 't1',
      userId: 'admin-1',
      userRole: 'administrator',
      decision: 'reject',
      reason: 'Not approved',
    });

    expect(result.status).toBe('cancelled');
    expect(result.error).toBe('Not approved');
    expect(prismaMock.skillExecution.update).toHaveBeenCalled();
  });
});
