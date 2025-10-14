import 'server-only';
import { Resend } from 'resend';

type Source = { title: string; url: string };

export async function sendNotificationEmail(params: {
  to: string;
  notifId: string;
  originalQuery: string;
  answer: string;
  sources: Source[];
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = (globalThis as any).process?.env?.RESEND_API_KEY as string | undefined;
  if (!apiKey) return { sent: false, error: 'RESEND_API_KEY not set' };

  const resend = new Resend(apiKey);
  const subject = `Notification run for ${params.notifId}`;
  const html = renderEmailHtml({
    notifId: params.notifId,
    originalQuery: params.originalQuery,
    answer: params.answer,
    sources: params.sources,
  });

  const { error } = await resend.emails.send({
    from: 'Notifier <onboarding@resend.dev>',
    to: params.to,
    subject,
    html,
  });
  if (error) return { sent: false, error: String(error) };
  return { sent: true };
}

function renderEmailHtml(input: {
  notifId: string;
  originalQuery: string;
  answer: string;
  sources: Source[];
}): string {
  const { notifId, originalQuery, answer, sources } = input;
  const sourcesHtml = sources.length
    ? `<div style="font-size:12px;color:#6b7280;">Sources</div>
          <ul style="margin:6px 0 0 16px;padding:0;">${sources
            .map(
              (s) =>
                `<li style=\"margin:6px 0;\"><a href=\"${escapeAttr(s.url)}\" style=\"color:#0b5fff;text-decoration:none;\">${escapeHtml(
                  s.title || s.url
                )}</a></li>`
            )
            .join('')}</ul>`
    : '';

  return `
<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin:0; padding:24px; background:#f6f7f9;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eceff3;">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px solid #eceff3;background:#0b5fff;color:#fff;">
          <h2 style="margin:0;font-size:18px;">Personal Anything Notifier</h2>
          <div style="opacity:0.9;font-size:12px;margin-top:4px;">Notification ${escapeHtml(notifId)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <div style="font-size:12px;color:#6b7280;">Original query</div>
          <div style="font-size:16px;margin:4px 0 16px 0;">${escapeHtml(originalQuery)}</div>

          <div style="font-size:12px;color:#6b7280;">Answer</div>
          <div style="font-size:16px;line-height:1.6;margin:4px 0 16px 0;white-space:pre-wrap;">${escapeHtml(
            answer || 'No answer'
          )}</div>

          ${sourcesHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;border-top:1px solid #eceff3;font-size:12px;color:#6b7280;">
          Sent at ${new Date().toISOString()}
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\(/g, '&#40;').replace(/\)/g, '&#41;');
}


