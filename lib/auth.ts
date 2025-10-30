// ==========================================================
// FILE: src/lib/auth.ts
// DESCRIPTION: Provides a safe server-side helper to access
// the authenticated NextAuth session anywhere in the app.
// ==========================================================

import { getServerSession } from "next-auth";
import { authConfig } from "./auth.config"; // 👈 تأكد أن الملف موجود في نفس المجلد

/**
 * دالة auth()
 * -------------------------
 * تُستخدم داخل API routes أو server components
 * لجلب الجلسة الحالية للمستخدم بشكل آمن.
 * 
 * مثال:
 *   const session = await auth();
 *   if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function auth() {
  try {
    const session = await getServerSession(authConfig);
    return session;
  } catch (error) {
    console.error("AUTH() FAILED:", error);
    throw error;
  }
}
