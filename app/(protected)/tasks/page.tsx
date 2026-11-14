import { redirect } from "next/navigation";
import { getTeamContext, getTeamMembers } from "@/lib/team";
import { bangkokToday, isOverdue, statusLabels, taskStatuses, thaiDate, type TaskStatus } from "@/lib/work-validation";
import { CreateTaskForm, StatusForm } from "./task-forms";

type Task = { id: string; title: string; description: string | null; assignee_id: string; status: TaskStatus; due_date: string | null };

export default async function TasksPage() {
  const { user, supabase, team, message } = await getTeamContext();
  if (message) return <p role="alert" className="rounded-xl bg-amber-50 p-4">{message}</p>;
  if (!team) redirect("/team");
  const [memberResult, taskResult] = await Promise.all([
    getTeamMembers(supabase, team.id),
    supabase.from("tasks").select("id, title, description, assignee_id, status, due_date")
      .eq("team_id", team.id).order("created_at", { ascending: false }),
  ]);
  if (memberResult.message || taskResult.error) return <p role="alert" className="rounded-xl bg-amber-50 p-4">{memberResult.message || "โหลดงานไม่สำเร็จ กรุณาตรวจว่าได้รันไฟล์ SQL ของ US-3 และ US-4 แล้ว"}</p>;
  const tasks = (taskResult.data ?? []) as Task[];
  const leader = team.leader_id === user.id;
  const today = bangkokToday();
  const names = new Map(memberResult.members.map(member => [member.id, member.display_name]));
  return (
    <section>
      <h1 className="text-2xl font-bold text-blue-900">งานของทีม</h1>
      <p className="mt-2 break-words text-slate-600">{team.name}</p>
      {leader && <CreateTaskForm members={memberResult.members} />}
      {tasks.length === 0 && <p role="status" className="mt-6 rounded-xl border border-slate-200 bg-white p-5">ยังไม่มีงานในทีม</p>}
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">
        {taskStatuses.map(status => (
          <section key={status} className="min-w-0 rounded-2xl bg-slate-100 p-3" aria-label={statusLabels[status]}>
            <h2 className="px-1 py-2 font-bold text-blue-900">{statusLabels[status]} <span className="text-sm text-slate-500">({tasks.filter(task => task.status === status).length})</span></h2>
            {tasks.filter(task => task.status === status).map(task => (
              <article key={task.id} className="mt-3 min-w-0 break-words rounded-xl border border-slate-200 bg-white p-4 [overflow-wrap:anywhere]">
                <h3 className="font-bold">{task.title}</h3>
                {task.description && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{task.description}</p>}
                <p className="mt-3 text-sm">ผู้รับงาน: {names.get(task.assignee_id) ?? "สมาชิกทีม"}</p>
                <p className="mt-2 text-sm">กำหนดส่ง: {thaiDate(task.due_date)}</p>
                {isOverdue(task.due_date, task.status, today) && <p className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">เลยกำหนด</p>}
                {(leader || task.assignee_id === user.id) && <StatusForm taskId={task.id} status={task.status} title={task.title} />}
              </article>
            ))}
            {!tasks.some(task => task.status === status) && <p className="px-1 py-4 text-sm text-slate-500">ไม่มีงานในสถานะนี้</p>}
          </section>
        ))}
      </div>
    </section>
  );
}
