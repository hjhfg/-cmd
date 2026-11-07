import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conversations, lorebooks, loreEntries, personas, promptPresets, userAiSettings, userExtensions } from "@/db/schema";
import { getUser } from "@/lib/user";
import { decryptSecret, encryptSecret, validateBaseUrl } from "@/lib/studio";

export const dynamic = "force-dynamic";
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const txt = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const number = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
};
const image = (v: unknown) => typeof v === "string" && (v.startsWith("/images/") || (v.startsWith("data:image/") && v.length < 400_000)) ? v : "";

type Body = Record<string, unknown>;

export async function GET(req: NextRequest) {
  const u = await getUser();
  const scope = req.nextUrl.searchParams.get("scope");
  if (scope === "personas") return Response.json({ items: await db.select().from(personas).where(eq(personas.userId, u.id)) });
  if (scope === "prompts") return Response.json({ items: await db.select().from(promptPresets).where(eq(promptPresets.userId, u.id)) });
  if (scope === "world") {
    const books = await db.select().from(lorebooks).where(eq(lorebooks.userId, u.id));
    const entries = books.length ? await db.select().from(loreEntries).where(and(eq(loreEntries.userId, u.id), inArray(loreEntries.bookId, books.map((b) => b.id)))) : [];
    return Response.json({ books, entries });
  }
  if (scope === "api") {
    const [row] = await db.select().from(userAiSettings).where(eq(userAiSettings.userId, u.id)).limit(1);
    return Response.json({ provider: row?.provider || "built-in", baseUrl: row?.baseUrl || "", model: row?.model || "", hasKey: !!row?.encryptedKey });
  }
  if (scope === "extensions") {
    const [row] = await db.select().from(userExtensions).where(eq(userExtensions.userId, u.id)).limit(1);
    return Response.json({ autoVoice: row?.autoVoice ?? true, actionText: row?.actionText ?? true, longMemory: row?.longMemory ?? true, worldInfo: row?.worldInfo ?? true, typingEffect: row?.typingEffect ?? true });
  }
  return bad("未知的设置分类");
}

