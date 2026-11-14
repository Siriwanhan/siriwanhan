"use client";
import { useActionState } from "react";
import { saveTeam } from "./actions";

function TeamForm({ intent }: { intent: "create" | "join" }) {
  const [state, action, pending] = useActionState(saveTeam, { ok: false, message: "" });
  const create = intent === "create";
  return (
    <form action={action} className="rounded-2xl border border-slate-200 bg-white p-6" aria-busy={pending}>
      <h2 className="text-xl font-bold text-blue-900">{create ? "สร้างทีม" : "เข้าร่วมทีม"}</h2>
      <input type="hidden" name="intent" value={intent} />
      <label className="mt-4 block font-medium" htmlFor={intent}>{create ? "ชื่อทีม" : "รหัสเชิญ"}</label>
      <input className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3" id={intent} name={create ? "team_name" : "invite_code"} maxLength={create ? 100 : 6} autoComplete="off" aria-describedby={`${intent}-message`} />
      <p id={`${intent}-message`} role="status" className={`mt-3 min-h-6 text-sm ${state.ok ? "text-emerald-800" : "text-red-700"}`}>{state.message}</p>
      <button type="submit" disabled={pending} className="mt-3 rounded-lg bg-blue-800 px-5 py-3 font-semibold text-white disabled:opacity-60">{pending ? "กำลังบันทึก…" : create ? "สร้างทีม" : "เข้าร่วมทีม"}</button>
    </form>
  );
}
export function TeamForms() {
  return <div className="mt-6 grid gap-5 sm:grid-cols-2"><TeamForm intent="create" /><TeamForm intent="join" /></div>;
}
