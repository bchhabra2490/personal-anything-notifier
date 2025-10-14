import { inngest } from '@/lib/inngest/client';
import { supabaseAdmin } from '@/lib/supabase/server';

type ScheduleEvent = {
  name: 'notification/schedule';
  data: { notificationId: string; runAtIso: string | null };
};

export const scheduler = inngest.createFunction(
  { id: 'schedule-notification-run' },
  { event: 'notification/schedule' },
  async ({ event, step }: { event: any, step: any }) => {
    const { notificationId, runAtIso } = (event as unknown as ScheduleEvent).data;

    // Mark as scheduled to avoid duplicate scheduling
    await step.run('mark-scheduled', async () => {
      const { error } = await supabaseAdmin
        .from('pan_notifications')
        .update({ is_next_run_scheduled: true })
        .eq('id', notificationId)
        .eq('is_next_run_scheduled', false);
      if (error) throw error;
    });

    if (!runAtIso) {
      // Nothing to run
      return { scheduled: false };
    }

    const runAt = new Date(runAtIso).getTime();
    const now = Date.now();
    const delayMs = Math.max(0, runAt - now);

    await step.sleep('sleep-until-run', delayMs);

    await step.sendEvent('trigger-runner', {
      name: 'notification/run',
      data: { notificationId },
    });

    return { scheduled: true, delayMs };
  }
);


