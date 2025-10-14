import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const uuidRe = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!uuidRe.test(userId)) {
    return new Response(JSON.stringify({ error: 'Invalid userId format' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { data: notifications, error } = await supabaseAdmin
      .from('pan_notifications')
      .select('id, query, query_for_llm, schedule_cron, next_run_at, is_active, created_at, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ notifications: notifications || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
