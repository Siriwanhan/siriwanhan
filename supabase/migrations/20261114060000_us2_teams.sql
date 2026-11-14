-- รันหลัง US-1: US-2 / AC-2.1–AC-2.6
begin;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  invite_code text not null unique check (invite_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$'),
  leader_id uuid not null unique references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.team_members (
  user_id uuid primary key references public.profiles(id),
  team_id uuid not null references public.teams(id),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);
alter table public.teams add constraint teams_leader_is_member
  foreign key (id, leader_id) references public.team_members(team_id, user_id)
  deferrable initially deferred;
create index team_members_team_id_idx on public.team_members(team_id);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
revoke all on public.teams, public.team_members from public, anon, authenticated;
grant select on public.teams, public.team_members to authenticated;

-- helpers อ่านโดยสิทธิ์เจ้าของ function เพื่อไม่ให้ RLS เรียกวนกัน
create function public.current_team_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select team_id from public.team_members where user_id = (select auth.uid()); $$;

create function public.is_team_leader(target_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teams t join public.team_members m
      on m.team_id = t.id and m.user_id = t.leader_id
    where t.id = target_team_id and t.leader_id = (select auth.uid())
  );
$$;

create function public.shares_team_with(target_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members me join public.team_members other
      on other.team_id = me.team_id
    where me.user_id = (select auth.uid()) and other.user_id = target_user_id
  );
$$;

revoke all on function public.current_team_id() from public, anon;
revoke all on function public.is_team_leader(uuid) from public, anon;
revoke all on function public.shares_team_with(uuid) from public, anon;
grant execute on function public.current_team_id(), public.is_team_leader(uuid), public.shares_team_with(uuid) to authenticated;

create policy teams_select_own_team on public.teams for select to authenticated
using (id = (select public.current_team_id()));
create policy members_select_own_team on public.team_members for select to authenticated
using (team_id = (select public.current_team_id()));
create policy profiles_select_teammates on public.profiles for select to authenticated
using (public.shares_team_with(id));

create function public.create_team(team_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  team uuid;
  code text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  collision_constraint text;
begin
  if caller is null then raise exception 'NOT_LOGGED_IN'; end if;
  perform 1 from public.profiles where id = caller for update;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if exists (select 1 from public.team_members where user_id = caller) then
    raise exception 'ALREADY_IN_TEAM';
  end if;
  if coalesce(btrim(team_name), '') = '' then raise exception 'TEAM_NAME_REQUIRED'; end if;
  if char_length(btrim(team_name)) > 100 then raise exception 'TEAM_NAME_TOO_LONG'; end if;
  -- แต่ละตัวอักษรได้จาก random byte ของ UUID (0..31 ไม่เกิด modulo bias)
  for attempt in 1..10 loop
    code := '';
    for position in 1..6 loop
      code := code || substr(alphabet, 1 + get_byte(uuid_send(gen_random_uuid()), 0) % 32, 1);
    end loop;
    begin
      insert into public.teams(name, invite_code, leader_id)
      values (btrim(team_name), code, caller) returning id into team;
      insert into public.team_members(user_id, team_id) values (caller, team);
      return team;
    exception when unique_violation then
      get stacked diagnostics collision_constraint = CONSTRAINT_NAME;
      if collision_constraint <> 'teams_invite_code_key' then raise; end if;
    end;
  end loop;
  raise exception 'INVITE_CODE_UNAVAILABLE';
end;
$$;

create function public.join_team(invite_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  target_team uuid;
  normalized_code text := upper(btrim(invite_code));
begin
  if caller is null then raise exception 'NOT_LOGGED_IN'; end if;
  perform 1 from public.profiles where id = caller for update;
  if not found then raise exception 'PROFILE_REQUIRED'; end if;
  if exists (select 1 from public.team_members where user_id = caller) then
    raise exception 'ALREADY_IN_TEAM';
  end if;
  if normalized_code is null or normalized_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    raise exception 'TEAM_NOT_FOUND';
  end if;
  select t.id into target_team from public.teams t where t.invite_code = normalized_code;
  if target_team is null then raise exception 'TEAM_NOT_FOUND'; end if;
  insert into public.team_members(user_id, team_id) values (caller, target_team);
  return target_team;
end;
$$;

revoke all on function public.create_team(text), public.join_team(text) from public, anon;
grant execute on function public.create_team(text), public.join_team(text) to authenticated;
commit;
