"use client";

import { useActionState, useState } from "react";
import { authenticate } from "./actions";

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(authenticate, { message: "" });
  const fieldClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 focus:outline-2 focus:outline-blue-600";
  return (
    <form action={action} className="mt-6 space-y-5" aria-busy={pending}>
      <input type="hidden" name="intent" value={mode} />
      {mode === "signup" && (
        <label className="block font-medium" htmlFor="display_name">ชื่อที่แสดง
          <input className={fieldClass} id="display_name" name="display_name" autoComplete="nickname" maxLength={100} required />
        </label>
      )}
      <label className="block font-medium" htmlFor="email">อีเมล
        <input className={fieldClass} id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      <label className="block font-medium" htmlFor="password">รหัสผ่าน
        <input className={fieldClass} id="password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 6 : undefined} required aria-describedby="password-hint" />
      </label>
      <p id="password-hint" className="text-sm text-slate-600">รหัสผ่านอย่างน้อย 6 ตัวอักษร</p>
      <p role="status" aria-live="polite" className="break-words text-sm text-red-700">{state.message}</p>
      <button className="w-full rounded-lg bg-blue-800 px-4 py-3 font-semibold text-white disabled:opacity-60" type="submit" disabled={pending}>
        {pending ? "กำลังดำเนินการ…" : mode === "signup" ? "สมัครสมาชิก" : "ล็อกอิน"}
      </button>
    </form>
  );
}

export function LoginForms() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  return (
    <>
      <div className="mt-6 flex gap-2" aria-label="เลือกสมัครสมาชิกหรือล็อกอิน">
        {(["login", "signup"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`flex-1 rounded-lg border px-3 py-3 font-semibold ${mode === value ? "border-blue-800 bg-blue-50 text-blue-900" : "border-slate-300"}`}>
            {value === "login" ? "ล็อกอิน" : "สมัครสมาชิก"}
          </button>
        ))}
      </div>
      <AuthForm key={mode} mode={mode} />
    </>
  );
}
