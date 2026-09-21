-- =========================================================
-- Run this AFTER schema.sql (in the same SQL Editor, as a new query).
--
-- Why this is needed: the profiles table can only be read by signed-in
-- users (that's correct — it has names, student IDs, roles, etc.). But
-- the signup form needs to check "is this email/student ID already
-- taken?" BEFORE the person has an account to sign in with. These two
-- functions answer only that one yes/no question, via SECURITY DEFINER
-- (which lets them peek at the table on the visitor's behalf) — they
-- never expose any actual profile data, just a boolean.
-- =========================================================
create function public.email_taken(p_email text) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists(select 1 from public.profiles where lower(email) = lower(p_email));
  $$;
grant execute on function public.email_taken(text) to anon, authenticated;

create function public.student_id_taken(p_student_id text) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists(select 1 from public.profiles where student_id <> '' and lower(student_id) = lower(p_student_id));
  $$;
grant execute on function public.student_id_taken(text) to anon, authenticated;
