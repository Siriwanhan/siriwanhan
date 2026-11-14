-- US-4 / AC-4.1–AC-4.4: RLS จำกัดแถว, trigger จำกัดคอลัมน์
begin;
grant update on public.tasks to authenticated;
create policy tasks_update_authorized on public.tasks for update to authenticated
using (
  team_id = (select public.current_team_id())
  and (public.is_team_leader(team_id) or assignee_id = (select auth.uid()))
)
with check (
  team_id = (select public.current_team_id())
  and (public.is_team_leader(team_id) or assignee_id = (select auth.uid()))
);

create function public.guard_task_update()
returns trigger language plpgsql set search_path = ''
as $$
declare
  leader boolean := public.is_team_leader(old.team_id);
begin
  if (select auth.uid()) is null
     or old.team_id is distinct from public.current_team_id()
     or (not leader and old.assignee_id is distinct from (select auth.uid())) then
    raise exception 'TASK_UPDATE_FORBIDDEN';
  end if;
  if new.id is distinct from old.id or new.team_id is distinct from old.team_id
     or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'CANNOT_CHANGE_OWNER';
  end if;
  -- ตรวจทุกคอลัมน์ยกเว้น status รวม updated_at ที่ผู้ใช้พยายามส่งมาเอง
  if not leader and (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'ONLY_STATUS_ALLOWED';
  end if;
  if coalesce(btrim(new.title), '') = '' then raise exception 'TASK_TITLE_REQUIRED'; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.guard_task_update() from public, anon, authenticated;
create trigger tasks_guard_update before update on public.tasks
for each row execute function public.guard_task_update();
commit;
