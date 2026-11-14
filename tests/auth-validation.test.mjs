import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAuthInput } from "../lib/auth-validation.ts";

function form(overrides = {}) {
  const result = new FormData();
  for (const [key, value] of Object.entries({ intent: "signup", email: "person@example.test", password: "test-password", display_name: "ชื่อทดสอบ", ...overrides })) {
    result.set(key, value);
  }
  return result;
}

test("signup requires a nonblank name and password of at least six characters", () => {
  assert.ok(validateAuthInput(form({ display_name: "  " })).error);
  assert.ok(validateAuthInput(form({ display_name: "ก".repeat(101) })).error);
  assert.ok(validateAuthInput(form({ password: "12345" })).error);
  assert.equal(validateAuthInput(form({ password: "123456" })).error, undefined);
});

test("signup normalizes email/name while preserving password exactly", () => {
  const result = validateAuthInput(form({ email: " PERSON@EXAMPLE.TEST ", display_name: " ชื่อ ", password: " secret " }));
  assert.equal(result.email, "person@example.test");
  assert.equal(result.name, "ชื่อ");
  assert.equal(result.password, " secret ");
});

test("rejects malformed email and unrecognized authentication intent", () => {
  assert.ok(validateAuthInput(form({ email: "invalid" })).error);
  assert.ok(validateAuthInput(form({ intent: "admin" })).error);
});

test("login requires no display name and forwards short wrong passwords to Auth", () => {
  assert.equal(validateAuthInput(form({ intent: "login", display_name: "", password: "bad" })).error, undefined);
});

test("ignores spoofed identity/role fields instead of passing them to Auth", () => {
  const result = validateAuthInput(form({ user_id: "someone-else", role: "admin" }));
  assert.equal("user_id" in result, false);
  assert.equal("role" in result, false);
});
