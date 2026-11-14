// PostgreSQL จำลองในหน่วยความจำ ไม่อ่าน .env และไม่เชื่อมฐานข้อมูลผู้ใช้
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const users = Object.fromEntries(["A", "B", "C", "D", "E"].map((name, i) => [name, `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`]));
let team1, team2, invite1, invite2, assignedB, assignedA;

async function asUser(user, sql, params = []) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? ""]);
    await db.exec(user ? "set local role authenticated" : "set local role anon");
    const result = await db.query(sql, params);
    await db.exec("commit");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}
const createTask = (caller, team, assignee, title = "งานทดสอบ") => asUser(caller,
  "insert into public.tasks(team_id, assignee_id, created_by, title) values ($1,$2,$3,$4) returning *", [team, assignee, caller, title]);

before(async () => {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
    grant usage on schema public, auth to authenticated, anon;
  `);
  for (const file of ["20261114050000_us1_profiles.sql", "20261114060000_us2_teams.sql", "20261114061000_us3_tasks.sql", "20261114062000_us4_task_status.sql"]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }
  for (const [name, id] of Object.entries(users)) {
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)", [id, `${name}@example.test`, JSON.stringify({ display_name: name })]);
  }
  team1 = (await asUser(users.A, "select public.create_team('ทีม 1') as id")).rows[0].id;
  team2 = (await asUser(users.C, "select public.create_team('ทีม 2') as id")).rows[0].id;
  invite1 = (await asUser(users.A, "select invite_code from public.teams")).rows[0].invite_code;
  invite2 = (await asUser(users.C, "select invite_code from public.teams")).rows[0].invite_code;
  await asUser(users.B, "select public.join_team($1)", [` ${invite1.toLowerCase()} `]);
  await asUser(users.D, "select public.join_team($1)", [invite1]);
  assignedB = (await createTask(users.A, team1, users.B)).rows[0].id;
  assignedA = (await createTask(users.A, team1, users.A, "หัวหน้ามอบให้ตัวเอง")).rows[0].id;
  await createTask(users.C, team2, users.C, "งานทีม 2");
});
after(async () => { await db.close(); });

test("AC-2.2–2.3 team creation/join are atomic, have six-character invites and include the leader", async () => {
  assert.match(invite1, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  assert.notEqual(invite1, invite2);
  const team = (await asUser(users.A, "select * from public.teams")).rows;
  assert.equal(team.length, 1);
  assert.equal(team[0].leader_id, users.A);
  assert.equal((await asUser(users.B, "select public.current_team_id() as id")).rows[0].id, team1);
  assert.equal((await asUser(users.A, "select * from public.team_members")).rows.length, 3);
});
test("AC-2.3–2.5 reject invalid codes, blank team names and second teams through direct RPC", async () => {
  await assert.rejects(asUser(users.E, "select public.join_team('!!!!!!')"), /TEAM_NOT_FOUND/);
  const unusedCode = ["AAAAAA", "BBBBBB", "CCCCCC"].find(code => ![invite1, invite2].includes(code));
  await assert.rejects(asUser(users.E, "select public.join_team($1)", [unusedCode]), /TEAM_NOT_FOUND/);
  await assert.rejects(asUser(users.E, "select public.create_team('  ')"), /TEAM_NAME_REQUIRED/);
  await assert.rejects(asUser(users.B, "select public.join_team($1)", [invite2]), /ALREADY_IN_TEAM/);
  await assert.rejects(asUser(users.B, "select public.create_team('ทีมซ้ำ')"), /ALREADY_IN_TEAM/);
  assert.equal((await db.query("select count(*)::int as count from public.teams")).rows[0].count, 2);
});
test("AC-2.4 direct table writes cannot bypass the one-team rule or forge membership", async () => {
  await assert.rejects(asUser(users.E, "insert into public.team_members(user_id,team_id) values ($1,$2)", [users.E, team1]), /permission denied/);
  await assert.rejects(asUser(users.B, "update public.teams set leader_id=$1 where id=$2", [users.B, team1]), /permission denied/);
  await assert.rejects(db.query("insert into public.team_members(user_id,team_id) values ($1,$2)", [users.B, team2]), /duplicate key/);
});
test("AC-2.6 outsiders cannot read another team's name, invite, memberships or profiles", async () => {
  assert.equal((await asUser(users.C, "select * from public.teams where id=$1", [team1])).rows.length, 0);
  assert.equal((await asUser(users.C, "select * from public.team_members where team_id=$1", [team1])).rows.length, 0);
  assert.equal((await asUser(users.C, "select * from public.profiles where id=$1", [users.A])).rows.length, 0);
  assert.equal((await asUser(users.B, "select * from public.profiles")).rows.length, 3);
  assert.equal((await asUser(users.E, "select * from public.teams")).rows.length, 0);
  assert.equal((await asUser(users.E, "select * from public.profiles")).rows.length, 1);
  await assert.rejects(asUser(null, "select * from public.teams"), /permission denied/);
  await assert.rejects(asUser(null, "select public.join_team($1)", [invite1]), /permission denied/);
});
test("AC-3.1, 3.3–3.5 only a leader creates todo tasks for members of the same team", async () => {
  assert.equal((await asUser(users.A, "select status from public.tasks where id=$1", [assignedB])).rows[0].status, "todo");
  await assert.rejects(createTask(users.B, team1, users.B), /TASK_CREATE_FORBIDDEN|row-level security/);
  await assert.rejects(createTask(users.A, team1, users.C), /tasks_assignee_in_team/);
  await assert.rejects(createTask(users.A, team1, users.B, "  "), /TASK_TITLE_REQUIRED/);
  await assert.rejects(asUser(users.A, "insert into public.tasks(team_id,assignee_id,created_by,title,status) values ($1,$2,$3,'งาน','done')", [team1, users.B, users.A]), /INVALID_INITIAL_STATUS|row-level security/);
});
test("AC-3.7 tasks are visible to teammates but hidden from other teams and anonymous users", async () => {
  assert.equal((await asUser(users.B, "select * from public.tasks")).rows.length, 2);
  assert.equal((await asUser(users.C, "select * from public.tasks where team_id=$1", [team1])).rows.length, 0);
  await assert.rejects(asUser(null, "select * from public.tasks"), /permission denied/);
});
test("AC-4.1–4.3 assignee/leader can change status; other members and teams cannot", async () => {
  await asUser(users.B, "update public.tasks set status='in_progress' where id=$1", [assignedB]);
  await asUser(users.B, "update public.tasks set status='done' where id=$1", [assignedB]);
  await asUser(users.B, "update public.tasks set status='todo' where id=$1", [assignedB]);
  assert.equal((await asUser(users.D, "update public.tasks set status='done' where id=$1 returning id", [assignedB])).rows.length, 0);
  assert.equal((await asUser(users.C, "update public.tasks set status='done' where id=$1 returning id", [assignedB])).rows.length, 0);
  await asUser(users.A, "update public.tasks set status='in_progress' where id=$1", [assignedB]);
  assert.equal((await asUser(users.B, "select status from public.tasks where id=$1", [assignedB])).rows[0].status, "in_progress");
  assert.equal((await asUser(users.B, "update public.tasks set status='done' where id=$1 returning id", [assignedA])).rows.length, 0);
});
test("AC-4.4 assignees cannot change title, nullable fields, assignee or timestamps via direct UPDATE", async () => {
  for (const [column, value] of [["title", "ชื่อปลอม"], ["description", "แอบแก้รายละเอียด"], ["due_date", "2026-12-31"], ["assignee_id", users.A], ["updated_at", "2000-01-01T00:00:00Z"]]) {
    await assert.rejects(asUser(users.B, `update public.tasks set ${column}=$1 where id=$2`, [value, assignedB]), /ONLY_STATUS_ALLOWED/);
  }
  for (const [column, value] of [["team_id", team2], ["created_by", users.B], ["id", users.E], ["created_at", "2000-01-01T00:00:00Z"]]) {
    await assert.rejects(asUser(users.B, `update public.tasks set ${column}=$1 where id=$2`, [value, assignedB]), /CANNOT_CHANGE_OWNER/);
  }
  await assert.rejects(asUser(users.B, "update public.tasks set status='invalid' where id=$1", [assignedB]), /check constraint/);
});
test("leaders cannot move tasks between teams, assign outsiders, or delete through the app role", async () => {
  await assert.rejects(asUser(users.A, "update public.tasks set assignee_id=$1 where id=$2", [users.C, assignedB]), /tasks_assignee_in_team/);
  await assert.rejects(asUser(users.A, "update public.tasks set team_id=$1 where id=$2", [team2, assignedB]), /CANNOT_CHANGE_OWNER/);
  await assert.rejects(asUser(users.A, "delete from public.tasks where id=$1", [assignedB]), /permission denied/);
  await asUser(users.A, "update public.tasks set title='หัวหน้าแก้ชื่อได้' where id=$1", [assignedB]);
});

test("team integrity rejects an orphan leader at commit and rolls back the whole team", async () => {
  const previous = (await db.query("select count(*)::int as n from public.teams")).rows[0].n;
  await db.exec("begin");
  await db.query("insert into public.teams(name,invite_code,leader_id) values ('ทีมที่ต้องย้อนกลับ',$1,$2)",
    [["XXXXXX", "YYYYYY", "ZZZZZZ"].find(code => ![invite1, invite2].includes(code)), users.E]);
  await assert.rejects(db.exec("commit"), /teams_leader_is_member/);
  await db.exec("rollback");
  assert.equal((await db.query("select count(*)::int as n from public.teams")).rows[0].n, previous);
});
