import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, type ConversationRow } from "@/db/schema";
import { getUser } from "@/lib/user";
import { loadTarget } from "@/lib/works";
import { applyRegex } from "@/lib/regex";
import { and, asc, eq as eqOp } from "drizzle-orm";
import { regexRules } from "@/db/schema";
import type { RegexRule } from "@/lib/types";
import {
  createConv,
  findConv,
  generateReply,
  getConvById,
  insertUserMsg,
  listMsgs,
  openingFor,
  restartConv,
  syncConv,
  toConvInfo,
  truncateAfter,
} from "@/lib/conversation";

export const dynamic = "force-dynamic";

const err = (error: string, status = 400) => Response.json({ error }, { status });

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const id = Number(sp.get("id"));
  const u = await getUser();
  const t = await loadTarget(type, id, u);
  if (!t) return err("作品不存在或已设为私密", 404);
  const conv = await findConv(u.id, type, id);
  if (!conv) return Response.json({ conversation: null, messages: openingFor(t) });
  if (conv.unread) await db.update(conversations).set({ unread: 0 }).where(eq(conversations.id, conv.id));
  return Response.json({ conversation: toConvInfo(conv), messages: await listMsgs(conv.id) });
}

export async function POST(req: NextRequest) {
  try {
    return await post(req);
  } catch (error) {
    console.error("[api/chat]", error);
    return Response.json({ error: "回复生成失败，请稍后重试" }, { status: 503 });
  }
}

/** 读取当前用户启用的正则规则，用于改写模型输出。 */
async function replyRules(userId: number): Promise<RegexRule[]> {
  const rows = await db
    .select()
    .from(regexRules)
    .where(and(eqOp(regexRules.userId, userId), eqOp(regexRules.enabled, true)))
    .orderBy(asc(regexRules.id));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    pattern: r.pattern,
    replacement: r.replacement,
    flags: r.flags,
    scope: (r.scope === "input" || r.scope === "both" ? r.scope : "reply") as RegexRule["scope"],
    enabled: r.enabled,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

async function post(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as {
    type?: string;
    id?: number;
    action?: string;
    content?: string;
    messageId?: number;
    mode?: string;
    memory?: string;
  };
  const type = String(b.type ?? "");
  const id = Number(b.id);
  const u = await getUser();
  const t = await loadTarget(type, id, u);
  if (!t) return err("作品不存在或已设为私密", 404);

  let conv: ConversationRow | null = await findConv(u.id, type, id);
  let notice: string | undefined;
  let newIds: number[] = [];

  switch (b.action) {
    case "send": {
      const raw = String(b.content ?? "").trim().slice(0, 1000);
      if (!raw) return err("消息不能为空");
      const rules = await replyRules(u.id);
      const text = applyRegex(rules, raw, "input");
      if (!conv) conv = await createConv(u, t);
      await insertUserMsg(conv, text);
      const fresh = (await getConvById(conv.id)) ?? conv;
      const r = await generateReply(fresh, t, u, { transform: (text) => applyRegex(rules, text, "reply") });
      notice = r.notice;
      newIds = r.newIds;
      break;
    }
    case "regenerate": {
      if (!conv) return err("暂无可重新生成的回复");
      const msgs = await listMsgs(conv.id);
      let idx = -1;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "user") {
          idx = i;
          break;
        }
      }
      if (idx < 0) return err("先和Ta说句话吧～");
      await truncateAfter(conv.id, msgs[idx].id);
      conv = await syncConv(conv);
      const rules = await replyRules(u.id);
      const r = await generateReply(conv, t, u, { transform: (text) => applyRegex(rules, text, "reply") });
      notice = r.notice ?? "已重新生成";
      newIds = r.newIds;
      break;
    }
    case "restart": {
      if (conv) conv = await restartConv(conv, t);
      notice = "已重新开始";
      break;
    }
    case "rewind": {
      const mid = Number(b.messageId);
      if (!conv || !mid) return err("无法回溯");
      await truncateAfter(conv.id, mid);
      conv = await syncConv(conv);
      const msgs = await listMsgs(conv.id);
      if (msgs.at(-1)?.role === "user") {
        const rules = await replyRules(u.id);
        const r = await generateReply(conv, t, u, { transform: (text) => applyRegex(rules, text, "reply") });
        newIds = r.newIds;
      }
      notice = "已回溯到该节点";
      break;
    }
    case "mode": {
      if (!conv) conv = await createConv(u, t);
      const mode = b.mode === "heart" ? "heart" : "normal";
      await db.update(conversations).set({ mode }).where(eq(conversations.id, conv.id));
      notice = mode === "heart" ? "已开启心动模式，角色更聪明有灵性～" : "已切换为普通模式";
      break;
    }
    case "memory": {
      if (!conv) conv = await createConv(u, t);
      await db
        .update(conversations)
        .set({ memory: String(b.memory ?? "").slice(0, 500) })
        .where(eq(conversations.id, conv.id));
      notice = "记忆已保存，Ta会记住的～";
      break;
    }
    default:
      return err("未知操作");
  }

  const final = conv ? await getConvById(conv.id) : null;
  return Response.json({
    conversation: final ? toConvInfo(final) : null,
    messages: final ? await listMsgs(final.id) : openingFor(t),
    notice,
    newIds,
  });
}
