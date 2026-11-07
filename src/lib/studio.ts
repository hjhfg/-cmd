import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conversations, lorebooks, loreEntries, personas, promptPresets, userAiSettings, userExtensions } from "@/db/schema";
import type { Msg } from "./types";

export type StudioContext = {
  personaName: string;
  personaDescription: string;
  systemPrompt: string;
  postHistory: string;
  worldInfo: string;
  temperature: number;
  maxTokens: number;
  actionText: boolean;
  longMemory: boolean;
  typingEffect: boolean;
  connection?: { base: string; model: string; key: string };
};

const key = () => createHash("sha256").update(process.env.API_ENCRYPTION_KEY || process.env.DATABASE_URL || "").digest();

export function encryptSecret(raw: string): string {
  if (!raw) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(raw, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(raw: string): string {
  if (!raw) return "";
  try {
    const [a, b, c] = raw.split(".").map((x) => Buffer.from(x, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key(), a);
    decipher.setAuthTag(b);
    return Buffer.concat([decipher.update(c), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

export function validateBaseUrl(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || u.port || u.search || u.hash) return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host === "metadata.google.internal") return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
    if (host.includes(":") || !host.includes(".")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function studioContext(userId: number, convId: number | undefined, history: Msg[]): Promise<StudioContext> {
  const [[ext], [preset], [connection], personaRows, books] = await Promise.all([
    db.select().from(userExtensions).where(eq(userExtensions.userId, userId)).limit(1),
    db.select().from(promptPresets).where(and(eq(promptPresets.userId, userId), eq(promptPresets.isActive, true))).limit(1),
    db.select().from(userAiSettings).where(eq(userAiSettings.userId, userId)).limit(1),
    db.select().from(personas).where(eq(personas.userId, userId)),
    db.select().from(lorebooks).where(and(eq(lorebooks.userId, userId), eq(lorebooks.enabled, true))),
  ]);
  let selectedId: number | null = null;
  if (convId) {
    const [conv] = await db.select({ personaId: conversations.personaId }).from(conversations).where(eq(conversations.id, convId)).limit(1);
    selectedId = conv?.personaId ?? null;
  }
  const persona = personaRows.find((p) => p.id === selectedId) || personaRows.find((p) => p.isDefault);
  let worldInfo = "";
  if (ext?.worldInfo !== false && books.length) {
    const entries = await db.select().from(loreEntries).where(and(eq(loreEntries.userId, userId), inArray(loreEntries.bookId, books.map((b) => b.id)), eq(loreEntries.enabled, true))).orderBy(desc(loreEntries.priority));
    const scan = history.slice(-12).map((m) => m.content).join("\n").toLowerCase();
    worldInfo = entries
      .filter((e) => e.constant || e.keywords.split(/[,，\n]/).map((x) => x.trim().toLowerCase()).some((word) => word && scan.includes(word)))
      .slice(0, 12)
      .map((e) => `【${e.title}】${e.content}`)
      .join("\n")
      .slice(0, 5000);
  }
  const secret = connection?.encryptedKey ? decryptSecret(connection.encryptedKey) : "";
  const useCustom = connection && connection.provider !== "built-in" && connection.model && connection.baseUrl && validateBaseUrl(connection.baseUrl);
  return {
    personaName: persona?.name || "",
    personaDescription: persona?.description || "",
    systemPrompt: preset?.systemPrompt || "",
    postHistory: preset?.postHistory || "",
    worldInfo,
    temperature: (preset?.temperature ?? 90) / 100,
    maxTokens: preset?.maxTokens ?? 600,
    actionText: ext?.actionText !== false,
    longMemory: ext?.longMemory !== false,
    typingEffect: ext?.typingEffect !== false,
    connection: useCustom ? { base: connection.baseUrl, model: connection.model, key: secret } : undefined,
  };
}
