-- Table privileges for the reports tables. New Supabase projects do not grant these
-- automatically to tables created in the SQL editor. Row-level security still decides
-- which rows each role can see: anon gets no reports rows and no log rows.

-- The server (service role) writes reports and the log, and reads admins.
grant select, insert, update on public.reports to service_role;
grant select, insert on public.moderation_log to service_role;
grant usage on sequence public.moderation_log_id_seq to service_role;
grant select, insert, delete on public.admins to service_role;
grant select, insert, update, delete on public.public_reports to service_role;

-- Signed-in admins read reports, the log and the admin list (RLS limits rows to admins).
grant select on public.reports, public.moderation_log, public.admins to authenticated;

-- Everyone reads approved reports at street level.
grant select on public.public_reports to anon, authenticated;
