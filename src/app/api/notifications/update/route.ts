import { supabaseAdmin } from '@/lib/supabase/server';
import { normalizeCron, nextRunIso } from '@/lib/cron/utils';
import { computeCronFromQuery, sanitizeQueryForLLM } from '@/lib/openai/service';

export async function PATCH(req: Request) {
  const json = await req.json();
  const notificationId = typeof json?.notificationId === 'string' ? json.notificationId : '';
  const userId = typeof json?.userId === 'string' ? json.userId : '';
  const query = typeof json?.query === 'string' ? json.query : '';
  const scheduleCron = typeof json?.scheduleCron === 'string' ? json.scheduleCron : undefined;
  const isActive = typeof json?.isActive === 'boolean' ? json.isActive : undefined;

  const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!uuidRe.test(notificationId) || !uuidRe.test(userId)) {
    return new Response(JSON.stringify({ error: 'Invalid ID format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!query && isActive === undefined) {
    return new Response(JSON.stringify({ error: 'query or isActive required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('pan_notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      return new Response(JSON.stringify({ error: 'Notification not found or access denied' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const updateData: any = {};

    if (query) {
      updateData.query = query;
      
      // Get user location for sanitization
      const { data: userRow } = await supabaseAdmin
        .from('pan_users')
        .select('location')
        .eq('id', userId)
        .single();
      const userLocation = (userRow as any)?.location as string | undefined;

      // Sanitize query
      const queryForLLM = await sanitizeQueryForLLM(query, userLocation);
      updateData.query_for_llm = queryForLLM;

      // Handle cron
      let nextRunAt: string | null = null;
      if (scheduleCron) {
        const normalizedCron = normalizeCron(scheduleCron);
        nextRunAt = nextRunIso(normalizedCron);
        if (!nextRunAt) {
          return new Response(JSON.stringify({ error: 'Invalid cron expression' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        updateData.schedule_cron = normalizedCron;
      } else {
        // Infer cron from query
        const inferred = await computeCronFromQuery(query);
        if (inferred) {
          const normalized = normalizeCron(inferred);
          const nx = nextRunIso(normalized);
          if (nx) {
            nextRunAt = nx;
            updateData.schedule_cron = normalized;
          }
        }
      }
      updateData.next_run_at = nextRunAt;
      updateData.is_next_run_scheduled = false; // Reset scheduling flag
    }

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    const { data, error } = await supabaseAdmin
      .from('pan_notifications')
      .update(updateData)
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('id, query, query_for_llm, schedule_cron, next_run_at, is_active')
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ notification: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
