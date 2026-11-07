import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, characters, stories, users, type CharacterRow, type ConversationRow, type MessageRow, type UserRow } from "@/db/schema";
import { characterReply, storyReply, type CharLite } from "./ai";
import { characterOpening, storyOpening, type Target } from "./works";
import type { ConvInfo, Msg } from "./types";
import { studioContext } from "./studio";

export function toMsg(m: MessageRow): Msg {
  const role = (["user", "character", "narrator", "system"].includes(m.role) ? m.role : "narrator") as Msg["role"];
  return { id: m.id, role, speaker: m.speaker, characterId: m.characterId, content: m.content };
}

export function toConvInfo(c: ConversationRow): ConvInfo {
  return {
    id: c.id,
    chapter: c.chapter,
    finished: c.finished,
    mode: c.mode === "heart" ? "heart" : "normal",
    memory: c.memory,
    affinity: c.affinity,
  };
}

export function lite(c: CharacterRow): CharLite {
  return { id: c.id, name: c.name, setting: c.setting, intro: c.intro, greeting: c.greeting, gender: c.gender, tags: c.tags ?? [] };
}

export async function findConv(userId: number, type: string, id: number) {
  const [c] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.targetType, type), eq(conversations.targetId, id)))
    .limit(1);
  return c ?? null;
}

export async function getConvById(id: number) {
  const [c] = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return c ?? null;
}

export async function listMsgs(convId: number): Promise<Msg[]> {
  const rows = await db.select().from(messages).where(eq(messages.conversationId, convId)).orderBy(asc(messages.id));
  return rows.map(toMsg);
}

export function openingFor(t: Target): Msg[] {
  return t.type === "character" ? characterOpening(t.character) : storyOpening(t.story, t.chars);
}

async function insertOpening(convId: number, t: Target) {
  const op = openingFor(t);
  if (op.length) {
    await db.insert(messages).values(
      op.map((m) => ({ conversationId: convId, role: m.role, speaker: m.speaker, characterId: m.characterId, content: m.content })),
    );
  }
  return op;
}

export async function createConv(user: UserRow, t: Target): Promise<ConversationRow> {
  const targetId = t.type === "character" ? t.character.id : t.story.id;
  const op = openingFor(t);
  const [c] = await db
    .insert(conversations)
    .values({ userId: user.id, targetType: t.type, targetId, lastMessage: op.at(-1)?.content ?? "", lastAt: new Date() })
    .returning();
  await insertOpening(c.id, t);
  if (t.type === "character") {
    await db.update(characters).set({ chatCount: sql`${characters.chatCount} + 1` }).where(eq(characters.id, targetId));
  } else {
    await db.update(stories).set({ chatCount: sql`${stories.chatCount} + 1` }).where(eq(stories.id, targetId));
  }
  return c;
}

const CHAPTER_RE = /^第(\d+)章 · /;

export function chapterState(msgs: Msg[]) {
  let chapter = 0;
  let finished = false;
  for (const m of msgs) {
    if (m.role !== "system") continue;
    if (CHAPTER_RE.test(m.content)) chapter += 1;
    if (m.content.startsWith("故事完结")) finished = true;
  }
  return { chapter, finished };
}

function turnsInChapter(msgs: Msg[]) {
  let n = 0;
  for (const m of msgs) {
    if (m.role === "system" && CHAPTER_RE.test(m.content)) n = 0;
    else if (m.role === "user") n += 1;
  }
  return n;
}

export async function insertUserMsg(conv: ConversationRow, content: string) {
  const [m] = await db.insert(messages).values({ conversationId: conv.id, role: "user", speaker: "我", content }).returning();
  await db.update(conversations).set({ lastMessage: content, lastAt: new Date() }).where(eq(conversations.id, conv.id));
  return m;
}

type NewRow = { role: string; speaker: string; characterId: number | null; content: string };

