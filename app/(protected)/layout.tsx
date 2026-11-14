import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/app/login/logout-button";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/team" className="font-bold text-blue-900">ระบบติดตามงานทีม</Link>
          <nav aria-label="เมนูหลัก" className="flex gap-4 text-sm text-blue-800"><Link href="/team" className="underline">ทีมของฉัน</Link><Link href="/tasks" className="underline">งานของทีม</Link></nav>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{profile?.display_name ?? "ผู้ใช้"}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        {!profile && <p role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">ยังอ่านชื่อผู้ใช้ไม่ได้ กรุณารันไฟล์ SQL ของ US-1 ใน Supabase แล้วรีเฟรชหน้า</p>}
        {children}
      </main>
    </>
  );
}
