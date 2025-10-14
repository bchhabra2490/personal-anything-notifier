import { supabaseAdmin } from '@/lib/supabase/server';
import { normalizeCron, nextRunIso } from '@/lib/cron/utils';
import { computeCronFromQuery, sanitizeQueryForLLM } from '@/lib/openai/service';

export async function POST(req: Request) {
  const json = await req.json();
  const userId = typeof json?.userId === 'string' ? json.userId : '';
  const query = typeof json?.query === 'string' ? json.query : '';
  let scheduleCron = typeof json?.scheduleCron === 'string' ? json.scheduleCron : undefined;
  const metadata = (json && typeof json.metadata === 'object' && json.metadata !== null) ? json.metadata : undefined;

  const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!uuidRe.test(userId) || !query) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  let nextRunAt: string | null = null;
  // Load user location from pan_users
  const { data: userRow } = await supabaseAdmin
    .from('pan_users')
    .select('location')
    .eq('id', userId)
    .single();

  if(!userRow) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const userLocation = (userRow as any)?.location as string | undefined;
  if (scheduleCron) {
    scheduleCron = normalizeCron(scheduleCron) || undefined;
    nextRunAt = nextRunIso(scheduleCron ?? null);
    if (!nextRunAt) {
      return new Response(JSON.stringify({ error: 'Invalid cron expression' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  } else {
    // If not provided, ask OpenAI to infer one from the query
    const inferred = await computeCronFromQuery(query);
    if (inferred) {
      const normalized = normalizeCron(inferred);
      const nx = nextRunIso(normalized);
      if (nx) {
        nextRunAt = nx;
        scheduleCron = normalized ?? undefined;
      }
    }
  }

  const queryForLLM = await sanitizeQueryForLLM(query, userLocation);

  const { data, error } = await supabaseAdmin
    .from('pan_notifications')
    .insert({
      user_id: userId,
      query,
      query_for_llm: queryForLLM ?? null,
      schedule_cron: scheduleCron ?? null,
      next_run_at: nextRunAt,
      metadata: { ...(metadata ?? {}), userLocation: userLocation ?? null },
    })
    .select('id, next_run_at, query_for_llm')
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Insert failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ id: data.id, nextRunAt: data.next_run_at, queryForLLM: data.query_for_llm }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}