export async function POST(req: NextRequest) {
  const u = await getUser();
  const b = (await req.json().catch(() => ({}))) as Body;
  const scope = txt(b.scope, 24);
  const action = txt(b.action, 24);
  const id = Number(b.id);

  if (scope === "personas") {
    if (action === "create" || action === "duplicate") {
      let source: typeof personas.$inferSelect | undefined;
      if (action === "duplicate") [source] = await db.select().from(personas).where(and(eq(personas.id, id), eq(personas.userId, u.id))).limit(1);
      if (action === "duplicate" && !source) return bad("设定不存在", 404);
      const [p] = await db.insert(personas).values({ userId: u.id, name: source ? `${source.name} 副本` : txt(b.name, 30) || "新设定", description: source?.description || txt(b.description, 4000), notes: source?.notes || "", avatar: source?.avatar || image(b.avatar) }).returning();
      return Response.json({ item: p });
    }
    const [row] = await db.select().from(personas).where(and(eq(personas.id, id), eq(personas.userId, u.id))).limit(1);
    if (!row) return bad("设定不存在", 404);
    if (action === "update") {
      const [updated] = await db.update(personas).set({ name: txt(b.name, 30) || row.name, description: txt(b.description, 4000), notes: txt(b.notes, 2000), avatar: image(b.avatar) }).where(eq(personas.id, id)).returning();
      return Response.json({ item: updated });
    }
    if (action === "default") {
      await db.update(personas).set({ isDefault: false }).where(eq(personas.userId, u.id));
      const [updated] = await db.update(personas).set({ isDefault: true }).where(eq(personas.id, id)).returning();
      return Response.json({ item: updated });
    }
    if (action === "bind") {
      const conversationId = Number(b.conversationId);
      const [conv] = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, u.id))).limit(1);
      if (!conv) return bad("聊天不存在", 404);
      await db.update(conversations).set({ personaId: id }).where(eq(conversations.id, conversationId));
      return Response.json({ ok: true });
    }
    if (action === "delete") {
      await db.update(conversations).set({ personaId: null }).where(and(eq(conversations.userId, u.id), eq(conversations.personaId, id)));
      await db.delete(personas).where(eq(personas.id, id));
      return Response.json({ ok: true });
    }
  }

  if (scope === "prompts") {
    if (action === "create") {
      const [p] = await db.insert(promptPresets).values({ userId: u.id, name: txt(b.name, 40) || "新预设", systemPrompt: txt(b.systemPrompt, 6000), postHistory: txt(b.postHistory, 3000) }).returning();
      return Response.json({ item: p });
    }
    const [row] = await db.select().from(promptPresets).where(and(eq(promptPresets.id, id), eq(promptPresets.userId, u.id))).limit(1);
    if (!row) return bad("预设不存在", 404);
    if (action === "update") {
      const [updated] = await db.update(promptPresets).set({ name: txt(b.name, 40) || row.name, systemPrompt: txt(b.systemPrompt, 6000), postHistory: txt(b.postHistory, 3000), temperature: number(b.temperature, 90, 0, 200), maxTokens: number(b.maxTokens, 600, 64, 4000) }).where(eq(promptPresets.id, id)).returning();
      return Response.json({ item: updated });
    }
    if (action === "activate") {
      await db.update(promptPresets).set({ isActive: false }).where(eq(promptPresets.userId, u.id));
      const [updated] = await db.update(promptPresets).set({ isActive: true }).where(eq(promptPresets.id, id)).returning();
      return Response.json({ item: updated });
    }
    if (action === "deactivate") {
      await db.update(promptPresets).set({ isActive: false }).where(eq(promptPresets.id, id));
      return Response.json({ ok: true });
    }
    if (action === "delete") {
      await db.delete(promptPresets).where(eq(promptPresets.id, id));
      return Response.json({ ok: true });
    }
  }

  if (scope === "world") {
    if (action === "createBook") {
      const [book] = await db.insert(lorebooks).values({ userId: u.id, name: txt(b.name, 50) || "新世界书", description: txt(b.description, 300) }).returning();
      return Response.json({ item: book });
    }
    if (action === "createEntry") {
      const bookId = Number(b.bookId);
      const [book] = await db.select().from(lorebooks).where(and(eq(lorebooks.id, bookId), eq(lorebooks.userId, u.id))).limit(1);
      if (!book) return bad("世界书不存在", 404);
      const [entry] = await db.insert(loreEntries).values({ bookId, userId: u.id, title: txt(b.title, 80) || "新条目", keywords: txt(b.keywords, 500), content: txt(b.content, 4000), constant: b.constant === true, priority: number(b.priority, 100, 0, 1000) }).returning();
      return Response.json({ item: entry });
    }
    if (action === "updateBook" || action === "toggleBook" || action === "deleteBook") {
      const [book] = await db.select().from(lorebooks).where(and(eq(lorebooks.id, id), eq(lorebooks.userId, u.id))).limit(1);
      if (!book) return bad("世界书不存在", 404);
      if (action === "deleteBook") {
        await db.delete(loreEntries).where(and(eq(loreEntries.bookId, id), eq(loreEntries.userId, u.id)));
        await db.delete(lorebooks).where(eq(lorebooks.id, id));
        return Response.json({ ok: true });
      }
      const [updated] = await db.update(lorebooks).set(action === "toggleBook" ? { enabled: !book.enabled } : { name: txt(b.name, 50) || book.name, description: txt(b.description, 300) }).where(eq(lorebooks.id, id)).returning();
      return Response.json({ item: updated });
    }
    if (action === "updateEntry" || action === "toggleEntry" || action === "deleteEntry") {
      const [entry] = await db.select().from(loreEntries).where(and(eq(loreEntries.id, id), eq(loreEntries.userId, u.id))).limit(1);
      if (!entry) return bad("世界书条目不存在", 404);
      if (action === "deleteEntry") {
        await db.delete(loreEntries).where(eq(loreEntries.id, id));
        return Response.json({ ok: true });
      }
      const [updated] = await db.update(loreEntries).set(action === "toggleEntry" ? { enabled: !entry.enabled } : { title: txt(b.title, 80) || entry.title, keywords: txt(b.keywords, 500), content: txt(b.content, 4000), constant: b.constant === true, priority: number(b.priority, 100, 0, 1000) }).where(eq(loreEntries.id, id)).returning();
      return Response.json({ item: updated });
    }
  }

  if (scope === "api") {
    const provider = txt(b.provider, 24);
    if (action === "save") {
      if (!["built-in", "openai", "deepseek", "ark", "custom"].includes(provider)) return bad("不支持的服务商");
      const base = txt(b.baseUrl, 300);
      const model = txt(b.model, 150);
      if (provider !== "built-in" && (!validateBaseUrl(base) || !model)) return bad("请填写有效的 HTTPS API 地址与模型名称");
      const [old] = await db.select().from(userAiSettings).where(eq(userAiSettings.userId, u.id)).limit(1);
      const providedKey = txt(b.apiKey, 500);
      const secret = providedKey ? encryptSecret(providedKey) : b.clearKey === true ? "" : old?.encryptedKey || "";
      if (provider !== "built-in" && !secret && provider !== "custom") return bad("请填写 API Key");
      const [row] = await db.insert(userAiSettings).values({ userId: u.id, provider, baseUrl: base, model, encryptedKey: secret }).onConflictDoUpdate({ target: userAiSettings.userId, set: { provider, baseUrl: base, model, encryptedKey: secret, updatedAt: new Date() } }).returning();
      return Response.json({ provider: row.provider, baseUrl: row.baseUrl, model: row.model, hasKey: !!row.encryptedKey });
    }
    if (action === "test") {
      const base = txt(b.baseUrl, 300);
      const model = txt(b.model, 150);
      if (!validateBaseUrl(base) || !model) return bad("请填写有效的 HTTPS API 地址与模型名称");
      const [old] = await db.select().from(userAiSettings).where(eq(userAiSettings.userId, u.id)).limit(1);
      const secret = txt(b.apiKey, 500) || (old ? decryptSecret(old.encryptedKey) : "");
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const response = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", ...(secret ? { Authorization: `Bearer ${secret}` } : {}) }, body: JSON.stringify({ model, messages: [{ role: "user", content: "你好，请只回复连接成功" }], max_tokens: 32 }), signal: ctrl.signal, redirect: "error" });
        if (!response.ok) return bad(`连接失败（HTTP ${response.status}）`);
        return Response.json({ ok: true, message: "连接成功" });
      } catch {
        return bad("连接超时或服务不可用，请检查地址与密钥");
      } finally { clearTimeout(timer); }
    }
  }

  if (scope === "extensions" && action === "save") {
    const patch = { autoVoice: b.autoVoice !== false, actionText: b.actionText !== false, longMemory: b.longMemory !== false, worldInfo: b.worldInfo !== false, typingEffect: b.typingEffect !== false };
    await db.insert(userExtensions).values({ userId: u.id, ...patch }).onConflictDoUpdate({ target: userExtensions.userId, set: { ...patch, updatedAt: new Date() } });
    return Response.json(patch);
  }
  return bad("未知操作");
}
