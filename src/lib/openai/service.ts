import 'server-only';
import OpenAI from 'openai';
import { normalizeCron, isValidCron } from '@/lib/cron/utils';

const apiKey = (globalThis as any).process?.env?.OPENAI_API_KEY as string | undefined;

function getClient(): OpenAI | null {
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export async function computeCronFromQuery(query: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const system = [
    'You turn user notification requests into a single cron expression in UTC.',
    'Return ONLY the cron string in the format "m h dom mon dow" (5 fields).',
    'If the schedule is unclear, infer a reasonable default, like daily at 09:00 UTC.',
  ].join(' ');

  const prompt = `User request: ${query}\nRespond with only the cron expression.`;

  try {
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });
    const text = resp.choices?.[0]?.message?.content?.trim() ?? '';
    const cron = normalizeCron(text);
    console.log("cron", cron, text);
    if (!cron) return null;
    if (!isValidCron(cron)) return null;
    console.log("Valid cron", cron);
    return cron;
  } catch {
    return null;
  }
}

export async function sanitizeQueryForLLM(query: string, userLocation?: string | null): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const system = [
    'You extract the core information need from a user notification request.',
    'Remove any schedule or timing instructions (like every X minutes, daily at time).',
    'Return ONLY a short imperative query to check, e.g., "Check gold price".',
  ].join(' ');

  const locationLine = userLocation ? `User location: ${userLocation}` : '';
  const prompt = `User request: ${query}\n${locationLine}\nReturn only the sanitized query. If location helps disambiguate, implicitly scope to that location.`;

  try {
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });
    const text = resp.choices?.[0]?.message?.content?.trim() ?? '';
    return text || null;
  } catch {
    return null;
  }
}

export type EvaluationResult = { ok: boolean; score?: number; reason?: string };

export async function evaluateAnswerRelevance(query: string, answer: string): Promise<EvaluationResult> {
  const client = getClient();
  if (!client) return { ok: false, reason: 'openai_unavailable' };

  const system = [
    'You are a strict evaluator. Score how well the answer addresses the query.',
    'Return JSON only: {"ok": boolean, "score": number, "reason": string}.',
    'Consider relevance and completeness. Score 0-1.',
    'ok=true only if score >= 0.6.'
  ].join(' ');

  const user = `Query: ${query}\n\nAnswer: ${answer}\n\nRespond with JSON only.`;

  try {
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
    });
    const text = resp.choices?.[0]?.message?.content?.trim() ?? '';
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed?.ok === 'boolean') return parsed as EvaluationResult;
    } catch {}
    return { ok: false, reason: 'parse_failed' };
  } catch {
    return { ok: false, reason: 'openai_error' };
  }
}


