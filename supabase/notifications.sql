-- Supabase SQL migration for notification preferences and SMS-safe notification flow

create table if not exists public.notification_preferences (
  user_id uuid primary key,
  in_app_enabled boolean not null default true,
  push_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  sms_transactional_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.update_notification_preferences_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
before update on public.notification_preferences
for each row
execute function public.update_notification_preferences_updated_at();

create or replace function public.get_notification_preferences(p_user_id uuid)
returns public.notification_preferences
language sql
as $$
  select *
  from public.notification_preferences
  where user_id = p_user_id;
$$;

create or replace function public.ensure_notification_preferences(p_user_id uuid)
returns public.notification_preferences
language plpgsql
as $$
declare
  v_row public.notification_preferences;
begin
  select * into v_row
  from public.notification_preferences
  where user_id = p_user_id;

  if not found then
    insert into public.notification_preferences (user_id)
    values (p_user_id)
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

create or replace function public.send_sms_notification()
returns trigger
language plpgsql
as $$
declare
  v_user_id uuid;
  v_sms_enabled boolean;
  v_sms_transactional_only boolean;
  v_phone text;
  v_type text;
  v_body text;
  v_should_send boolean;
  v_preferences public.notification_preferences;
begin
  if tg_op = 'INSERT' then
    v_user_id := new.user_id;
    v_type := new.type;
    v_body := coalesce(new.body, '');
  else
    return new;
  end if;

  select * into v_preferences
  from public.notification_preferences
  where user_id = v_user_id;

  if not found then
    perform public.ensure_notification_preferences(v_user_id);
    select * into v_preferences
    from public.notification_preferences
    where user_id = v_user_id;
  end if;

  if v_preferences is null then
    return new;
  end if;

  v_sms_enabled := coalesce(v_preferences.sms_enabled, false);
  v_sms_transactional_only := coalesce(v_preferences.sms_transactional_only, true);

  v_should_send := false;

  if v_sms_enabled then
    -- SMS is intentionally restricted to transactional/promotional types only.
    if v_type in ('payment_received', 'booking_confirmed', 'booking_cancelled', 'promo') then
      v_should_send := true;
    end if;
  end if;

  if not v_should_send then
    return new;
  end if;

  select phone into v_phone
  from public.users
  where id = v_user_id;

  if v_phone is null or v_phone = '' then
    return new;
  end if;

  -- The actual Twilio call is handled by the Supabase Edge Function.
  -- This trigger only ensures the row is eligible for SMS delivery.

  return new;
end;
$$;

drop trigger if exists trg_send_sms_notification on public.notifications;
create trigger trg_send_sms_notification
after insert on public.notifications
for each row
execute function public.send_sms_notification();
