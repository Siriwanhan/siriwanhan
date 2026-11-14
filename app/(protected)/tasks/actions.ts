"use server";
import { revalidatePath } from "next/cache";
import { getTeamContext } from "@/lib/team";
import { databaseMessage, field, isTaskStatus, isUuid, validateTask, type WorkState } from "@/lib/work-validation";

export async function createTask(_previous: WorkState, form: FormData): Promise<WorkState> {
  const { user, supabase, team, message } = await getTeamContext();
  if (message) return { ok: false, message };
  if (!team) return { ok: false, message: "กรุณาสร้างหรือเข้าร่วมทีมก่อน" };
  if (team.leader_id !== user.id) return { ok: false, message: "เฉพาะหัวหน้าทีมเท่านั้นที่สร้างงานได้" };
  const input = validateTask(form);
  if (input.error !== undefined) return { ok: false, message: input.error };
  try {
    // ตรวจสมาชิกตอนบันทึก และมี composite FK ตรวจซ้ำในฐานข้อมูล
    const { data: assignee, error: memberError } = await supabase.from("team_members")
      .select("user_id").eq("team_id", team.id).eq("user_id", input.assigneeId).maybeSingle();
    if (memberError) return { ok: false, message: databaseMessage(memberError) };
    if (!assignee) return { ok: false, message: "ผู้รับงานต้องเป็นสมาชิกในทีมเดียวกัน" };
    const { error } = await supabase.from("tasks").insert({
      team_id: team.id, created_by: user.id, title: input.title,
      description: input.description, due_date: input.dueDate,
      assignee_id: input.assigneeId, status: "todo",
    });
    if (error) return { ok: false, message: databaseMessage(error) };
    revalidatePath("/tasks"); revalidatePath("/my");
    return { ok: true, message: "สร้างงานสำเร็จ" };
  } catch { return { ok: false, message: "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่" }; }
}

export async function updateStatus(_previous: WorkState, form: FormData): Promise<WorkState> {
  const { user, supabase, team, message } = await getTeamContext();
  if (message) return { ok: false, message };
  if (!team) return { ok: false, message: "กรุณาสร้างหรือเข้าร่วมทีมก่อน" };
  const id = field(form, "task_id");
  const status = field(form, "status");
  if (!isUuid(id) || !isTaskStatus(status)) return { ok: false, message: "ข้อมูลงานหรือสถานะไม่ถูกต้อง" };
  try {
    const { data: task, error: readError } = await supabase.from("tasks")
      .select("id, assignee_id").eq("id", id).eq("team_id", team.id).maybeSingle();
    if (readError) return { ok: false, message: databaseMessage(readError) };
    if (!task || (team.leader_id !== user.id && task.assignee_id !== user.id)) {
      return { ok: false, message: "คุณไม่มีสิทธิ์แก้สถานะงานนี้" };
    }
    // ไม่กระจายค่าจาก FormData ลงงาน รับเฉพาะ status ที่ตรวจแล้ว
    const { data, error } = await supabase.from("tasks").update({ status })
      .eq("id", id).eq("team_id", team.id).select("id").maybeSingle();
    if (error) return { ok: false, message: databaseMessage(error) };
    if (!data) return { ok: false, message: "ไม่พบข้อมูลหรือไม่มีสิทธิ์แก้สถานะงานนี้" };
    revalidatePath("/tasks"); revalidatePath("/my");
    return { ok: true, message: "บันทึกสถานะแล้ว" };
  } catch { return { ok: false, message: "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่" }; }
}
