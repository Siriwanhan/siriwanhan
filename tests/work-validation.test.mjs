import { test } from "node:test";
import assert from "node:assert/strict";
import { bangkokToday, isOverdue, thaiDate, isTaskStatus, validateTask, databaseMessage } from "../lib/work-validation.ts";

function task(overrides = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ title: "งานทดสอบ", assignee_id: "00000000-0000-4000-8000-000000000001", description: "", due_date: "", ...overrides })) form.set(key, value);
  return form;
}
test("AC-3.5 rejects blank title; task input requires an assignee and a real calendar date", () => {
  assert.equal(validateTask(task({ title: "  " })).error, "กรุณากรอกชื่องาน");
  assert.ok(validateTask(task({ assignee_id: "" })).error);
  assert.ok(validateTask(task({ due_date: "2026-02-30" })).error);
  assert.ok(validateTask(task({ due_date: "2026-13-01" })).error);
  assert.equal(validateTask(task({ due_date: "2028-02-29" })).error, undefined);
  assert.equal(validateTask(task()).dueDate, null);
});
test("task input does not accept spoofed team, author or initial status", () => {
  const value = validateTask(task({ team_id: "other-team", created_by: "other-user", status: "done" }));
  assert.equal("team_id" in value, false);
  assert.equal("created_by" in value, false);
  assert.equal("status" in value, false);
});
test("AC-4.5 uses Bangkok midnight and excludes completed, today and undated tasks", () => {
  assert.equal(bangkokToday(new Date("2026-11-13T16:59:59Z")), "2026-11-13");
  assert.equal(bangkokToday(new Date("2026-11-13T17:00:00Z")), "2026-11-14");
  assert.equal(isOverdue("2026-11-13", "todo", "2026-11-14"), true);
  assert.equal(isOverdue("2026-11-13", "done", "2026-11-14"), false);
  assert.equal(isOverdue("2026-11-14", "in_progress", "2026-11-14"), false);
  assert.equal(isOverdue(null, "todo", "2026-11-14"), false);
  assert.equal(thaiDate(null), "ไม่มีกำหนด");
  assert.ok(thaiDate("2026-11-14").includes("14"));
});
test("status values are constrained and database internals are not exposed", () => {
  assert.equal(isTaskStatus("in_progress"), true);
  assert.equal(isTaskStatus("admin"), false);
  assert.equal(databaseMessage({ message: "ALREADY_IN_TEAM" }), "คุณมีทีมอยู่แล้ว");
  assert.equal(databaseMessage({ message: "sensitive internal detail" }).includes("sensitive"), false);
});
