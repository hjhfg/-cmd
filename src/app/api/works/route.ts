import { NextRequest } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { characters, stories, notifications, type OpeningLine, type ChapterDef } from "@/db/schema";
import { getUser } from "@/lib/user";
import { listWorks, type Scope } from "@/lib/works";
import { ALL_TAGS, NAME_COLORS, VOICES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const bad = (error: string) => Response.json({ error }, { status: 400 });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validImage = (v: unknown) =>
  typeof v === "string" && (v.startsWith("/images/") || (v.startsWith("data:image/") && v.length < 900_000)) ? v : "";

export async function GET(req: NextRequest) {
  const u = await getUser();
  const s = req.nextUrl.searchParams.get("scope");
  const scope: Scope = s === "mine" || s === "liked" || s === "chatted" || s === "pickable" ? s : "mine";
  const items = await listWorks(u, { scope, sort: scope === "pickable" ? "hot" : "new" });
  return Response.json({ items });
}

export async function POST(req: NextRequest) {
  const u = await getUser();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tags = Array.isArray(b.tags) ? b.tags.map(String).filter((t) => ALL_TAGS.includes(t)).slice(0, 3) : [];
  const isPublic = b.isPublic !== false;

  if (b.type === "character") {
    const name = str(b.name, 12);
    const setting = str(b.setting, 2000);
    const greeting = str(b.greeting, 500);
    if (!name) return bad("请填写角色名称");
    if (!setting) return bad("请填写角色设定");
    if (!greeting) return bad("请填写开场白");
    const cover = validImage(b.cover) || "/images/c-linxiaoman.jpg";
    const voice = VOICES.some((v) => v.id === b.voice) ? String(b.voice) : "温柔少女";
    const gender = ["男", "女", "其他"].includes(String(b.gender)) ? String(b.gender) : "女";
    const color = NAME_COLORS[Math.floor(Math.random() * NAME_COLORS.length)];
    const [row] = await db
      .insert(characters)
      .values({
        name,
        setting,
        greeting,
        intro: str(b.intro, 500),
        cover,
        avatar: cover,
        avatarFocus: str(b.avatarFocus, 30) || (cover.startsWith("data:") ? "cover" : "50% 26% 2"),
        voice,
        gender,
        color,
        tags,
        creatorId: u.id,
        creatorName: u.nickname,
        isPublic,
        standalone: true,
      })
      .returning({ id: characters.id });
    await db.insert(notifications).values([
      { userId: u.id, type: "system", title: "发布成功", content: `你的角色「${name}」已发布${isPublic ? "，快去分享给好友吧" : "（仅自己可见）"}`, fromName: "猫箱小助手", targetType: "character", targetId: row.id },
      ...(isPublic
        ? [{ userId: u.id, type: "like", title: "赞了你的角色", content: `「${name}」`, fromName: "白桃乌龙", targetType: "character", targetId: row.id }]
        : []),
    ]);
    return Response.json({ id: row.id, type: "character" });
  }

  if (b.type === "story") {
    const title = str(b.title, 20);
    if (!title) return bad("请填写故事名称");
    const ids = Array.isArray(b.characterIds) ? b.characterIds.map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, 6) : [];
    if (!ids.length) return bad("请至少选择一个出场角色");
    const chars = await db.select().from(characters).where(inArray(characters.id, ids));
    const valid = chars.filter((c) => c.isPublic || c.creatorId === u.id);
    if (!valid.length) return bad("出场角色不可用");
    const names = new Set(valid.map((c) => c.name));
    const opening: OpeningLine[] = (Array.isArray(b.opening) ? b.opening : [])
      .map((l) => l as { speaker?: unknown; content?: unknown })
      .map((l) => ({ speaker: names.has(String(l.speaker)) ? String(l.speaker) : "旁白", content: str(l.content, 500) }))
      .filter((l) => l.content)
      .slice(0, 10);
    if (!opening.length) return bad("请填写开场白");
    const chapters: ChapterDef[] = (Array.isArray(b.chapters) ? b.chapters : [])
      .map((c) => c as { title?: unknown; content?: unknown; goal?: unknown })
      .map((c, i) => ({ title: str(c.title, 30) || `第${i + 1}章`, content: str(c.content, 2000), goal: str(c.goal, 300) }))
      .filter((c) => c.content)
      .slice(0, 10);
    if (!chapters.length) return bad("请至少填写一个章节的故事内容");
    for (let i = 0; i < chapters.length - 1; i++) {
      if (!chapters[i].goal) return bad(`第${i + 1}章需要填写成功条件，才能进入下一章`);
    }
    const cover = validImage(b.cover) || valid[0].cover || "/images/s-yanbian.jpg";
    const [row] = await db
      .insert(stories)
      .values({
        title,
        intro: str(b.intro, 500),
        cover,
        background: str(b.background, 1000),
        opening,
        chapters,
        characterIds: valid.map((c) => c.id),
        tags,
        creatorId: u.id,
        creatorName: u.nickname,
        isPublic,
      })
      .returning({ id: stories.id });
    await db.insert(notifications).values([
      { userId: u.id, type: "system", title: "发布成功", content: `你的故事「${title}」已发布${isPublic ? "，快去分享给好友吧" : "（仅自己可见）"}`, fromName: "猫箱小助手", targetType: "story", targetId: row.id },
      ...(isPublic
        ? [{ userId: u.id, type: "comment", title: "评论了你的故事", content: "开头就好吸引人！期待后续～", fromName: "月亮不睡我不睡", targetType: "story", targetId: row.id }]
        : []),
    ]);
    return Response.json({ id: row.id, type: "story" });
  }

  return bad("未知的作品类型");
}
