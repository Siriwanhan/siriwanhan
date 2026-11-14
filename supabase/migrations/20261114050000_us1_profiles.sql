-- US-1 / AC-1.1–AC-1.5: ให้ผู้ใช้รันไฟล์นี้ใน Supabase SQL Editor
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

create policy "profiles_select_own"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

-- US-2 จะเพิ่ม policy อ่านเพื่อนร่วมทีมภายหลัง ปัจจุบันอ่านได้เฉพาะตนเอง
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  profile_name text := btrim(new.raw_user_meta_data ->> 'display_name');
begin
  if profile_name is null or char_length(profile_name) not between 1 and 100 then
    raise exception 'DISPLAY_NAME_REQUIRED';
  end if;
  insert into public.profiles(id, display_name, email)
  values (new.id, profile_name, new.email);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.sync_profile_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_profile_email() from public, anon, authenticated;
create trigger on_auth_user_email_changed
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_profile_email();

-- รองรับบัญชีอีเมลที่สร้างไว้ก่อน migration โดยไม่แก้ข้อมูล Auth
insert into public.profiles(id, display_name, email)
select id,
  left(coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(email, '@', 1), ''), 'ผู้ใช้'), 100),
  email
from auth.users
where email is not null;

commit;
