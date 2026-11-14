import Link from "next/link";
import { getTeamContext, getTeamMembers } from "@/lib/team";
import { TeamForms } from "./team-forms";

export default async function TeamPage() {
  const { user, supabase, team, message } = await getTeamContext();
  if (message) return <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4">{message}</p>;
  if (!team) return <section><h1 className="text-2xl font-bold text-blue-900">เริ่มทำงานกับทีม</h1><p className="mt-2 text-slate-600">คุณยังไม่มีทีม สร้างทีมใหม่หรือใช้รหัสเชิญจากเพื่อนเพื่อเข้าร่วมได้</p><TeamForms /></section>;
  const { members, message: memberMessage } = await getTeamMembers(supabase, team.id);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="break-words text-2xl font-bold text-blue-900">{team.name}</h1>
      <p className="mt-4">รหัสเชิญ: <span className="rounded-lg bg-blue-50 px-3 py-2 font-mono text-xl font-bold tracking-widest text-blue-900">{team.invite_code}</span></p>
      <p className="mt-4 text-sm text-slate-600">ทุกคนในทีมใช้รหัสนี้ชวนเพื่อนได้ คุณอยู่ได้ 1 ทีม</p>
      <h2 className="mt-7 text-lg font-bold">สมาชิกทีม</h2>
      {memberMessage ? <p role="alert" className="mt-3 text-red-700">{memberMessage}</p> : <ul className="mt-3 divide-y divide-slate-200">
        {members.map(member => <li key={member.id} className="flex flex-wrap justify-between gap-2 py-3"><span className="min-w-0 break-words">{member.display_name}{member.id === user.id ? " (คุณ)" : ""}</span><span className="text-sm text-slate-600">{member.id === team.leader_id ? "หัวหน้า" : "สมาชิก"}</span></li>)}
      </ul>}
      <Link href="/tasks" className="mt-6 inline-block rounded-lg bg-blue-800 px-5 py-3 font-semibold text-white">ดูงานของทีม</Link>
    </section>
  );
}
