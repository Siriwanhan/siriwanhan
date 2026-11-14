export const taskStatuses = ["todo", "in_progress", "done"] as const;
export type TaskStatus = typeof taskStatuses[number];
export type WorkState = { message: string; ok: boolean };
export const statusLabels: Record<TaskStatus, string> = {
  todo: "ยังไม่เริ่ม", in_progress: "กำลังทำ", done: "เสร็จแล้ว",
};
export function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function isTaskStatus(value: string): value is TaskStatus {
  return taskStatuses.some(status => status === value);
}
export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateTask(form: FormData) {
  const title = field(form, "title");
  const description = field(form, "description");
  const assigneeId = field(form, "assignee_id");
  const dueDate = field(form, "due_date");
  if (!title) return { error: "กรุณากรอกชื่องาน" } as const;
  if (Array.from(title).length > 200) return { error: "ชื่องานต้องไม่เกิน 200 ตัวอักษร" } as const;
  if (!isUuid(assigneeId)) return { error: "กรุณาเลือกผู้รับงานจากสมาชิกในทีม" } as const;
  if (dueDate && !isDateOnly(dueDate)) return { error: "วันกำหนดส่งไม่ถูกต้อง" } as const;
  return { title, description: description || null, assigneeId, dueDate: dueDate || null } as const;
}
export function bangkokToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function isOverdue(dueDate: string | null, status: TaskStatus, today = bangkokToday()): boolean {
  return Boolean(dueDate && dueDate < today && status !== "done");
}
export function thaiDate(value: string | null): string {
  if (!value) return "ไม่มีกำหนด";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(`${value}T00:00:00+07:00`));
}
export function databaseMessage(error: { code?: string; message?: string }): string {
  const messages: Record<string, string> = {
    ALREADY_IN_TEAM: "คุณมีทีมอยู่แล้ว", TEAM_NAME_REQUIRED: "กรุณากรอกชื่อทีม",
    TEAM_NAME_TOO_LONG: "ชื่อทีมต้องไม่เกิน 100 ตัวอักษร", TEAM_NOT_FOUND: "ไม่พบทีมจากรหัสนี้",
    PROFILE_REQUIRED: "ยังไม่พบข้อมูลผู้ใช้ กรุณารันไฟล์ SQL ของ US-1",
    TASK_TITLE_REQUIRED: "กรุณากรอกชื่องาน", ONLY_STATUS_ALLOWED: "คุณแก้ได้เฉพาะสถานะของงานนี้",
    CANNOT_CHANGE_OWNER: "ไม่สามารถเปลี่ยนทีมและเจ้าของข้อมูลของงานได้",
    TASK_CREATE_FORBIDDEN: "เฉพาะหัวหน้าทีมเท่านั้นที่สร้างงานได้",
    TASK_UPDATE_FORBIDDEN: "คุณไม่มีสิทธิ์แก้สถานะงานนี้", NOT_LOGGED_IN: "กรุณาล็อกอินใหม่",
  };
  if (error.message && messages[error.message]) return messages[error.message];
  if (error.code === "23503") return "ผู้รับงานต้องเป็นสมาชิกในทีมเดียวกัน";
  if (error.code === "42501") return "คุณไม่มีสิทธิ์ทำรายการนี้";
  if (["PGRST205", "PGRST202", "42P01"].includes(error.code ?? "")) return "ยังไม่พร้อมใช้งาน กรุณารันไฟล์ SQL ของ US-2 ถึง US-4 ตามลำดับ";
  return "บันทึกไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่";
}
