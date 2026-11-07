import { NextRequest } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { characters, stories, likes, comments } from "@/db/schema";
import { getUser } from "@/lib/user";
import type { CommentInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

async function bump(type: string, id: number, field: "likeCount" | "shareCount" | "commentCount", delta: number): Promise<number> {
  if (type === "character") {
    const [r] = await db
      .update(characters)
      .set({ [field]: sql`greatest(${characters[field]} + ${delta}, 0)` })
      .where(eq(characters.id, id))
      .returning({ v: characters[field] });
    return r?.v ?? 0;
  }
  const [r] = await db
    .update(stories)
    .set({ [field]: sql`greatest(${stories[field]} + ${delta}, 0)` })
    .where(eq(stories.id, id))
    .returning({ v: stories[field] });
  return r?.v ?? 0;
}

export async function GET(req: NextRequest) {
  const u = await getUser();
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const id = Number(sp.get("id"));
  const rows = await db
    .select()
    .from(comments)
    .where(and(eq(comments.targetType, type), eq(comments.targetId, id)))
    .orderBy(desc(comments.createdAt))
    .limit(100);
  const list: CommentInfo[] = rows.map((c) => ({
    id: c.id,
    userName: c.userName,
    userAvatar: c.userAvatar,
    content: c.content,
    likeCount: c.likeCount,
    createdAt: new Date(c.createdAt).toISOString(),
    mine: c.userId === u.id,
  }));
  return Response.json({ comments: list });
}

export async function POST(req: NextRequest) {
  const u = await getUser();
  const b = (await req.json().catch(() => ({}))) as { action?: string; type?: string; id?: number; content?: string };
  const type = b.type === "story" ? "story" : "character";
  const id = Number(b.id);
  if (!Number.isFinite(id) || id <= 0) return Response.json({ error: "参数错误" }, { status: 400 });

  if (b.action === "like") {
    const [existing] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, u.id), eq(likes.targetType, type), eq(likes.targetId, id)))
      .limit(1);
    if (existing) {
      await db.delete(likes).where(eq(likes.id, existing.id));
      return Response.json({ liked: false, likeCount: await bump(type, id, "likeCount", -1) });
    }
    await db.insert(likes).values({ userId: u.id, targetType: type, targetId: id });
    return Response.json({ liked: true, likeCount: await bump(type, id, "likeCount", 1) });
  }

  if (b.action === "share") {
    return Response.json({ shareCount: await bump(type, id, "shareCount", 1) });
  }

  if (b.action === "comment") {
    const content = String(b.content ?? "").trim().slice(0, 300);
    if (!content) return Response.json({ error: "评论内容不能为空" }, { status: 400 });
    const [c] = await db
      .insert(comments)
      .values({ targetType: type, targetId: id, userId: u.id, userName: u.nickname, userAvatar: u.avatar, content })
      .returning();
    const commentCount = await bump(type, id, "commentCount", 1);
    const info: CommentInfo = {
      id: c.id,
      userName: c.userName,
      userAvatar: c.userAvatar,
      content: c.content,
      likeCount: 0,
      createdAt: new Date(c.createdAt).toISOString(),
      mine: true,
    };
    return Response.json({ comment: info, commentCount });
  }

  return Response.json({ error: "未知操作" }, { status: 400 });
}
