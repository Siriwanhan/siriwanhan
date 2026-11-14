export type AuthState = { message: string };

export function validateAuthInput(form: FormData) {
  const intent = form.get("intent");
  const email = typeof form.get("email") === "string"
    ? (form.get("email") as string).trim().toLowerCase() : "";
  const password = typeof form.get("password") === "string"
    ? form.get("password") as string : "";
  const name = typeof form.get("display_name") === "string"
    ? (form.get("display_name") as string).trim() : "";

  if (intent !== "login" && intent !== "signup") {
    return { error: "คำขอไม่ถูกต้อง กรุณาลองใหม่" } as const;
  }
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "กรุณากรอกอีเมลให้ถูกต้อง" } as const;
  }
  if (!password && intent === "login") {
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" } as const;
  }
  if (intent === "signup" && password.length < 6) {
    return { error: "กรุณากรอกรหัสผ่านอย่างน้อย 6 ตัวอักษร" } as const;
  }
  if (intent === "signup" && (!name || Array.from(name).length > 100)) {
    return { error: "กรุณากรอกชื่อที่แสดง 1–100 ตัวอักษร" } as const;
  }
  return { intent, email, password, name } as const;
}
