"use client";

import { useEffect, useRef, useState } from "react";
import { apiSend } from "@/lib/api";
import type { ChatResponse, FeedItem } from "@/lib/types";
import { cancelSpeech, createRecognizer, speakLines, speechSupported, transcriptOf, type Recognizer } from "@/lib/speech";
import { Avatar, toast } from "../ui";
import { HangupIcon, MicLineIcon, MicOffIcon, SendIcon } from "../icons";
import { RichText } from "./MessageList";

type Status = "connecting" | "speaking" | "listening" | "thinking" | "idle";

const STATUS_TEXT: Record<Status, string> = {
  connecting: "正在接通…",
  speaking: "对方正在说话…",
  listening: "正在聆听，请说话…",
  thinking: "对方正在思考…",
  idle: "通话中",
};

export default function CallOverlay({ item, onClose, onSent }: { item: FeedItem; onClose: () => void; onSent: (r: ChatResponse) => void }) {
  const ch = item.characters[0];
  const [status, setStatus] = useState<Status>("connecting");
  const [subtitle, setSubtitle] = useState("");
  const [heard, setHeard] = useState("");
  const [muted, setMuted] = useState(false);
  const [secs, setSecs] = useState(0);
  const [typing, setTyping] = useState("");
  const [sttOk, setSttOk] = useState(true);
  const recRef = useRef<Recognizer | null>(null);
  const alive = useRef(true);
  const mutedRef = useRef(false);

  useEffect(() => {
    const t = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    alive.current = true;
    const w = window as unknown as Record<string, unknown>;
    setSttOk(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    const timer = window.setTimeout(async () => {
      const r = await apiSend<{ text: string }>("/api/chat/extra", { kind: "call-greet", type: item.type, id: item.id }).catch(() => ({ text: "喂？" }));
      if (alive.current) say(r.text);
    }, 1200);
    return () => {
      alive.current = false;
      window.clearTimeout(timer);
      recRef.current?.abort();
      cancelSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function say(text: string) {
    setStatus("speaking");
    setSubtitle(text);
    if (!speechSupported()) {
      window.setTimeout(() => alive.current && listen(), Math.min(6000, 1500 + text.length * 110));
      return;
    }
    speakLines([{ text, voice: ch?.voice ?? item.voice }], () => {
      if (alive.current) listen();
    });
  }

  function listen() {
    if (mutedRef.current) {
      setStatus("idle");
      return;
    }
    const rec = createRecognizer(false);
    if (!rec) {
      setStatus("idle");
      return;
    }
    recRef.current = rec;
    setStatus("listening");
    setHeard("");
    let finalText = "";
    rec.onresult = (e) => {
      const t = transcriptOf(e);
      setHeard(t.text);
      if (t.final) finalText = t.text;
    };
    rec.onerror = () => undefined;
    rec.onend = () => {
      recRef.current = null;
      if (!alive.current) return;
      const text = finalText.trim();
      if (text) void send(text);
      else if (!mutedRef.current) window.setTimeout(() => alive.current && listen(), 500);
      else setStatus("idle");
    };
    try {
      rec.start();
    } catch {
      setStatus("idle");
    }
  }

  async function send(text: string) {
    setStatus("thinking");
    setHeard(text);
    try {
      const r = await apiSend<ChatResponse>("/api/chat", { type: item.type, id: item.id, action: "send", content: text });
      onSent(r);
      const ids = new Set(r.newIds ?? []);
      const reply = r.messages
        .filter((m) => ids.has(m.id) && (m.role === "character" || m.role === "narrator"))
        .map((m) => m.content)
        .join(" ");
      if (alive.current) say(reply || "……");
    } catch {
      if (alive.current) {
        toast("网络开小差了");
        listen();
      }
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (next) {
      recRef.current?.abort();
      setStatus("idle");
    } else if (status !== "speaking" && status !== "thinking") {
      listen();
    }
  }

  function submitTyping() {
    const t = typing.trim();
    if (!t) return;
    setTyping("");
    recRef.current?.abort();
    void send(t);
  }

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="anim-fade absolute inset-0 z-[60] flex flex-col overflow-hidden bg-black text-white" data-nolike>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.cover} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl" />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex h-12 items-center justify-between px-4 text-[12px] text-white/60">
        <span>由AI生成 · 语音通话</span>
        <span>
          {mm}:{ss}
        </span>
      </div>
      <div className="relative mt-10 flex flex-col items-center">
        <div className="relative">
          {status === "speaking" && (
            <>
              <span className="call-ring absolute inset-0 rounded-full bg-white/30" />
              <span className="call-ring absolute inset-0 rounded-full bg-white/20" style={{ animationDelay: "0.6s" }} />
            </>
          )}
          <Avatar src={ch?.avatar} focus={ch?.avatarFocus} size={120} name={ch?.name} className="relative border-[3px] border-white/80" />
        </div>
        <div className="mt-5 text-[22px] font-semibold">{ch?.name ?? item.title}</div>
        <div className="mt-1.5 text-[13px] text-white/70">{muted ? "麦克风已关闭" : STATUS_TEXT[status]}</div>
      </div>
      <div className="relative mt-8 flex-1 overflow-y-auto px-8 text-center">
        {subtitle && (
          <p className="text-[16px] leading-relaxed text-white/95">
            <RichText text={subtitle} dim="text-white/55" />
          </p>
        )}
        {heard && <p className="mt-4 text-[14px] text-[#FFE500]/90">我：{heard}</p>}
      </div>
      {(!sttOk || status === "idle") && (
        <div className="relative mx-5 mb-4 flex h-11 items-center rounded-full bg-white/15 px-4 backdrop-blur">
          <input
            value={typing}
            onChange={(e) => setTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submitTyping();
            }}
            placeholder={sttOk ? "也可以在这里输入想说的话" : "当前浏览器不支持语音识别，可在此输入"}
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-white/50"
          />
          <button aria-label="发送" onClick={submitTyping} className="p-1">
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="relative flex items-center justify-around px-12 pb-12 pt-2">
        <button onClick={toggleMute} className="flex flex-col items-center gap-2 text-[12px] text-white/85">
          <span className={`grid h-16 w-16 place-items-center rounded-full ${muted ? "bg-white text-black" : "bg-white/20"}`}>
            {muted ? <MicOffIcon className="h-7 w-7" /> : <MicLineIcon className="h-7 w-7" />}
          </span>
          {muted ? "已静音" : "麦克风"}
        </button>
        <button
          onClick={() => {
            cancelSpeech();
            recRef.current?.abort();
            onClose();
            toast(`通话结束 ${mm}:${ss}`);
          }}
          className="flex flex-col items-center gap-2 text-[12px] text-white/85"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ff3b30]">
            <HangupIcon className="h-8 w-8" />
          </span>
          挂断
        </button>
      </div>
    </div>
  );
}
