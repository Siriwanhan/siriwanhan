"use client";
import { useActionState } from "react";
import type { TeamMember } from "@/lib/team";
import { statusLabels, taskStatuses, type TaskStatus } from "@/lib/work-validation";
import { createTask, updateStatus } from "./actions";

const fieldClass = "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
const buttonClass = "rounded-lg bg-blue-800 px-4 py-2 font-semibold text-white disabled:opacity-60";

export function CreateTaskForm({ members }: { members: TeamMember[] }) {
  const [state, action, pending] = useActionState(createTask, { ok: false, message: "" });
  return (
    <form action={action} aria-busy={pending} className="mt-6 rounded-2xl border border-blue-200 bg-white p-5">
      <h2 className="text-lg font-bold text-blue-900">สร้างงานและมอบหมาย</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">ชื่องาน (บังคับ)<input className={fieldClass} name="title" maxLength={200} /></label>
        <label className="block sm:col-span-2">รายละเอียด (ไม่บังคับ)<textarea className={fieldClass} name="description" rows={3} /></label>
        <label className="block">ผู้รับงาน<select className={fieldClass} name="assignee_id" defaultValue="" required><option value="" disabled>เลือกสมาชิกในทีม</option>{members.map(member => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label>
        <label className="block">วันกำหนดส่ง (ไม่บังคับ)<input className={fieldClass} type="date" name="due_date" /></label>
      </div>
      <p role="status" className={`my-3 text-sm ${state.ok ? "text-emerald-800" : "text-red-700"}`}>{state.message}</p>
      <button className={buttonClass} type="submit" disabled={pending || members.length === 0}>{pending ? "กำลังสร้างงาน…" : "สร้างงาน"}</button>
    </form>
  );
}

export function StatusForm({ taskId, status, title }: { taskId: string; status: TaskStatus; title: string }) {
  const [state, action, pending] = useActionState(updateStatus, { ok: false, message: "" });
  return (
    <form action={action} aria-busy={pending} className="mt-4 border-t border-slate-200 pt-3">
      <input type="hidden" name="task_id" value={taskId} />
      <label className="block text-sm">สถานะงาน: {title}<select className={fieldClass} name="status" defaultValue={status} key={status} disabled={pending}>{taskStatuses.map(value => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
      <button className={`${buttonClass} mt-3 w-full text-sm`} type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกสถานะ"}</button>
      <p role="status" className={`mt-2 text-sm ${state.ok ? "text-emerald-800" : "text-red-700"}`}>{state.message}</p>
    </form>
  );
}
