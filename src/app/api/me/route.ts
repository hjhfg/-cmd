import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { COOKIE, getUser, unreadTotal, userInfo } from "@/lib/user";
import { ALL_TAGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function payload() {
  const u = await getUser();
  return Response.json({ user: await userInfo(u), unread: await unreadTotal(u.id) });
}

function failure(error: unknown) {
  console.error("[api/me]", error);
  return Response.json({ error: "服务暂时不可用，请重试" }, { status: 503 });
}

export async function GET() {
  try {
    return await payload();
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return await patch(req);
  } catch (error) {
    return failure(error);
  }
}

async function patch(req: NextRequest) {
  const u = await getUser();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<typeof users.$inferInsert> = {};
  if (typeof b.nickname === "string" && b.nickname.trim()) patch.nickname = b.nickname.trim().slice(0, 20);
  if (typeof b.bio === "string") patch.bio = b.bio.slice(0, 80);
  if (typeof b.gender === "string") patch.gender = b.gender.slice(0, 4);
  if (typeof b.avatar === "string" && b.avatar.length < 600_000) patch.avatar = b.avatar;
  if (Array.isArray(b.interests)) {
    patch.interests = b.interests.map(String).filter((t) => ALL_TAGS.includes(t)).slice(0, 24);
  }
  // Ignore the legacy onboarding flag: local users must never be sent back
  // through a first-run gender or interest selection flow.
  patch.onboarded = true;
  if (Object.keys(patch).length) await db.update(users).set(patch).where(eq(users.id, u.id));
  return payload();
}

export async function DELETE() {
  (await cookies()).delete(COOKIE);
  return Response.json({ ok: true });
}
