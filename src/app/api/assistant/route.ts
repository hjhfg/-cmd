import { NextRequest } from "next/server";
import { getUser } from "@/lib/user";
import { assistantReply } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await getUser();
  const b = (await req.json().catch(() => ({}))) as { history?: { role?: string; content?: string }[] };
  const history = (Array.isArray(b.history) ? b.history : [])
    .filter((h) => (h.role === "user" || h.role === "assistant") && typeof h.content === "string" && h.content.trim())
    .map((h) => ({ role: h.role as "user" | "assistant", content: String(h.content).slice(0, 1000) }))
    .slice(-20);
  if (!history.some((h) => h.role === "user")) return Response.json({ error: "说点什么吧～" }, { status: 400 });
  const r = await assistantReply(history);
  return Response.json(r);
}
