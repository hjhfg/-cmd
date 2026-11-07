import { NextRequest } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, characters, stories, notifications } from "@/db/schema";
import { getUser } from "@/lib/user";
import { deleteConv, lite } from "@/lib/conversation";
import { proactiveMessage } from "@/lib/ai";
import type { ConvListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getUser();
  let convs = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, u.id))
    .orderBy(desc(conversations.pinned), desc(conversations.lastAt));

  const charIds = convs.filter((c) => c.targetType === "character").map((c) => c.targetId);
  const storyIds = convs.filter((c) => c.targetType === "story").map((c) => c.targetId);
  const chars = charIds.length ? await db.select().from(characters).where(inArray(characters.id, charIds)) : [];
  const sts = storyIds.length ? await db.select().from(stories).where(inArray(stories.id, storyIds)) : [];

  // AI 角色不定期主动发来消息
  const now = Date.now();
  const candidate = convs.find(
    (c) =>
      c.targetType === "character" &&
      now - new Date(c.lastAt).getTime() > 20 * 60_000 &&
      (!c.proactiveAt || now - new Date(c.proactiveAt).getTime() > 6 * 3600_000),
  );
  if (candidate) {
    const ch = chars.find((c) => c.id === candidate.targetId);
    if (ch) {
      const text = proactiveMessage(lite(ch));
      await db.insert(messages).values({ conversationId: candidate.id, role: "character", speaker: ch.name, characterId: ch.id, content: text });
      await db
        .update(conversations)
        .set({ unread: sql`${conversations.unread} + 1`, lastMessage: text, lastAt: new Date(), proactiveAt: new Date() })
        .where(eq(conversations.id, candidate.id));
      convs = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, u.id))
        .orderBy(desc(conversations.pinned), desc(conversations.lastAt));
    }
  }

  const items: ConvListItem[] = [];
  for (const c of convs) {
    if (c.targetType === "character") {
      const ch = chars.find((x) => x.id === c.targetId);
      if (!ch) continue;
      items.push({ id: c.id, type: "character", targetId: ch.id, title: ch.name, avatar: ch.avatar || ch.cover, avatarFocus: ch.avatarFocus, lastMessage: c.lastMessage, lastAt: new Date(c.lastAt).toISOString(), unread: c.unread, pinned: c.pinned });
    } else {
      const st = sts.find((x) => x.id === c.targetId);
      if (!st) continue;
      items.push({ id: c.id, type: "story", targetId: st.id, title: st.title, avatar: st.cover, avatarFocus: "50% 30% 1.3", lastMessage: c.lastMessage, lastAt: new Date(c.lastAt).toISOString(), unread: c.unread, pinned: c.pinned });
    }
  }

  const [nu] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, u.id), eq(notifications.isRead, false)));
  const [latest] = await db.select().from(notifications).where(eq(notifications.userId, u.id)).orderBy(desc(notifications.createdAt)).limit(1);

  return Response.json({
    items,
    notiUnread: Number(nu?.n ?? 0),
    notiPreview: latest ? `${latest.fromName}：${latest.title}` : "点击查看互动消息",
  });
}

export async function PATCH(req: NextRequest) {
  const u = await getUser();
  const b = (await req.json().catch(() => ({}))) as { id?: number; pinned?: boolean };
  const id = Number(b.id);
  if (typeof b.pinned === "boolean") {
    await db.update(conversations).set({ pinned: b.pinned }).where(and(eq(conversations.id, id), eq(conversations.userId, u.id)));
  }
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const u = await getUser();
  const id = Number(req.nextUrl.searchParams.get("id"));
  const [c] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, u.id))).limit(1);
  if (c) await deleteConv(c.id);
  return Response.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const u = await getUser();
  const b = (await req.json().catch(() => ({}))) as { action?: string };
  if (b.action === "clearAll") {
    const rows = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, u.id));
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      await db.delete(messages).where(inArray(messages.conversationId, ids));
      await db.delete(conversations).where(inArray(conversations.id, ids));
    }
    return Response.json({ ok: true });
  }
  return Response.json({ error: "未知操作" }, { status: 400 });
}
