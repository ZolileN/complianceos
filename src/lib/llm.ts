/* ============================================================
   PraxisOne — LLM provider (OpenAI-compatible)
   ============================================================ */

export interface LLMCompletionResult {
  text: string;
  model: string;
  tokensUsed: number;
  simulated: boolean;
}

/**
 * Completes a prompt via an OpenAI-compatible Chat Completions API.
 *
 * Env:
 * - OPENAI_API_KEY (required unless SKILL_LLM_SIMULATE=true)
 * - OPENAI_BASE_URL (optional, default https://api.openai.com/v1)
 * - OPENAI_MODEL (optional, default gpt-4o-mini)
 * - SKILL_LLM_SIMULATE=true — return a clearly marked stub (local demos only)
 */
export async function completePrompt(prompt: string): Promise<LLMCompletionResult> {
  if (process.env.SKILL_LLM_SIMULATE === 'true') {
    return {
      text: `[SIMULATED LLM] Processed prompt (${prompt.length} chars): ${prompt.substring(0, 120)}…`,
      model: 'simulate',
      tokensUsed: Math.ceil(prompt.length / 4),
      simulated: true,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'LLM provider not configured. Set OPENAI_API_KEY, or SKILL_LLM_SIMULATE=true for local stubs.'
    );
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a compliance operations assistant for South African accounting and advisory firms. Prefer concise, structured answers. When asked for JSON, return valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(
      `LLM request failed (${response.status}): ${errBody.substring(0, 300) || response.statusText}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
    model?: string;
  };

  const text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) {
    throw new Error('LLM returned an empty response');
  }

  return {
    text,
    model: data.model || model,
    tokensUsed: data.usage?.total_tokens ?? Math.ceil((prompt.length + text.length) / 4),
    simulated: false,
  };
}

/**
 * Try to parse LLM output as JSON. Falls back to wrapping raw text.
 */
export function parseLLMJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { result: parsed };
  } catch {
    return { result: text };
  }
}
