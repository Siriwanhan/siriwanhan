import { requireUser } from "@/lib/auth";

export default async function MyPage() {
  await requireUser();
  return <section><h1 className="text-2xl font-bold text-blue-900">งานของฉัน</h1><p role="status" className="mt-3">หน้านี้เตรียมไว้ตรวจสิทธิ์ US-1 รายการงานของฉันจะเพิ่มใน US-5</p></section>;
}
