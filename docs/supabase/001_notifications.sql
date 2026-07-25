-- Supabase migration: notifications table + trigger-based event notifications
-- Apply this in the Supabase SQL editor or via supabase db push.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM (
      'booking_request',
      'booking_confirmed',
      'booking_cancelled',
      'new_message',
      'payment_received',
      'new_review',
      'post_like',
      'post_comment',
      'post_share'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  channel_sent text[] NOT NULL DEFAULT ARRAY['in_app']::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_channel_sent text[] DEFAULT ARRAY['in_app']::text[]
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    body,
    data,
    is_read,
    channel_sent
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_body,
    COALESCE(p_data, '{}'::jsonb),
    false,
    COALESCE(p_channel_sent, ARRAY['in_app']::text[])
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_booking_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF LOWER(COALESCE(NEW.status::text, '')) = 'pending' THEN
    SELECT owner_id INTO v_owner_id
    FROM public.shops
    WHERE id = NEW.shop_id;

    PERFORM public.create_notification(
      v_owner_id,
      'booking_request'::public.notification_type,
      'New booking request',
      'You have a new booking request waiting for your response.',
      jsonb_build_object(
        'booking_id', NEW.id,
        'shop_id', NEW.shop_id,
        'customer_id', NEW.customer_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_type public.notification_type;
  v_title text;
  v_body text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF LOWER(COALESCE(NEW.status::text, '')) = 'confirmed' THEN
      v_type := 'booking_confirmed';
      v_title := 'Booking confirmed';
      v_body := 'Your booking has been confirmed.';
    ELSIF LOWER(COALESCE(NEW.status::text, '')) = 'cancelled' THEN
      v_type := 'booking_cancelled';
      v_title := 'Booking cancelled';
      v_body := 'Your booking has been cancelled.';
    ELSE
      RETURN NEW;
    END IF;

    PERFORM public.create_notification(
      NEW.customer_id,
      v_type,
      v_title,
      v_body,
      jsonb_build_object('booking_id', NEW.id, 'shop_id', NEW.shop_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_message_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Assumes the messages table has a recipient_id column.
  -- If your schema uses receiver_id, replace recipient_id below.
  PERFORM public.create_notification(
    NEW.recipient_id,
    'new_message'::public.notification_type,
    'New message',
    'You received a new message.',
    jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.sender_id)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_payment_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF LOWER(COALESCE(NEW.status::text, '')) = 'succeeded' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'payment_received'::public.notification_type,
      'Payment received',
      'A payment has been completed successfully.',
      jsonb_build_object('payment_id', NEW.id, 'booking_id', NEW.booking_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_review_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id
  FROM public.shops
  WHERE id = NEW.shop_id;

  PERFORM public.create_notification(
    v_owner_id,
    'new_review'::public.notification_type,
    'New review received',
    'A customer left a new review for your shop.',
    jsonb_build_object('review_id', NEW.id, 'shop_id', NEW.shop_id, 'customer_id', NEW.customer_id)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_activity_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_id uuid;
  v_post_shop_id uuid;
  v_type public.notification_type;
  v_title text;
  v_body text;
BEGIN
  SELECT shop_id INTO v_post_shop_id
  FROM public.posts
  WHERE id = NEW.post_id;

  IF v_post_shop_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT owner_id INTO v_owner_id
  FROM public.shops
  WHERE id = v_post_shop_id;

  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'post_likes' THEN
    v_type := 'post_like';
    v_title := 'Post liked';
    v_body := 'Someone liked your post.';
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'post_comments' THEN
    v_type := 'post_comment';
    v_title := 'New comment';
    v_body := 'Someone commented on your post.';
  ELSIF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'post_shares' THEN
    v_type := 'post_share';
    v_title := 'Post shared';
    v_body := 'Someone shared your post.';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.create_notification(
    v_owner_id,
    v_type,
    v_title,
    v_body,
    jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_insert_notify ON public.bookings;
CREATE TRIGGER bookings_insert_notify
AFTER INSERT ON public.bookings
FOR EACH ROW
WHEN (LOWER(COALESCE(NEW.status::text, '')) = 'pending')
EXECUTE FUNCTION public.notify_booking_insert();

DROP TRIGGER IF EXISTS bookings_status_notify ON public.bookings;
CREATE TRIGGER bookings_status_notify
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status)
EXECUTE FUNCTION public.notify_booking_status_change();

DROP TRIGGER IF EXISTS messages_insert_notify ON public.messages;
CREATE TRIGGER messages_insert_notify
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_message_insert();

DROP TRIGGER IF EXISTS payments_insert_notify ON public.payments;
CREATE TRIGGER payments_insert_notify
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_insert();

DROP TRIGGER IF EXISTS reviews_insert_notify ON public.reviews;
CREATE TRIGGER reviews_insert_notify
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.notify_review_insert();

DROP TRIGGER IF EXISTS post_likes_insert_notify ON public.post_likes;
CREATE TRIGGER post_likes_insert_notify
AFTER INSERT ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_activity_insert();

DROP TRIGGER IF EXISTS post_comments_insert_notify ON public.post_comments;
CREATE TRIGGER post_comments_insert_notify
AFTER INSERT ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_activity_insert();

DROP TRIGGER IF EXISTS post_shares_insert_notify ON public.post_shares;
CREATE TRIGGER post_shares_insert_notify
AFTER INSERT ON public.post_shares
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_activity_insert();
