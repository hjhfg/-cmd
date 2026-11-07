import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getUser } from "@/lib/user";
import type { NotificationInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUser();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, u.id)).orderBy(desc(notifications.createdAt)).limit(100);
  const items: NotificationInfo[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    content: n.content,
    fromName: n.fromName,
    fromAvatar: n.fromAvatar,
    targetType: n.targetType,
    targetId: n.targetId,
    isRead: n.isRead,
    createdAt: new Date(n.createdAt).toISOString(),
  }));
  return Response.json({ items });
}

export async function POST() {
  const u = await getUser();
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, u.id));
  return Response.json({ ok: true });
}
