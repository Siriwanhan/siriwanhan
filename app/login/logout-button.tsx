"use client";

import { useActionState } from "react";
import { logout } from "./actions";

export function LogoutButton() {
  const [state, action, pending] = useActionState(logout, { message: "" });
  return (
    <form action={action}>
      <button type="submit" disabled={pending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-60">
        {pending ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
      </button>
      <p role="status" className="mt-1 text-sm text-red-700">{state.message}</p>
    </form>
  );
}
