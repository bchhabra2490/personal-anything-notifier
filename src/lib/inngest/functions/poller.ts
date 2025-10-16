import { inngest } from '@/lib/inngest/client';
import { supabaseAdmin } from '@/lib/supabase/server';

// Runs every 30 seconds: find due notifications and schedule a scheduler function for each
export const poller = inngest.createFunction(
  { id: 'poll-schedule-near-future' },
  // { cron: '* * * * *' },
  { event: 'notification/poll' },
  async ({ step }: { step: any }) => {
    console.log("Poller function called");
    // Proactively schedule runs in the near future to avoid lateness.
    // Look ahead 2 minutes; adjust via env if needed.
    // eslint-disable-next-line no-undef
    const horizonMs = Number((globalThis as any).process?.env?.NOTIFY_LOOKAHEAD_MS ?? 2 * 60 * 1000);
    const now = Date.now();
    const horizonIso = new Date(now + horizonMs).toISOString();

    const { data, error } = await supabaseAdmin
      .from('pan_notifications')
      .select('id, next_run_at')
      .eq('is_active', true)
      .eq('is_next_run_scheduled', false)
      .lte('next_run_at', horizonIso)
      .limit(1000);

    if (error) throw error;
    if (!data || data.length === 0) return { scheduled: 0 };

    // For each, call scheduler function via event
    for (const n of data) {
      await step.sendEvent('schedule-notification', {
        name: 'notification/schedule',
        data: {
          notificationId: n.id,
          runAtIso: n.next_run_at,
        },
      });
    }

    return { scheduled: data.length, horizonMs };
  }
);


