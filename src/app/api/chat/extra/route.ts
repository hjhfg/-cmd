import { NextRequest } from "next/server";
import { getUser } from "@/lib/user";
import { loadTarget } from "@/lib/works";
import { findConv, listMsgs, lite, openingFor } from "@/lib/conversation";
import { callGreeting, heartCommand, inspirations } from "@/lib/ai";
import type { HeartKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const KINDS: HeartKind[] = ["home", "diary", "phone", "heart"];

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { kind?: string; type?: string; id?: number; heartKind?: string };
  const u = await getUser();
  const t = await loadTarget(String(b.type ?? ""), Number(b.id), u);
  if (!t) return Response.json({ error: "作品不存在" }, { status: 404 });
  const conv = await findConv(u.id, t.type, t.type === "character" ? t.character.id : t.story.id);
  const history = conv ? await listMsgs(conv.id) : openingFor(t);

  if (b.kind === "inspire") {
    const title = t.type === "character" ? t.character.name : t.story.title;
    const setting = t.type === "character" ? t.character.setting : t.story.intro;
    const suggestions = await inspirations({ title, setting, history, userName: u.nickname });
    return Response.json({ suggestions });
  }

  if (b.kind === "heart") {
    if (t.type !== "character") return Response.json({ error: "心动指令仅支持单个角色" }, { status: 400 });
    const hk = KINDS.includes(b.heartKind as HeartKind) ? (b.heartKind as HeartKind) : "heart";
    const result = await heartCommand(hk, lite(t.character), history, conv?.affinity ?? 10, u.nickname);
    return Response.json({ result });
  }

  if (b.kind === "call-greet") {
    const c = t.type === "character" ? t.character : t.chars[0];
    if (!c) return Response.json({ text: "喂？" });
    return Response.json({ text: callGreeting(lite(c)) });
  }

  return Response.json({ error: "未知操作" }, { status: 400 });
}
