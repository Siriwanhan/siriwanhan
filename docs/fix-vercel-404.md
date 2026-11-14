# ตรวจและแก้ Vercel Ready แต่หน้าเว็บเป็น 404

## หลักฐานและสาเหตุที่คาด

- โค้ดมี `app/page.tsx` และ `app/login/page.tsx` และผ่าน `npm run build` ในเครื่อง
- ตรวจเว็บ Production พบ `/login` ตอบ HTTP 404 พร้อม `x-vercel-error: NOT_FOUND` แต่ `/next.svg` ตอบ HTTP 200
- หลักฐานนี้ชี้ไปที่การเผยแพร่เฉพาะไฟล์สาธารณะ หรือการตั้งค่า build/output ผิดชนิด มากกว่าปัญหาสมัครสมาชิกหรือสิทธิ์ฐานข้อมูล ยังไม่ได้เห็นการตั้งค่า Dashboard หรือ Build Logs จึงไม่ยืนยันว่าค่ารายการใดตั้งผิดแน่นอน
- Ready หมายถึงกระบวนการเผยแพร่เสร็จ แต่ไม่ได้รับรองว่า route ของแอปถูกสร้างครบ ถ้าใช้ Framework Preset เป็น Other หรือ Output Directory เป็น public ไฟล์รูปอาจเปิดได้ แต่หน้า Next.js ที่ต้องทำงานฝั่ง server ไม่มีตัวประมวลผลรองรับ

## สิ่งที่แก้ใน repository

`vercel.json` ที่ราก repository กำหนด Framework เป็น Next.js, Build Command เป็น `npm run build` และ Output Directory เป็น `.next` เพื่อ override ค่าที่อาจตกค้างใน Dashboard ไม่เพิ่ม rewrite ไป index.html เพราะแอปนี้ใช้การจัดการเส้นทางของ Next.js

## สิ่งที่ผู้ใช้ทำใน Vercel

1. โปรเจกต์ siriwanhan → Settings → Build and Deployment ตรวจ Root Directory ให้เป็นราก repository (`./` หรือเว้นว่าง) ซึ่งมี package.json, app และ vercel.json อยู่ด้วยกัน ไม่มีโฟลเดอร์ siriwanhan ซ้อนใน GitHub
2. ตรวจ Environment Variables ของ Production ให้มี `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` โดยไม่ส่งค่าจริงในแชท
3. เปิด Deployments เลือก deployment ของ commit ที่เพิ่ม vercel.json หาก GitHub integration เริ่ม build ใหม่อัตโนมัติ ให้รอรายการใหม่นี้ หากยังไม่เริ่ม ให้สร้าง deployment จาก main ล่าสุด อย่า Redeploy รายการเก่าที่ใช้ commit ก่อนแก้ เพราะจะไม่ได้ vercel.json
4. ตรวจ Build Logs ว่ามีการ build Next.js และมี route `/`, `/login`, `/team`, `/tasks`, `/my` ก่อนสถานะ Ready
5. เปิดลิงก์ deployment ใหม่นั้นก่อน แล้วจึงตรวจโดเมน Production ถ้า deployment ใหม่ใช้ได้แต่โดเมนเดิมยังเป็น 404 ให้ตรวจว่าโดเมนผูกกับ deployment ใหม่

## วิธีทดสอบหลัง deploy

- `/login` เปิดฟอร์มล็อกอิน/สมัครได้ ไม่ใช่หน้า NOT_FOUND ของ Vercel
- ยังไม่ล็อกอินเปิด `/team` หรือ `/tasks` ต้องไป `/login` และไม่มีข้อมูลบัญชีอื่น
- ล็อกอิน เปิดทีม ดูกระดานงาน แล้วออกจากระบบได้
- หากยัง 404 ให้ส่งภาพหน้า Build and Deployment และ Build Logs ของ commit ใหม่ ไม่ต้องแก้ RLS หรือสร้างหน้า index.html เพิ่ม
- ผลการ build ในเครื่องยืนยันโค้ด Next.js ได้ แต่ไม่ได้ยืนยันผลของ Vercel builder หรือการตั้งค่าบัญชี ต้องทดสอบ URL จริงหลัง deploy อีกครั้ง

## ทางเลือกและการป้องกัน

- เปลี่ยน Framework Preset เป็น Next.js และใช้ค่า build/output เริ่มต้นผ่าน Dashboard ก็ได้ แต่การเก็บ vercel.json ทำให้ค่าหลักติดไปกับโค้ดและตรวจทานได้
- static export ไม่เหมาะกับแอปนี้ เพราะใช้ session, cookies และ Server Actions สำหรับข้อมูลรายบัญชี
- กฎแนะนำสำหรับงานครั้งถัดไป: หลัง deploy ตรวจ `/login` และการ redirect ผู้ไม่ล็อกอินบน URL จริงทุกครั้ง ไม่ใช้สถานะ Ready เพียงอย่างเดียวตัดสินว่าผ่าน

อ้างอิง: [Vercel 404 troubleshooting](https://vercel.com/kb/guide/why-is-my-deployed-project-giving-404), [vercel.json configuration](https://vercel.com/docs/project-configuration/vercel-json)
