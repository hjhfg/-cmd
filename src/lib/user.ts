import { cookies, headers } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, notifications, conversations, characters, stories, type UserRow } from "@/db/schema";
import { ensureDb } from "./bootstrap";
import type { UserInfo } from "./types";

export const COOKIE = "mx_token";

/** Date string in China time (UTC+8), used for daily quotas. */
export function todayStr() {
  return new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
}

export function isVip(u: UserRow) {
  return !!u.vipUntil && new Date(u.vipUntil).getTime() > Date.now();
}

const TOKEN_RE = /^[A-Za-z0-9_-]{16,80}$/;

/**
 * Cross-site iframe previews never receive `SameSite=Lax` cookies. On HTTPS we
 * must use `SameSite=None; Secure` so the identity cookie round-trips; plain
 * HTTP (local dev) keeps Lax because None requires Secure.
 */
async function cookieOptions() {
  const h = await headers();
  const https = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() === "https";
  return {
    httpOnly: true,
    sameSite: https ? ("none" as const) : ("lax" as const),
    secure: https,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

/**
 * Resolves the current user. Identity prefers the client device token header so it
 * survives third-party-cookie blocking (embedded previews); cookies are a fallback.
 */
export async function getUser(): Promise<UserRow> {
  await ensureDb();
  const store = await cookies();
  const headerToken = (await headers()).get("x-mx-token") ?? "";
  const cookieToken = store.get(COOKIE)?.value ?? "";
  const candidates = [headerToken, cookieToken].filter((t) => TOKEN_RE.test(t));
  for (const token of candidates) {
    const [u] = await db.select().from(users).where(eq(users.token, token)).limit(1);
    if (u) {
      if (cookieToken !== token) {
        store.set(COOKIE, token, await cookieOptions());
      }
      return u;
    }
  }
  const newToken = candidates[0] ?? crypto.randomUUID();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const [created] = await db
    .insert(users)
    // The legacy flag remains for compatibility; new local users enter directly.
    .values({ token: newToken, nickname: `用户${code}`, code, onboarded: true })
    .onConflictDoNothing({ target: users.token })
    .returning();
  if (!created) {
    // 并发首请求：另一个请求已用同一令牌建号，直接复用
    const [existing] = await db.select().from(users).where(eq(users.token, newToken)).limit(1);
    if (existing) return existing;
    throw new Error("用户创建失败");
  }
  store.set(COOKIE, newToken, await cookieOptions());
  await db.insert(notifications).values([
    {
      userId: created.id,
      type: "system",
      title: "本地空间已就绪",
      content: "上下滑动首页即可遇见不同的角色与故事，点击底部「＋AI」可以创作属于你的角色。",
      fromName: "猫箱小助手",
    },
    {
      userId: created.id,
      type: "activity",
      title: "可以试试",
      content: "在「我的 · 模型与设定」里可以配置 AIP、提示词、世界书与扩展，打造你自己的对话体验。",
      fromName: "猫箱小助手",
    },
  ]);
  return created;
}

export async function userInfo(u: UserRow): Promise<UserInfo> {
  const today = todayStr();
  const [cl] = await db
    .select({ n: sql<number>`coalesce(sum(${characters.likeCount}),0)::int`, c: sql<number>`count(*)::int` })
    .from(characters)
    .where(eq(characters.creatorId, u.id));
  const [sl] = await db
    .select({ n: sql<number>`coalesce(sum(${stories.likeCount}),0)::int`, c: sql<number>`count(*)::int` })
    .from(stories)
    .where(eq(stories.creatorId, u.id));
  const [cv] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(conversations)
    .where(eq(conversations.userId, u.id));
  const vip = isVip(u);
  return {
    id: u.id,
    nickname: u.nickname,
    code: u.code,
    avatar: u.avatar,
    gender: u.gender,
    bio: u.bio,
    interests: u.interests ?? [],
    onboarded: u.onboarded,
    catFood: u.catFood,
    isVip: vip,
    vipUntil: u.vipUntil ? new Date(u.vipUntil).toISOString() : null,
    checkedInToday: u.checkinDate === today,
    adLeft: Math.max(0, 5 - (u.adDate === today ? u.adCount : 0)),
    heartLeft: vip ? 999 : Math.max(0, 5 - (u.heartDate === today ? u.heartCount : 0)),
    likesReceived: Number(cl?.n ?? 0) + Number(sl?.n ?? 0),
    worksCount: Number(cl?.c ?? 0) + Number(sl?.c ?? 0),
    chattedCount: Number(cv?.c ?? 0),
  };
}

export async function unreadTotal(userId: number) {
  const [a] = await db
    .select({ n: sql<number>`coalesce(sum(${conversations.unread}),0)::int` })
    .from(conversations)
    .where(eq(conversations.userId, userId));
  const [b] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(a?.n ?? 0) + Number(b?.n ?? 0);
}

