"use client";
import { session } from "@/lib/storage";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader, toast } from "@/components/ui";
import { CatLogo, SendIcon } from "@/components/icons";
import { apiSend, ApiError } from "@/lib/api";
import type { CharacterDraft } from "@/lib/types";

type Turn = { role: "user" | "assistant"; content: string; draft?: CharacterDraft | null };

const GREETING = "嗨～我是猫箱 AI 创作助手\n想创作一个什么样的角色呢？告诉我Ta的身份和性格吧！\n比如：一个表面高冷、其实很会照顾人的学长。";
const QUICK = ["表面高冷其实很温柔的学长", "修无情道的清冷师尊", "会说话的治愈系小猫咪", "毒舌但护短的侦探搭档"];

export default function AssistantPage() {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", content: GREETING }]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  async function send(t: string) {
    const c = t.trim();
    if (!c || loading) return;
    const next: Turn[] = [...turns, { role: "user", content: c }];
    setTurns(next);
    setText("");
    setLoading(true);
    try {
      const r = await apiSend<{ reply: string; draft: CharacterDraft | null }>("/api/assistant", {
        history: next.map((x) => ({ role: x.role, content: x.content })),
      });
      setTurns([...next, { role: "assistant", content: r.reply, draft: r.draft }]);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "助手开小差了，请重试");
    } finally {
      setLoading(false);
    }
  }

  function applyDraft(d: CharacterDraft) {
    session.set("mx_draft", JSON.stringify(d));
    router.push("/create/character");
  }

  return (
    <div className="flex h-full flex-col bg-[#f5f5f7]">
      <PageHeader title="AI 创作助手" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {turns.map((t, i) =>
          t.role === "assistant" ? (
            <div key={i} className="mt-4 flex items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFE500]">
                <CatLogo className="h-5 w-6" />
              </span>
              <div className="min-w-0 max-w-[82%]">
                <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-[#1c1c1e]">{t.content}</div>
                {t.draft && (
                  <div className="mt-2.5 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-bold">{t.draft.name}</span>
                      <span className="rounded-full bg-[#f4f4f6] px-2 py-0.5 text-[11px] text-[#77777c]">{t.draft.gender}</span>
                      <span className="rounded-full bg-[#fff8cc] px-2 py-0.5 text-[11px] text-[#a08000]">{t.draft.voice}</span>
                    </div>
                    {t.draft.tags.length > 0 && <div className="mt-1.5 text-[12px] text-[#9a9aa0]">{t.draft.tags.map((x) => `#${x}`).join(" ")}</div>}
                    <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[#55555a]">{t.draft.intro}</p>
                    <p className="mt-2 rounded-xl bg-[#f6f6f8] p-2.5 text-[13px] leading-relaxed text-[#3a3a3c]">开场白：{t.draft.greeting}</p>
                    <button onClick={() => applyDraft(t.draft as CharacterDraft)} className="mt-3 h-10 w-full rounded-full bg-[#FFE500] text-[14px] font-semibold">
                      去完善并发布
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="mt-4 flex justify-end">
              <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-[#FFE500] px-3.5 py-2.5 text-[15px] leading-relaxed text-black">{t.content}</div>
            </div>
          ),
        )}
        {loading && (
          <div className="mt-4 flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFE500]">
              <CatLogo className="h-5 w-6" />
            </span>
            <div className="flex gap-1 rounded-2xl bg-white px-4 py-3.5">
              {[0, 1, 2].map((k) => (
                <span key={k} className="typing-dot h-1.5 w-1.5 rounded-full bg-[#8e8e93]" style={{ animationDelay: `${k * 0.18}s` }} />
              ))}
            </div>
          </div>
        )}
        {turns.length === 1 && (
          <div className="mt-4 flex flex-wrap gap-2 pl-11">
            {QUICK.map((q) => (
              <button key={q} onClick={() => void send(q)} className="rounded-full border border-[#e5e5ea] bg-white px-3 py-1.5 text-[13px] text-[#3a3a3c]">
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-[#ececef] bg-white px-3 py-2.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) void send(text);
          }}
          placeholder="说说你的想法…"
          maxLength={500}
          className="h-10 min-w-0 flex-1 rounded-full bg-[#f4f4f6] px-4 text-[15px] outline-none"
        />
        <button
          aria-label="发送"
          disabled={!text.trim() || loading}
          onClick={() => void send(text)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FFE500] text-black disabled:opacity-40"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
