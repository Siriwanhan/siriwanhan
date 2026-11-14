"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { databaseMessage, field, type WorkState } from "@/lib/work-validation";

export async function saveTeam(_previous: WorkState, form: FormData): Promise<WorkState> {
  const { supabase } = await requireUser();
  const intent = field(form, "intent");
  if (intent !== "create" && intent !== "join") return { ok: false, message: "คำขอไม่ถูกต้อง" };
  try {
    // RPC ตรวจว่ามีทีมแล้วก่อน รวมกรณีส่งคำขอข้ามหน้าจอ
    const result = intent === "create"
      ? await supabase.rpc("create_team", { team_name: field(form, "team_name") })
      : await supabase.rpc("join_team", { invite_code: field(form, "invite_code") });
    if (result.error) return { ok: false, message: databaseMessage(result.error) };
    revalidatePath("/team"); revalidatePath("/tasks");
    return { ok: true, message: intent === "create" ? "สร้างทีมสำเร็จ" : "เข้าร่วมทีมสำเร็จ" };
  } catch { return { ok: false, message: "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่" }; }
}
