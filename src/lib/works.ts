import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { characters, stories, likes, conversations, type CharacterRow, type StoryRow, type UserRow } from "@/db/schema";
import type { FeedItem, Msg, WorkChar, WorkDetail, WorkType } from "./types";

export function toWorkChar(c: CharacterRow): WorkChar {
  return {
    id: c.id,
    name: c.name,
    avatar: c.avatar || c.cover,
    avatarFocus: c.avatarFocus,
    color: c.color,
    voice: c.voice,
    gender: c.gender,
  };
}

export function characterOpening(c: CharacterRow): Msg[] {
  return c.greeting ? [{ id: -1, role: "character", speaker: c.name, characterId: c.id, content: c.greeting }] : [];
}

export function storyOpening(s: StoryRow, chars: CharacterRow[]): Msg[] {
  return (s.opening ?? []).map((l, i) => {
    const ch = chars.find((c) => c.name === l.speaker);
    return {
      id: -(i + 1),
      role: ch ? "character" : "narrator",
      speaker: ch ? ch.name : "旁白",
      characterId: ch ? ch.id : null,
      content: l.content,
    };
  });
}

function charItem(c: CharacterRow, userId: number, liked: Set<string>): FeedItem {
  return {
    key: `character-${c.id}`,
    type: "character",
    id: c.id,
    title: c.name,
    intro: c.intro,
    cover: c.cover || c.avatar,
    creatorId: c.creatorId,
    creatorName: c.creatorName,
    tags: c.tags ?? [],
    likeCount: c.likeCount,
    shareCount: c.shareCount,
    commentCount: c.commentCount,
    chatCount: c.chatCount,
    liked: liked.has(`character:${c.id}`),
    isPublic: c.isPublic,
    mine: c.creatorId === userId && userId > 0,
    voice: c.voice,
    opening: characterOpening(c),
    characters: [toWorkChar(c)],
    chapters: [],
    createdAt: new Date(c.createdAt).toISOString(),
  };
}

function storyItem(s: StoryRow, chars: CharacterRow[], userId: number, liked: Set<string>): FeedItem {
  return {
    key: `story-${s.id}`,
    type: "story",
    id: s.id,
    title: s.title,
    intro: s.intro,
    cover: s.cover,
    creatorId: s.creatorId,
    creatorName: s.creatorName,
    tags: s.tags ?? [],
    likeCount: s.likeCount,
    shareCount: s.shareCount,
    commentCount: s.commentCount,
    chatCount: s.chatCount,
    liked: liked.has(`story:${s.id}`),
    isPublic: s.isPublic,
    mine: s.creatorId === userId && userId > 0,
    voice: chars[0]?.voice ?? "温柔少女",
    opening: storyOpening(s, chars),
    characters: chars.map(toWorkChar),
    chapters: (s.chapters ?? []).map((c) => ({ title: c.title, goal: c.goal })),
    createdAt: new Date(s.createdAt).toISOString(),
  };
}

export async function likedSet(userId: number) {
  const rows = await db.select().from(likes).where(eq(likes.userId, userId));
  return new Set(rows.map((r) => `${r.targetType}:${r.targetId}`));
}

export type Scope = "feed" | "mine" | "liked" | "chatted" | "pickable";
export type Sort = "personal" | "hot" | "new";

const LOVE_TAGS = ["甜宠", "虐恋", "青梅竹马", "霸总", "恋爱"];

