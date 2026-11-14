import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { LoginForms } from "./auth-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (hasSupabaseEnv) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/team");
  }
  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <Link href="/" className="text-sm text-blue-800 underline">หน้าหลัก</Link>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-blue-900">ระบบติดตามงานทีม</h1>
        <p className="mt-2 text-sm text-slate-600">เข้าสู่ระบบ หรือสมัครเพื่อเริ่มทำงานร่วมกับทีม</p>
        {hasSupabaseEnv ? <LoginForms /> : <p role="status" className="mt-6 rounded-lg bg-amber-50 p-4">ยังไม่ได้ตั้งค่าเชื่อมต่อ Supabase กรุณาตั้งค่าใน .env.local แล้วเปิดเว็บใหม่</p>}
      </section>
    </main>
  );
}
