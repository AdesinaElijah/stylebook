import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function isAllowedType(type: string) {
  return ['payment_received', 'booking_confirmed', 'booking_cancelled', 'promo'].includes(type);
}

async function sendTwilioSms(to: string, body: string) {
  const params = new URLSearchParams({
    To: to,
    From: twilioFromNumber,
    Body: body,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const notification = payload.record as NotificationRow | undefined;

    if (!notification) {
      return new Response(JSON.stringify({ ok: false, error: 'No notification payload' }), { status: 400 });
    }

    if (!isAllowedType(notification.type)) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const { data: preferencesData, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .single();

    if (prefError && prefError.code !== 'PGRST116') {
      throw prefError;
    }

    const preferences = preferencesData as {
      sms_enabled?: boolean;
      sms_transactional_only?: boolean;
    } | null;

    const smsEnabled = preferences?.sms_enabled ?? false;
    const transactionalOnly = preferences?.sms_transactional_only ?? true;

    if (!smsEnabled || (transactionalOnly && !isAllowedType(notification.type))) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('phone')
      .eq('id', notification.user_id)
      .single();

    if (userError) {
      throw userError;
    }

    const phone = (userData as { phone?: string } | null)?.phone;
    if (!phone) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'no_phone' }), { status: 200 });
    }

    await sendTwilioSms(phone, `${notification.title}: ${notification.body}`);

    return new Response(JSON.stringify({ ok: true, sent: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ ok: false, error: String(error) }), { status: 500 });
  }
});