export async function listWorks(
  user: UserRow,
  opts: { scope?: Scope; tag?: string; q?: string; sort?: Sort },
): Promise<FeedItem[]> {
  const scope = opts.scope ?? "feed";
  const liked = await likedSet(user.id);
  const allChars = await db.select().from(characters);
  const charMap = new Map(allChars.map((c) => [c.id, c]));
  let items: FeedItem[] = [];

  if (scope === "pickable") {
    items = allChars
      .filter((c) => (c.isPublic && c.standalone) || c.creatorId === user.id)
      .map((c) => charItem(c, user.id, liked));
  } else {
    const allStories = await db.select().from(stories);
    const storyChars = (s: StoryRow) =>
      (s.characterIds ?? []).map((id) => charMap.get(id)).filter((c): c is CharacterRow => !!c);
    let cs: CharacterRow[] = [];
    let ss: StoryRow[] = [];
    if (scope === "feed") {
      cs = allChars.filter((c) => c.isPublic && c.standalone);
      ss = allStories.filter((s) => s.isPublic);
    } else if (scope === "mine") {
      cs = allChars.filter((c) => c.creatorId === user.id);
      ss = allStories.filter((s) => s.creatorId === user.id);
    } else if (scope === "liked") {
      cs = allChars.filter((c) => liked.has(`character:${c.id}`));
      ss = allStories.filter((s) => liked.has(`story:${s.id}`));
    } else if (scope === "chatted") {
      const convs = await db.select().from(conversations).where(eq(conversations.userId, user.id));
      const keys = new Set(convs.map((c) => `${c.targetType}:${c.targetId}`));
      cs = allChars.filter((c) => keys.has(`character:${c.id}`));
      ss = allStories.filter((s) => keys.has(`story:${s.id}`));
    }
    items = [...cs.map((c) => charItem(c, user.id, liked)), ...ss.map((s) => storyItem(s, storyChars(s), user.id, liked))];
  }

  const tag = opts.tag;
  if (tag) {
    items = items.filter((i) => i.tags.includes(tag) || (tag === "恋爱" && i.tags.some((t) => LOVE_TAGS.includes(t))));
  }
  const q = opts.q?.trim().toLowerCase();
  if (q) {
    items = items.filter((i) =>
      [i.title, i.intro, i.creatorName, ...i.tags, ...i.characters.map((c) => c.name)].join(" ").toLowerCase().includes(q),
    );
  }

  const hot = (i: FeedItem) => i.likeCount + i.chatCount * 0.6 + i.commentCount * 2 + i.shareCount;
  const sort = opts.sort ?? (scope === "feed" ? "personal" : "new");
  if (sort === "hot") {
    items.sort((a, b) => hot(b) - hot(a));
  } else if (sort === "new") {
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    const interests = new Set(user.interests ?? []);
    const dayAgo = Date.now() - 86400_000;
    const scored = items.map((i) => ({
      i,
      s:
        hot(i) * (0.5 + Math.random()) +
        i.tags.filter((t) => interests.has(t)).length * 9000 +
        (i.mine && new Date(i.createdAt).getTime() > dayAgo ? 60000 : 0),
    }));
    scored.sort((a, b) => b.s - a.s);
    items = scored.map((x) => x.i);
  }
  return items;
}

export type Target =
  | { type: "character"; character: CharacterRow; chars: CharacterRow[] }
  | { type: "story"; story: StoryRow; chars: CharacterRow[] };

export async function loadTarget(type: string, id: number, user: UserRow): Promise<Target | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  if (type === "character") {
    const [c] = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
    if (!c || (!c.isPublic && c.creatorId !== user.id)) return null;
    return { type: "character", character: c, chars: [c] };
  }
  if (type === "story") {
    const [s] = await db.select().from(stories).where(eq(stories.id, id)).limit(1);
    if (!s || (!s.isPublic && s.creatorId !== user.id)) return null;
    const ids = s.characterIds ?? [];
    const rows = ids.length ? await db.select().from(characters).where(inArray(characters.id, ids)) : [];
    const chars = ids.map((cid) => rows.find((r) => r.id === cid)).filter((c): c is CharacterRow => !!c);
    return { type: "story", story: s, chars };
  }
  return null;
}

export async function getWorkDetail(type: WorkType, id: number, user: UserRow): Promise<WorkDetail | null> {
  const t = await loadTarget(type, id, user);
  if (!t) return null;
  const liked = await likedSet(user.id);
  if (t.type === "character") {
    const c = t.character;
    const item = charItem(c, user.id, liked);
    return {
      ...item,
      setting: item.mine ? c.setting : "",
      greeting: c.greeting,
      gender: c.gender,
      background: "",
      chaptersFull: [],
      openingLines: [],
      characterIds: [c.id],
    };
  }
  const s = t.story;
  const item = storyItem(s, t.chars, user.id, liked);
  return {
    ...item,
    setting: "",
    greeting: "",
    gender: "",
    background: item.mine ? s.background : "",
    chaptersFull: s.chapters ?? [],
    openingLines: s.opening ?? [],
    characterIds: s.characterIds ?? [],
  };
}
