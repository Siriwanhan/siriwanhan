import { cache } from "react";
import { requireUser } from "@/lib/auth";
export type Team = { id: string; name: string; invite_code: string; leader_id: string };
export type TeamMember = { id: string; display_name: string };

export const getTeamContext = cache(async () => {
  const auth = await requireUser();
  const { data: membership, error } = await auth.supabase.from("team_members")
    .select("team_id").eq("user_id", auth.user.id).maybeSingle();
  if (error) return { ...auth, team: null, message: "โหลดข้อมูลทีมไม่ได้ กรุณาตรวจว่าได้รันไฟล์ SQL ของ US-2 แล้ว" };
  if (!membership) return { ...auth, team: null, message: "" };
  const { data: team, error: teamError } = await auth.supabase.from("teams")
    .select("id, name, invite_code, leader_id").eq("id", membership.team_id).maybeSingle();
  if (teamError || !team) return { ...auth, team: null, message: "โหลดข้อมูลทีมไม่สำเร็จ กรุณาลองใหม่" };
  return { ...auth, team: team as Team, message: "" };
});

export async function getTeamMembers(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], teamId: string) {
  const { data: memberships, error } = await supabase.from("team_members")
    .select("user_id").eq("team_id", teamId).order("joined_at");
  if (error || !memberships?.length) return { members: [] as TeamMember[], message: "โหลดรายชื่อสมาชิกไม่สำเร็จ กรุณาลองใหม่" };
  const ids = memberships.map(member => member.user_id as string);
  const { data: profiles, error: profileError } = await supabase.from("profiles")
    .select("id, display_name").in("id", ids);
  if (profileError || profiles?.length !== ids.length) return { members: [] as TeamMember[], message: "โหลดชื่อสมาชิกไม่สำเร็จ กรุณาลองใหม่" };
  return { members: ids.map(id => profiles.find(profile => profile.id === id) as TeamMember), message: "" };
}
