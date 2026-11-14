"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return <main className="mx-auto w-full max-w-lg px-4 py-10"><h1 className="text-xl font-bold">โหลดข้อมูลไม่สำเร็จ</h1><p className="mt-3">กรุณาตรวจการเชื่อมต่อแล้วลองใหม่</p><button type="button" onClick={retry} className="mt-4 rounded-lg bg-blue-800 px-4 py-3 text-white">ลองใหม่</button></main>;
}
