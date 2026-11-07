import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { characters, stories, conversations, messages, likes, comments } from "@/db/schema";
import { getUser } from "@/lib/user";
import { getWorkDetail } from "@/lib/works";
import { ALL_TAGS, VOICES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ type: string; id: string }> };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { type, id } = await params;
  if (type !== "character" && type !== "story") return Response.json({ error: "作品不存在" }, { status: 404 });
  const u = await getUser();
  const item = await getWorkDetail(type, Number(id), u);
  if (!item) return Response.json({ error: "作品不存在或已设为私密" }, { status: 404 });
  return Response.json({ item });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { type, id } = await params;
  const u = await getUser();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const wid = Number(id);
  if (type === "character") {
    const [c] = await db.select().from(characters).where(eq(characters.id, wid)).limit(1);
    if (!c || c.creatorId !== u.id) return Response.json({ error: "无权限操作" }, { status: 403 });
    const patch: Partial<typeof characters.$inferInsert> = {};
    if (typeof b.isPublic === "boolean") patch.isPublic = b.isPublic;
    const name = str(b.name, 12);
    if (name) patch.name = name;
    const setting = str(b.setting, 2000);
    if (setting) patch.setting = setting;
    const greeting = str(b.greeting, 500);
    if (greeting) patch.greeting = greeting;
    const intro = str(b.intro, 500);
    if (intro !== undefined) patch.intro = intro;
    if (typeof b.voice === "string" && VOICES.some((v) => v.id === b.voice)) patch.voice = b.voice;
    if (typeof b.gender === "string" && ["男", "女", "其他"].includes(b.gender)) patch.gender = b.gender;
    if (Array.isArray(b.tags)) patch.tags = b.tags.map(String).filter((t) => ALL_TAGS.includes(t)).slice(0, 3);
    if (typeof b.cover === "string" && (b.cover.startsWith("/images/") || (b.cover.startsWith("data:image/") && b.cover.length < 900_000))) {
      patch.cover = b.cover;
      patch.avatar = b.cover;
      patch.avatarFocus = str(b.avatarFocus, 30) || (b.cover.startsWith("data:") ? "cover" : "50% 26% 2");
    }
    if (Object.keys(patch).length) await db.update(characters).set(patch).where(eq(characters.id, wid));
    return Response.json({ ok: true });
  }
  if (type === "story") {
    const [s] = await db.select().from(stories).where(eq(stories.id, wid)).limit(1);
    if (!s || s.creatorId !== u.id) return Response.json({ error: "无权限操作" }, { status: 403 });
    const patch: Partial<typeof stories.$inferInsert> = {};
    if (typeof b.isPublic === "boolean") patch.isPublic = b.isPublic;
    const title = str(b.title, 20);
    if (title) patch.title = title;
    const intro = str(b.intro, 500);
    if (intro !== undefined) patch.intro = intro;
    if (Object.keys(patch).length) await db.update(stories).set(patch).where(eq(stories.id, wid));
    return Response.json({ ok: true });
  }
  return Response.json({ error: "作品不存在" }, { status: 404 });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { type, id } = await params;
  const u = await getUser();
  const wid = Number(id);
  if (type === "character") {
    const [c] = await db.select().from(characters).where(eq(characters.id, wid)).limit(1);
    if (!c || c.creatorId !== u.id) return Response.json({ error: "无权限操作" }, { status: 403 });
    await db.delete(characters).where(eq(characters.id, wid));
  } else if (type === "story") {
    const [s] = await db.select().from(stories).where(eq(stories.id, wid)).limit(1);
    if (!s || s.creatorId !== u.id) return Response.json({ error: "无权限操作" }, { status: 403 });
    await db.delete(stories).where(eq(stories.id, wid));
  } else {
    return Response.json({ error: "作品不存在" }, { status: 404 });
  }
  const convs = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.targetType, type), eq(conversations.targetId, wid)));
  if (convs.length) {
    const ids = convs.map((c) => c.id);
    await db.delete(messages).where(inArray(messages.conversationId, ids));
    await db.delete(conversations).where(inArray(conversations.id, ids));
  }
  await db.delete(likes).where(and(eq(likes.targetType, type), eq(likes.targetId, wid)));
  await db.delete(comments).where(and(eq(comments.targetType, type), eq(comments.targetId, wid)));
  return Response.json({ ok: true });
}
