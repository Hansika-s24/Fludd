-- Fludd resident flood reports: tables, private photo bucket, access rules.
-- Privacy model:
--   * Reports are written only by the server route (service role) after it strips photo
--     metadata, snaps the public position to a road and asks Gemini to read the photo.
--   * Exact positions and photos are readable only by admins.
--   * The public sees only approved reports, at their snapped street-level position,
--     through public_reports (kept in step by a trigger, published for live updates).
--   * moderation_log is append-only for everyone, including the service role.

-- ---------- Admins ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admins read the admin list" on public.admins
  for select to authenticated using ((select public.is_admin()));

-- ---------- Reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  taken_at timestamptz,
  exact_lng double precision not null check (exact_lng between -180 and 180),
  exact_lat double precision not null check (exact_lat between -90 and 90),
  public_lng double precision not null check (public_lng between -180 and 180),
  public_lat double precision not null check (public_lat between -90 and 90),
  position_source text not null check (position_source in ('gps', 'pin')),
  photo_path text not null,
  -- { waterPresent, depthRangeM: [lo, hi], reference, confidence } or null when unavailable
  ai_reading jsonb,
  ai_status text not null default 'unavailable' check (ai_status in ('read', 'unavailable')),
  model_depth_m real,
  status text not null default 'waiting' check (status in ('waiting', 'approved', 'rejected')),
  final_depth_m real check (final_depth_m is null or final_depth_m between 0 and 5),
  decided_at timestamptz
);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;

create policy "admins read reports" on public.reports
  for select to authenticated using ((select public.is_admin()));
-- No insert, update or delete policies: only the server (service role) writes.

-- ---------- Append-only moderation log ----------
create table if not exists public.moderation_log (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete restrict,
  admin_id uuid not null references auth.users (id),
  decision text not null check (decision in ('approve', 'edit', 'reject')),
  depth_m real,
  created_at timestamptz not null default now()
);
create index if not exists moderation_log_report_idx on public.moderation_log (report_id);
alter table public.moderation_log enable row level security;

create policy "admins read the moderation log" on public.moderation_log
  for select to authenticated using ((select public.is_admin()));

create or replace function public.forbid_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'moderation_log is append-only';
end;
$$;
drop trigger if exists moderation_log_append_only on public.moderation_log;
create trigger moderation_log_append_only
  before update or delete on public.moderation_log
  for each row execute function public.forbid_log_change();

-- ---------- Public, street-level view of approved reports ----------
create table if not exists public.public_reports (
  id uuid primary key references public.reports (id) on delete cascade,
  lng double precision not null,
  lat double precision not null,
  depth_m real not null,
  source text not null check (source in ('gps', 'pin')),
  created_at timestamptz not null
);
alter table public.public_reports enable row level security;

create policy "anyone reads approved reports" on public.public_reports
  for select to anon, authenticated using (true);

create or replace function public.sync_public_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and new.final_depth_m is not null then
    insert into public.public_reports (id, lng, lat, depth_m, source, created_at)
    values (new.id, new.public_lng, new.public_lat, new.final_depth_m, new.position_source, new.created_at)
    on conflict (id) do update
      set lng = excluded.lng, lat = excluded.lat, depth_m = excluded.depth_m, source = excluded.source;
  else
    delete from public.public_reports where id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists reports_sync_public on public.reports;
create trigger reports_sync_public
  after insert or update of status, final_depth_m, public_lng, public_lat on public.reports
  for each row execute function public.sync_public_report();

-- Live updates for the map (approved reports only).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'public_reports'
  ) then
    alter publication supabase_realtime add table public.public_reports;
  end if;
end $$;

-- ---------- Private photo bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false;

create policy "admins read report photos" on storage.objects
  for select to authenticated using (bucket_id = 'report-photos' and (select public.is_admin()));
-- No insert policy: only the server uploads, with the service role, after stripping metadata.