/** Generates the AI reply (single character or multi-role story) for the latest user message. */
export async function generateReply(
  conv: ConversationRow,
  t: Target,
  user: UserRow,
  opts: { transform?: (text: string) => string } = {},
): Promise<{ notice?: string; newIds: number[] }> {
  const shape = opts.transform ?? ((text: string) => text);
  const history = await listMsgs(conv.id);
  const studio = await studioContext(user.id, conv.id, history);
  const heart = conv.mode === "heart";
  const notice: string | undefined = undefined;
  const mode = heart ? "heart" : "normal";
  const rows: NewRow[] = [];
  let chapter = conv.chapter;
  let finished = conv.finished;
  let affinity = conv.affinity;

  if (t.type === "character") {
    const c = t.character;
    const reply = await characterReply({ character: lite(c), history, userName: studio.personaName || user.nickname, mode, memory: conv.memory, studio });
    rows.push({ role: "character", speaker: c.name, characterId: c.id, content: shape(reply) });
    affinity = Math.min(100, affinity + 1 + Math.floor(Math.random() * 3));
  } else {
    const s = t.story;
    const r = await storyReply({
      story: { title: s.title, intro: s.intro, background: s.background, chapters: s.chapters ?? [] },
      chars: t.chars.map(lite),
      chapter,
      history,
      userName: studio.personaName || user.nickname,
      mode,
      memory: conv.memory,
      studio,
      turns: turnsInChapter(history),
      finished,
    });
    for (const l of r.lines) {
      const ch = t.chars.find((c) => c.name === l.speaker);
      rows.push({
        role: ch ? "character" : "narrator",
        speaker: ch ? ch.name : "旁白",
        characterId: ch ? ch.id : null,
        content: shape(l.content),
      });
    }
    const chapters = s.chapters ?? [];
    if (r.chapterDone && !finished) {
      const next = chapter + 1;
      if (next < chapters.length) {
        const nc = chapters[next];
        rows.push({ role: "system", speaker: "", characterId: null, content: `第${next + 1}章 · ${nc.title}` });
        rows.push({ role: "narrator", speaker: "旁白", characterId: null, content: shape(nc.content.replace(/用户/g, "你")) });
        chapter = next;
      } else {
        rows.push({ role: "system", speaker: "", characterId: null, content: "故事完结 · 恭喜达成结局" });
        rows.push({
          role: "narrator",
          speaker: "旁白",
          characterId: null,
          content: "故事在这里落下帷幕，但你们的羁绊不会结束。打开「历史」点击「重新开始」，去探索不同的结局吧。",
        });
        finished = true;
      }
    }
  }

  let newIds: number[] = [];
  if (rows.length) {
    const inserted = await db
      .insert(messages)
      .values(rows.map((r) => ({ conversationId: conv.id, ...r })))
      .returning({ id: messages.id });
    newIds = inserted.map((x) => x.id);
  }
  const last = rows.filter((r) => r.role !== "system").at(-1);
  await db
    .update(conversations)
    .set({ chapter, finished, affinity, lastMessage: last?.content ?? conv.lastMessage, lastAt: new Date() })
    .where(eq(conversations.id, conv.id));
  return { notice, newIds };
}

export async function truncateAfter(convId: number, msgId: number) {
  await db.delete(messages).where(and(eq(messages.conversationId, convId), gt(messages.id, msgId)));
}

export async function syncConv(conv: ConversationRow): Promise<ConversationRow> {
  const msgs = await listMsgs(conv.id);
  const st = chapterState(msgs);
  const last = msgs.filter((m) => m.role !== "system").at(-1);
  const [c] = await db
    .update(conversations)
    .set({ chapter: st.chapter, finished: st.finished, lastMessage: last?.content ?? "" })
    .where(eq(conversations.id, conv.id))
    .returning();
  return c ?? conv;
}

export async function restartConv(conv: ConversationRow, t: Target): Promise<ConversationRow> {
  await db.delete(messages).where(eq(messages.conversationId, conv.id));
  const op = await insertOpening(conv.id, t);
  const [c] = await db
    .update(conversations)
    .set({ chapter: 0, finished: false, lastMessage: op.at(-1)?.content ?? "", lastAt: new Date() })
    .where(eq(conversations.id, conv.id))
    .returning();
  return c ?? conv;
}

export async function deleteConv(convId: number) {
  await db.delete(messages).where(eq(messages.conversationId, convId));
  await db.delete(conversations).where(eq(conversations.id, convId));
}
