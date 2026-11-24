-- 20261012000100_social_links.sql
-- Add social links and restaurant info placeholders to settings.

alter table public.restaurant_settings
  add column instagram_url     text default null,
  add column google_review_url text default null,
  add column facebook_url      text default null,
  add column youtube_url       text default null,
  add column whatsapp_number   text default null,
  add column zomato_url        text default null,
  add column swiggy_url        text default null,
  add column address           text default null,
  add column map_url           text default null,
  add column hours_text        text default null,
  add column tagline           text default null,
  add column contact_phone     text default null,
  add column contact_email     text default null,
  add column wifi_password     text default null;

-- Let staff update the new columns.
grant update (
  instagram_url, google_review_url, facebook_url, youtube_url,
  whatsapp_number, zomato_url, swiggy_url,
  address, map_url, hours_text, tagline,
  contact_phone, contact_email, wifi_password
) on public.restaurant_settings to authenticated;

-- Expose social links in the public menu response so the customer site can render them.
-- We add a top-level "info" key to the existing get_public_menu output.
create or replace function public.get_restaurant_info() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'instagram',    s.instagram_url,
    'googleReview', s.google_review_url,
    'facebook',     s.facebook_url,
    'youtube',      s.youtube_url,
    'whatsapp',     s.whatsapp_number,
    'zomato',       s.zomato_url,
    'swiggy',       s.swiggy_url,
    'address',      s.address,
    'mapUrl',       s.map_url,
    'hours',        s.hours_text,
    'tagline',      s.tagline,
    'phone',        s.contact_phone,
    'email',        s.contact_email,
    'wifi',         s.wifi_password
  ))
  from public.restaurant_settings s
  where s.id = 1
$$;

-- Anyone (anon or authenticated) can call this — it's public info.
grant execute on function public.get_restaurant_info() to anon, authenticated;
