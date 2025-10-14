import { inngest } from '@/lib/inngest/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { computeNextRunAt } from '@/lib/inngest/functions/runner_util';
import { sendNotificationEmail } from '@/lib/email/send';
import { executeQueryWithAgent } from '@/lib/openai/agent';
import { evaluateAnswerRelevance } from '@/lib/openai/service';

type RunEvent = {
  name: 'notification/run';
  data: { notificationId: string };
};

// moved to runner_util for normalization and reuse

export const runner = inngest.createFunction(
  { id: 'run-notification' },
  { event: 'notification/run' },
  async ({ event, step }: { event: any, step: any }) => {
    const { notificationId } = (event as unknown as RunEvent).data;

    // Load notification
    const { data: notif, error: notifErr } = await supabaseAdmin
      .from('pan_notifications')
      .select('id, query, query_for_llm, schedule_cron, metadata, user_id')
      .eq('id', notificationId)
      .single();
    if (notifErr || !notif) throw notifErr ?? new Error('Notification not found');

    // Load user
    const { data: userRow, error: userErr } = await supabaseAdmin
      .from('pan_users')
      .select('email')
      .eq('id', notif.user_id)
      .single();
    if (userErr || !userRow) throw userErr ?? new Error('User not found');

    // Create a job row as running
    const runAtIso = new Date().toISOString();
    const { data: jobRow, error: jobErr } = await supabaseAdmin
      .from('pan_jobs')
      .insert({ notification_id: notif.id, run_at: runAtIso, status: 'running' })
      .select('id')
      .single();
    if (jobErr || !jobRow) throw jobErr ?? new Error('Job insert failed');

    // Execute: Agent with web_search tool
    const execution = await step.run('execute-query', async () => {
      const agentResult = await executeQueryWithAgent(notif.query_for_llm ?? notif.query);
      return agentResult;
    });

    // Determine if the agent produced a usable answer
    const answered = await step.run('evaluate-answer', async () => {
      const text = String((execution as any)?.answer ?? '').trim();
      if (!text) return { ok: false, reason: 'empty_answer' };
      const evaluation = await evaluateAnswerRelevance(notif.query_for_llm ?? notif.query, text);
      console.log("Answer evaluation:", evaluation);
      return evaluation;
    });

    if (!(answered as any).ok) {
      // Mark job as error and schedule next run; do not send email
      const { error: updJobErrFail } = await supabaseAdmin
        .from('pan_jobs')
        .update({ status: 'error', response: { execution, evaluation: answered } })
        .eq('id', jobRow.id);
      if (updJobErrFail) throw updJobErrFail;

      const nextRunAtFail = computeNextRunAt(notif.schedule_cron);
      const { error: updNotifErrFail } = await supabaseAdmin
        .from('pan_notifications')
        .update({ next_run_at: nextRunAtFail, is_next_run_scheduled: false, is_active: false })
        .eq('id', notif.id);
      if (updNotifErrFail) throw updNotifErrFail;

      return { jobId: jobRow.id, nextRunAt: nextRunAtFail, status: 'error' };
    }

    // Send email notification via helper
    const emailResult = await step.run('send-email', async () => {
      const to = userRow.email;
      const answer: string = String((execution as any)?.answer ?? '').trim();
      const sources: Array<{ title: string; url: string }> = Array.isArray((execution as any)?.sources)
        ? (execution as any).sources
        : [];
      try {
        return await sendNotificationEmail({
          to,
          notifId: notif.id,
          originalQuery: notif.query,
          answer,
          sources,
        });
      } catch (e: any) {
        return { sent: false, error: String(e?.message || e) };
      }
    });

    // Update job as success
    const { error: updJobErr } = await supabaseAdmin
      .from('pan_jobs')
      .update({ status: 'success', response: { execution, emailResult } })
      .eq('id', jobRow.id);
    if (updJobErr) throw updJobErr;

    // Compute next run and clear scheduled flag
    const nextRunAt = computeNextRunAt(notif.schedule_cron);
    const { error: updNotifErr } = await supabaseAdmin
      .from('pan_notifications')
      .update({ next_run_at: nextRunAt, is_next_run_scheduled: false })
      .eq('id', notif.id);
    if (updNotifErr) throw updNotifErr;

    return { jobId: jobRow.id, nextRunAt };
  }
);

// email rendering moved to lib/email/send


