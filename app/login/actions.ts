"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { validateAuthInput, type AuthState } from "@/lib/auth-validation";

export async function authenticate(_previous: AuthState, form: FormData): Promise<AuthState> {
  if (!hasSupabaseEnv) return { message: "ยังไม่ได้ตั้งค่าเชื่อมต่อ Supabase" };
  const input = validateAuthInput(form);
  if (input.error !== undefined) return { message: input.error };

  try {
    const supabase = await createClient();
    if (input.intent === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: { data: { display_name: input.name } },
      });
      if (error) {
        if (error.code === "over_email_send_rate_limit" || error.status === 429) {
          return { message: "มีการสมัครหลายครั้ง กรุณารอสักครู่แล้วลองใหม่" };
        }
        return { message: "สมัครไม่สำเร็จ กรุณาตรวจข้อมูล และตรวจว่าได้รันไฟล์ SQL ของ US-1 แล้ว" };
      }
      if (!data.session) {
        return { message: "กรุณายืนยันอีเมลก่อนล็อกอิน สำหรับ workshop ให้ปิด Confirm email ใน Supabase แล้วลองล็อกอินอีกครั้ง" };
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: input.email, password: input.password,
      });
      if (error) return { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    }
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { message: "ยืนยันการล็อกอินไม่สำเร็จ กรุณาลองใหม่" };
  } catch {
    return { message: "เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง" };
  }
  revalidatePath("/", "layout");
  redirect("/team");
}

export async function logout(): Promise<AuthState> {
  try {
    const supabase = await createClient();
    // ตรวจบัญชีกับ Auth; signOut ยังล้าง session เก่าที่หมดอายุได้
    await supabase.auth.getUser();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { message: "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่" };
  } catch {
    return { message: "เชื่อมต่อระบบไม่ได้ กรุณาลองออกจากระบบอีกครั้ง" };
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
