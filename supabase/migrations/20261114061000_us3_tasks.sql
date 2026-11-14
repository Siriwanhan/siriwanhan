-- US-3 / AC-3.1–AC-3.7: ผู้รับต้องเป็นสมาชิกทีมเดียวกับงาน
begin;
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text,
  due_date date,
  assignee_id uuid not null references public.profiles(id),
  created_by uuid not null references auth.users(id),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_assignee_in_team foreign key (team_id, assignee_id)
    references public.team_members(team_id, user_id),
  constraint tasks_creator_in_team foreign key (team_id, created_by)
    references public.team_members(team_id, user_id)
);
create index tasks_team_status_idx on public.tasks(team_id, status);
create index tasks_assignee_due_idx on public.tasks(assignee_id, due_date);
create index tasks_created_by_idx on public.tasks(created_by);
alter table public.tasks enable row level security;
revoke all on public.tasks from public, anon, authenticated;
grant select, insert on public.tasks to authenticated;

create policy tasks_select_team on public.tasks for select to authenticated
using (team_id = (select public.current_team_id()));
create policy tasks_insert_leader on public.tasks for insert to authenticated
with check (
  team_id = (select public.current_team_id()) and public.is_team_leader(team_id)
  and created_by = (select auth.uid()) and status = 'todo'
);

create function public.guard_task_insert()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_team_leader(new.team_id)
     or new.created_by is distinct from (select auth.uid()) then
    raise exception 'TASK_CREATE_FORBIDDEN';
  end if;
  if coalesce(btrim(new.title), '') = '' then raise exception 'TASK_TITLE_REQUIRED'; end if;
  if new.status is distinct from 'todo' then raise exception 'INVALID_INITIAL_STATUS'; end if;
  new.title := btrim(new.title);
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.guard_task_insert() from public, anon, authenticated;
create trigger tasks_guard_insert before insert on public.tasks
for each row execute function public.guard_task_insert();
commit;
