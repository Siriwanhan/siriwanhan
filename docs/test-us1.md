# วิธีเตรียมและทดสอบ US-1

ขอบเขต: AC-1.1–AC-1.5 ใน `requirements.md` การเลือกผู้รับงานเป็น US-3 ยังไม่ทำในรอบนี้

## เตรียม Supabase

1. เปิดโปรเจกต์ Supabase → SQL Editor → New query
2. คัดลอกเนื้อหาทั้งไฟล์ `supabase/migrations/20261114050000_us1_profiles.sql` → วาง → Run เพียงครั้งเดียว ไฟล์นี้สร้าง profiles, กฎ RLS และงานอัตโนมัติสร้างชื่อผู้ใช้ตอนสมัคร ถ้ามีตาราง profiles อยู่แล้วและรันไม่ได้ ให้หยุดและส่งเฉพาะข้อความข้อผิดพลาดกลับมา ไม่ลบตารางเดิม
3. ไป Authentication → Sign In / Providers → Email → ปิด Confirm email สำหรับ workshop แล้วบันทึก ตั้งรหัสผ่านขั้นต่ำ 6 ตัวอักษร การใช้งานจริงต้องเปิดยืนยันอีเมลกลับและตั้ง SMTP ตามแผน
4. ใช้ `.env.local` ที่ตั้งไว้ในโฟลเดอร์ `siriwanhan` ไม่ต้องเพิ่มตัวแปรใหม่ ไม่ส่งคีย์หรือรหัสผ่านในแชท
5. เปิด Terminal ใน `siriwanhan` รัน `npm run dev` แล้วเปิด http://localhost:3000/login หากเปิดเซิร์ฟเวอร์อยู่แล้วให้ใช้ตัวเดิม

## ทดสอบตามเกณฑ์

| เกณฑ์ | วิธีทำ | ผลที่ต้องได้ |
| --- | --- | --- |
| AC-1.1 | ที่ `/login` เลือกสมัครสมาชิก กรอกชื่อ อีเมลทดสอบที่ยังไม่เคยใช้ และรหัสผ่านอย่างน้อย 6 ตัวอักษร | เข้าสู่ `/team` ทันทีและเห็นชื่อที่กรอกในแถบบน; Table Editor → profiles มี id ตรงกับ Authentication → Users |
| AC-1.2 | ออกจากระบบ ลองล็อกอินด้วยอีเมลเดิมและรหัสผ่านผิด | เห็น “อีเมลหรือรหัสผ่านไม่ถูกต้อง” และยังอยู่ `/login` |
| AC-1.3 | ล็อกอินให้ถูก ตรวจชื่อที่แถบบน แล้วกดออกจากระบบ | กลับ `/login`; เปิด `/team` อีกครั้งยังต้องล็อกอิน |
| AC-1.4 | ล็อกอินแล้วปิด browser ตามปกติ เปิดใหม่ภายในวันเดียวกันและเข้า `/team` | ยังล็อกอินและเห็นชื่อเดิม ใช้ browser ปกติที่ไม่ล้าง cookie เมื่อปิด ไม่ใช้โหมดไม่ระบุตัวตนในการทดสอบข้อนี้ |
| AC-1.5 | ในหน้าต่างไม่ระบุตัวตนที่ยังไม่ล็อกอิน เปิด `/team`, `/tasks`, `/my` ทีละหน้า | ทุกหน้าพาไป `/login` ไม่มีชื่อหรือข้อมูลผู้ใช้เดิมแสดง |

## ทดสอบสิทธิ์ด้วยสองบัญชี

1. สมัคร A และ B ใน browser/session แยกกัน แต่ละบัญชีเห็นชื่อของตนเอง
2. ตรวจ RLS ด้วย SQL Editor โดยคัดลอก id ของ A/B จาก Authentication → Users มาแทน UUID ด้านล่าง แล้วรันเอง โค้ดจำลองบทบาทผู้ใช้ A โดยอ่านอย่างเดียวและจบด้วย rollback (ยกเลิกธุรกรรม) ต้องได้ `own_visible = true` และ `other_hidden = true` ไม่ต้องใช้คีย์หรือ token

```sql
begin;
select set_config('request.jwt.claim.sub', 'UUID_ของ_A', true);
set local role authenticated;
select
  (select count(*) = 1 from public.profiles where id = 'UUID_ของ_A'::uuid) as own_visible,
  (select count(*) = 0 from public.profiles where id = 'UUID_ของ_B'::uuid) as other_hidden;
select
  has_table_privilege(current_user, 'public.profiles', 'INSERT') as can_insert,
  has_table_privilege(current_user, 'public.profiles', 'UPDATE') as can_update,
  has_table_privilege(current_user, 'public.profiles', 'DELETE') as can_delete;
rollback;
```

3. `can_insert`, `can_update`, `can_delete` ต้องเป็น false ทั้งหมด สลับ id ใน `set_config` เป็น B แล้วสลับตัวกรอง A/B เพื่อทดสอบอีกด้าน หาก error ให้รัน `rollback;` ก่อนทำใหม่
4. การทดสอบนี้จำลอง role/บัญชีในฐานข้อมูล ไม่ใช่หลักฐานว่าทดสอบ HTTP API ด้วย session จริงแล้ว หน้าแอปอ่าน profile ฝั่ง server จึงไม่จำเป็นต้องมีคำขอ profiles ใน Network ของ browser
5. อย่าใช้ผลจาก Table Editor ตัดสิน RLS เพราะหน้า Dashboard มีสิทธิ์ผู้ดูแลและมองเห็นข้ามบัญชีได้ US-2 จะเพิ่มการเห็น profile ของเพื่อนร่วมทีมภายหลัง

## คำสั่งตรวจในเครื่องและข้อจำกัด

- `npm test`: ตรวจข้อมูลสมัคร/ล็อกอินและการไม่รับฟิลด์สวมรอยบัญชี ใช้ Node.js ที่รองรับการรัน TypeScript โดยตรง เช่นรุ่น 26 ที่ติดตั้งไว้
- `npm run lint`: ตรวจโค้ด; `npm run build`: ตรวจการสร้างเว็บจริง
- การทดสอบในเครื่องไม่ยืนยันว่า SQL ถูกนำไปใช้แล้ว ต้องรัน SQL และทำ AC ด้านบนกับ Supabase จริงโดยผู้ใช้ก่อนถือว่าผ่านครบ
- `/team`, `/tasks`, `/my` ในรอบนี้เป็นหน้ารองรับการล็อกอิน ยังไม่มีระบบสร้างทีม/งานหรือรายการงานจริง
- อ่านการเปลี่ยนแปลงใน Source Control แล้ว Commit ก่อนเริ่ม US-2
