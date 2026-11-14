import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// cache ของ React นี้ใช้เฉพาะคำขอเดียว ไม่แชร์บัญชีระหว่างผู้ใช้
export const requireUser = cache(async () => {
  if (!hasSupabaseEnv) redirect("/login");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { user, supabase };
});
