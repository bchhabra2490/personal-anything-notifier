import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationEmail } from '@/lib/email/send';

export async function POST(req: Request) {
  const json = await req.json();
  const email = typeof json?.email === 'string' ? json.email.trim().toLowerCase() : '';
  const location = typeof json?.location === 'string' ? json.location.trim() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('pan_users')
      .select('id, email')
      .eq('email', email)
      .single();

    let userId: string;
    let isNew = false;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error } = await supabaseAdmin
        .from('pan_users')
        .insert({
          email,
          location: location || null,
        })
        .select('id, email')
        .single();

      if (error || !newUser) {
        return new Response(JSON.stringify({ error: 'Failed to create user' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
      userId = newUser.id;
      isNew = true;
    }

    // Send UUID via email
    const emailResult = await sendNotificationEmail({
      to: email,
      notifId: 'welcome',
      originalQuery: 'Welcome to Personal Anything Notifier',
      answer: `Your unique ID is: ${userId}\n\nUse this ID to create and manage your notifications. Keep it safe!`,
      sources: []
    });

    if (!emailResult.sent) {
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ 
      email,
      isNew,
      message: 'Check your email for your unique ID'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
