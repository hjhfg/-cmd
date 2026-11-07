import { NextRequest } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { regexRules } from "@/db/schema";
import { getUser } from "@/lib/user";
import { normalizeFlags, ruleError, type RegexScope } from "@/lib/regex";
import type { RegexRule } from "@/lib/types";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const txt = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const SCOPE: RegexScope[] = ["reply", "input", "both"];

function toInfo(row: typeof regexRules.$inferSelect): RegexRule {
  return {
    id: row.id,
    name: row.name,
    pattern: row.pattern,
    replacement: row.replacement,
    flags: row.flags,
    scope: (SCOPE.includes(row.scope as RegexScope) ? row.scope : "reply") as RegexScope,
    enabled: row.enabled,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function GET() {
  const u = await getUser();
  const rows = await db.select().from(regexRules).where(eq(regexRules.userId, u.id)).orderBy(asc(regexRules.id));
  return Response.json({ items: rows.map(toInfo) });
}

export async function POST(req: NextRequest) {
  const u = await getUser();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = txt(b.action, 20);
  const id = Number(b.id);

  if (action === "create") {
    const pattern = txt(b.pattern, 2000);
    const flags = normalizeFlags(txt(b.flags, 10)) || "g";
    const err = pattern ? ruleError({ pattern, flags }) : "";
    if (err) return bad(err);
    const scope = SCOPE.includes(b.scope as RegexScope) ? (b.scope as RegexScope) : "reply";
    const [row] = await db
      .insert(regexRules)
      .values({
        userId: u.id,
        name: txt(b.name, 40).trim() || "新规则",
        pattern,
        replacement: txt(b.replacement, 4000),
        flags,
        scope,
        enabled: b.enabled !== false,
      })
      .returning();
    return Response.json({ item: toInfo(row) });
  }

  const [row] = await db
    .select()
    .from(regexRules)
    .where(and(eq(regexRules.id, id), eq(regexRules.userId, u.id)))
    .limit(1);
  if (!row) return bad("规则不存在", 404);

  if (action === "update") {
    const pattern = b.pattern === undefined ? row.pattern : txt(b.pattern, 2000);
    const flags = b.flags === undefined ? row.flags : normalizeFlags(txt(b.flags, 10)) || "g";
    if (b.pattern !== undefined || b.flags !== undefined) {
      const err = pattern ? ruleError({ pattern, flags }) : "";
      if (err) return bad(err);
    }
    const [updated] = await db
      .update(regexRules)
      .set({
        name: b.name === undefined ? row.name : txt(b.name, 40).trim() || row.name,
        pattern,
        flags,
        replacement: b.replacement === undefined ? row.replacement : txt(b.replacement, 4000),
        scope: SCOPE.includes(b.scope as RegexScope) ? (b.scope as RegexScope) : row.scope,
        enabled: typeof b.enabled === "boolean" ? b.enabled : row.enabled,
      })
      .where(eq(regexRules.id, id))
      .returning();
    return Response.json({ item: toInfo(updated) });
  }

  if (action === "toggle") {
    const [updated] = await db
      .update(regexRules)
      .set({ enabled: typeof b.enabled === "boolean" ? b.enabled : !row.enabled })
      .where(eq(regexRules.id, id))
      .returning();
    return Response.json({ item: toInfo(updated) });
  }

  if (action === "duplicate") {
    const [copy] = await db
      .insert(regexRules)
      .values({
        userId: u.id,
        name: `${row.name} 副本`.slice(0, 40),
        pattern: row.pattern,
        replacement: row.replacement,
        flags: row.flags,
        scope: row.scope,
        enabled: row.enabled,
      })
      .returning();
    return Response.json({ item: toInfo(copy) });
  }

  if (action === "delete") {
    await db.delete(regexRules).where(and(eq(regexRules.id, id), eq(regexRules.userId, u.id)));
    return Response.json({ ok: true });
  }

  return bad("未知操作");
}
