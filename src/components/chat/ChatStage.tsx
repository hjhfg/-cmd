"use client";
import { local } from "@/lib/storage";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import type { ChatResponse, ConvInfo, FeedItem, Msg } from "@/lib/types";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { formatCount } from "@/lib/format";
import { cancelSpeech, createRecognizer, speakLines, transcriptOf, type Recognizer } from "@/lib/speech";
import { useApp } from "../AppProvider";
import { confirmDialog, toast, useGoBack } from "../ui";
import {
  BookIcon,
  BulbIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClockFill,
  CloseIcon,
  CommentFill,
  FaceSmallIcon,
  HeartFill,
  KeyboardIcon,
  MicIcon,
  MoreIcon,
  PhoneIcon,
  PlusCircleIcon,
  SendIcon,
  ShareFill,
  SpeakerIcon,
  SpeakerOffIcon,
} from "../icons";
import { IntroCard, MessageBubble, SystemPill, TypingBubble } from "./MessageList";
import { CommentsSheet, ContextSheet, HeartSheet, HistorySheet, IntroSheet, MemorySheet, ModeSheet, MorePanel, ShareSheet } from "./Sheets";
import CallOverlay from "./CallOverlay";

type SheetName = null | "more" | "history" | "comments" | "share" | "heart" | "memory" | "mode" | "intro";

export function AiGenLabel({ top = 62 }: { top?: number }) {
  return (
    <div
      className="pointer-events-none absolute left-2 z-20 flex flex-col items-center text-[10px] font-medium leading-[1.3] text-white/50 text-shadow"
      style={{ top }}
    >
      {["由", "AI", "生", "成"].map((s) => (
        <span key={s}>{s}</span>
      ))}
    </div>
  );
}

function ActionBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-[34px] flex-col items-center gap-[3px] text-white icon-shadow">
      {children}
      <span className="text-[11px] font-medium leading-none text-white">{label}</span>
    </button>
  );
}

function IconBtn({ label, onClick, children, dot }: { label: string; onClick: () => void; children: ReactNode; dot?: boolean }) {
  return (
    <button aria-label={label} onClick={onClick} className="relative grid h-10 w-10 shrink-0 place-items-center text-white">
      {children}
      {dot && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ff2d55]" />}
    </button>
  );
}

export default function ChatStage({ item, active, variant }: { item: FeedItem; active: boolean; variant: "feed" | "page" }) {
  const router = useRouter();
  const goBack = useGoBack();
  const { user, refresh, autoVoice, setAutoVoice } = useApp();
  const page = variant === "page";
  const isChar = item.type === "character";

  const [msgs, setMsgs] = useState<Msg[]>(item.opening);
  const [conv, setConv] = useState<ConvInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [newIds, setNewIds] = useState<number[]>([]);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [text, setText] = useState("");
  const [rec, setRec] = useState({ on: false, text: "", cancel: false });
  const [sheet, setSheet] = useState<SheetName>(null);
  const [inspire, setInspire] = useState<string[] | null>(null);
  const [inspiring, setInspiring] = useState(false);
  const [liked, setLiked] = useState(item.liked);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [shareCount, setShareCount] = useState(item.shareCount);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [likeAnim, setLikeAnim] = useState(0);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [calling, setCalling] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [plusDot, setPlusDot] = useState(false);
  const [typingEffect, setTypingEffect] = useState(true);
  const [contextOpen, setContextOpen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const recRef = useRef<Recognizer | null>(null);
  const recState = useRef({ text: "", startY: 0, cancel: false });
  const inputRef = useRef<HTMLInputElement>(null);
  const spokenRef = useRef(false);

  const charOf = (id: number | null) => item.characters.find((c) => c.id === id);
  const voiceOf = (m: Msg) => (m.role === "narrator" ? "旁白" : (charOf(m.characterId)?.voice ?? item.voice));

  useEffect(() => {
    setPlusDot(local.get("mx_plus_seen") !== "1");
    const loadExt = () => { apiGet<{ typingEffect: boolean }>("/api/studio?scope=extensions").then((x) => setTypingEffect(x.typingEffect)).catch(() => undefined); };
    loadExt();
    window.addEventListener("focus", loadExt);
    return () => window.removeEventListener("focus", loadExt);
  }, []);

  // 首次可见时加载会话
  useEffect(() => {
    if (!(active || page) || loaded) return;
    let cancelled = false;
    apiGet<ChatResponse>(`/api/chat?type=${item.type}&id=${item.id}`)
      .then((r) => {
        if (cancelled) return;
        setMsgs(r.messages);
        setConv(r.conversation);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [active, page, loaded, item.type, item.id]);

  // 自动播放开场语音
  useEffect(() => {
    if (!active) {
      if (spokenRef.current) cancelSpeech();
      spokenRef.current = false;
      recRef.current?.abort();
      return;
    }
    if (!autoVoice || !loaded || spokenRef.current) return;
    spokenRef.current = true;
    const group: Msg[] = [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role === "user") break;
      if (m.role === "character" || m.role === "narrator") group.unshift(m);
    }
    speakLines(group.slice(-3).map((m) => ({ text: m.content, voice: voiceOf(m) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, autoVoice, loaded]);

  // 自动滚动到底部
  useEffect(() => {
    const el = listRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    const onScroll = () => {
      stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      if (stickRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(inner);
    el.scrollTop = el.scrollHeight;
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = true;
    el.scrollTop = el.scrollHeight;
  }, [msgs.length, waiting, inspire]);

  function apply(r: ChatResponse, speak = true) {
    setMsgs(r.messages);
    setConv(r.conversation);
    setNewIds(r.newIds ?? []);
    if (r.notice) toast(r.notice);
    if (speak && autoVoice && r.newIds?.length) {
      const ids = new Set(r.newIds);
      const lines = r.messages.filter((m) => ids.has(m.id) && (m.role === "character" || m.role === "narrator"));
      speakLines(lines.map((m) => ({ text: m.content, voice: voiceOf(m) })));
    }
  }

  async function send(content: string) {
    const c = content.trim();
    if (!c || waiting) return;
    setInspire(null);
    setText("");
    cancelSpeech();
    const temp: Msg = { id: -Date.now(), role: "user", speaker: "我", characterId: null, content: c };
    setMsgs((m) => [...m, temp]);
    setWaiting(true);
    try {
      const r = await apiSend<ChatResponse>("/api/chat", { type: item.type, id: item.id, action: "send", content: c });
      apply(r);
      void refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "网络开小差了，请重试");
      setMsgs((m) => m.filter((x) => x.id !== temp.id));
      setText(c);
    } finally {
      setWaiting(false);
    }
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const busy = action === "regenerate" || action === "rewind";
    if (busy) setWaiting(true);
    try {
      const r = await apiSend<ChatResponse>("/api/chat", { type: item.type, id: item.id, action, ...extra });
      apply(r);
      void refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "操作失败，请重试");
    } finally {
      if (busy) setWaiting(false);
    }
  }

  async function toggleLike(onlyLike = false) {
    if (onlyLike && liked) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    setLikeAnim((a) => a + 1);
    try {
      const r = await apiSend<{ liked: boolean; likeCount: number }>("/api/interact", { action: "like", type: item.type, id: item.id });
      setLiked(r.liked);
      setLikeCount(r.likeCount);
    } catch {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
    }
  }

  function onDoubleClick(e: RMouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-nolike]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const h = { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top };
    setHearts((hs) => [...hs, h]);
    window.setTimeout(() => setHearts((hs) => hs.filter((x) => x.id !== h.id)), 900);
    void toggleLike(true);
  }

  /* ----------------------------- 按住说话 ----------------------------- */

  function startRec(e: RPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    const r = createRecognizer(true);
    if (!r) {
      toast("当前浏览器不支持语音输入，已切换为键盘输入");
      setInputMode("text");
      window.setTimeout(() => inputRef.current?.focus(), 60);
      return;
    }
    cancelSpeech();
    recState.current = { text: "", startY: e.clientY, cancel: false };
    r.onresult = (ev) => {
      const t = transcriptOf(ev);
      recState.current.text = t.text;
      setRec((s) => ({ ...s, text: t.text }));
    };
    r.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") toast("请允许使用麦克风后再试");
    };
    r.onend = () => {
      recRef.current = null;
      const { text: t, cancel } = recState.current;
      setRec({ on: false, text: "", cancel: false });
      if (cancel) return;
      if (t.trim()) void send(t);
      else toast("没有听清，请再说一遍");
    };
    recRef.current = r;
    try {
      r.start();
      setRec({ on: true, text: "", cancel: false });
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      toast("语音启动失败，请重试");
    }
  }

  function moveRec(e: RPointerEvent<HTMLButtonElement>) {
    if (!recRef.current) return;
    const cancel = recState.current.startY - e.clientY > 70;
    if (cancel !== recState.current.cancel) {
      recState.current.cancel = cancel;
      setRec((s) => ({ ...s, cancel }));
    }
  }

  function endRec() {
    recRef.current?.stop();
  }

  function insertBrackets() {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + "（）" + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 1, start + 1);
    });
  }

  /* ----------------------------- 更多操作 ----------------------------- */

  async function getInspire() {
    setSheet(null);
    setInspiring(true);
    try {
      const r = await apiSend<{ suggestions: string[] }>("/api/chat/extra", { kind: "inspire", type: item.type, id: item.id });
      setInspire(r.suggestions);
      void refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "获取灵感失败");
    } finally {
      setInspiring(false);
    }
  }

  async function restart() {
    setSheet(null);
    const ok = await confirmDialog({ title: "重新开始", content: "将清空当前聊天记录，从开场白重新开始，确定吗？", okText: "重新开始", danger: true });
    if (ok) await act("restart");
  }

  function onMore(id: string) {
    if (plusDot) {
      setPlusDot(false);
      local.set("mx_plus_seen", "1");
    }
    switch (id) {
      case "inspire":
        void getInspire();
        break;
      case "heart":
        setSheet("heart");
        break;
      case "regenerate":
        setSheet(null);
        void act("regenerate");
        break;
      case "mode":
        setSheet("mode");
        break;
      case "memory":
        setSheet("memory");
        break;
      case "persona":
        router.push(conv ? `/personas?conversation=${conv.id}` : "/personas");
        break;
      case "call":
        setSheet(null);
        cancelSpeech();
        setCalling(true);
        break;
      case "theater":
        router.push(`/theater/${item.id}`);
        break;
      case "history":
        setSheet("history");
        break;
      case "restart":
        void restart();
        break;
      case "profile":
        router.push(`/work/${item.type}/${item.id}`);
        break;
      case "report":
        setSheet(null);
        toast("举报已提交，我们会尽快核实处理");
        break;
    }
  }

  const chapterIdx = conv?.chapter ?? 0;
  const chapter = item.chapters[chapterIdx];
  const close = () => setSheet(null);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-neutral-900" onDoubleClick={onDoubleClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.cover} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[66%] bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

      {page && (
        <>
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-1.5 pt-2" data-nolike>
            <button aria-label="返回" onClick={goBack} className="p-2 text-white icon-shadow">
              <ChevronLeft className="h-7 w-7" />
            </button>
            <div className="flex items-center">
              <button aria-label="自动播放" onClick={() => setAutoVoice(!autoVoice)} className="p-2 text-white icon-shadow">
                {autoVoice ? <SpeakerIcon className="h-[26px] w-[26px]" /> : <SpeakerOffIcon className="h-[26px] w-[26px]" />}
              </button>
              <button
                data-nolike
                aria-label="下一条消息的上下文"
                onClick={() => setContextOpen(true)}
                className="mr-0.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur-md"
                style={{ background: "rgba(0,0,0,.34)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.22)" }}
              >
                <BookIcon className="h-3 w-3" />
                下文
              </button>
              <button aria-label="更多" onClick={() => setSheet("more")} className="p-2 text-white icon-shadow">
                <MoreIcon className="h-[26px] w-[26px]" />
              </button>
            </div>
          </div>
          <AiGenLabel top={64} />
        </>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col">
        {item.type === "story" && chapter && (
          <div className="mx-3 mb-1 self-start" data-nolike>
            <button
              onClick={() => setGoalOpen((o) => !o)}
              className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 text-[12px] text-white/90 backdrop-blur-md"
            >
              <BookIcon className="h-3.5 w-3.5" />
              {conv?.finished ? "故事已完结" : `第${chapterIdx + 1}章 · ${chapter.title}`}
              <ChevronDown className={`h-3 w-3 transition ${goalOpen ? "rotate-180" : ""}`} />
            </button>
            {goalOpen && (
              <div className="anim-pop mt-1.5 max-w-[270px] rounded-xl bg-black/60 px-3 py-2 text-[12px] leading-relaxed text-white/90 backdrop-blur-md">
                {conv?.finished
                  ? "恭喜达成结局！可在「历史」中重新开始，探索不同结局。"
                  : chapter.goal
                    ? `章节目标：${chapter.goal.replace(/用户/g, "你")}`
                    : "本章没有目标，故事可以自由进行～"}
              </div>
            )}
          </div>
        )}

        <div ref={listRef} className={`mask-top no-scrollbar overflow-y-auto overscroll-contain px-3 ${page ? "max-h-[60vh]" : "max-h-[44vh]"}`}>
          <div ref={innerRef} className="flex flex-col gap-2.5 pb-2 pt-10">
            {item.intro && <IntroCard text={item.intro} onExpand={() => setSheet("intro")} />}
            {msgs.map((m) =>
              m.role === "system" ? (
                <SystemPill key={m.id} text={m.content} />
              ) : (
                <MessageBubble
                  key={m.id}
                  m={m}
                  type={item.type}
                  char={charOf(m.characterId)}
                  animate={typingEffect && newIds.includes(m.id)}
                  onTap={() => speakLines([{ text: m.content, voice: voiceOf(m) }])}
                />
              ),
            )}
            {waiting && <TypingBubble />}
          </div>
        </div>

        {(inspire || inspiring) && (
          <div className="mx-3 mt-1 rounded-2xl bg-black/45 p-2.5 backdrop-blur-md" data-nolike>
            <div className="mb-1.5 flex items-center justify-between px-1 text-[12px] text-white/80">
              <span className="flex items-center gap-1">
                <BulbIcon className="h-3.5 w-3.5 text-[#FFE500]" />
                灵感回复
              </span>
              {inspire && (
                <button aria-label="关闭" onClick={() => setInspire(null)} className="p-0.5">
                  <CloseIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            {inspiring ? (
              <div className="space-y-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="shimmer h-9 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {inspire?.map((s, i) => (
                  <button key={i} onClick={() => void send(s)} className="block w-full rounded-xl bg-white/90 px-3 py-2 text-left text-[14px] text-[#1c1c1e]">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-end justify-between gap-3 px-4 pb-1 pt-2.5" data-nolike>
          <div className="min-w-0 flex-1">
            <Link href={`/work/${item.type}/${item.id}`} className="flex max-w-full items-center gap-1 text-[17px] font-semibold text-white text-shadow">
              {isChar && <FaceSmallIcon className="h-[18px] w-[18px] shrink-0" />}
              <span className="truncate">{item.title}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Link>
            <div className="mt-0.5 flex items-center gap-3 text-[13px] text-white/75 text-shadow">
              <span className="truncate">@{item.creatorName}</span>
              <span className="shrink-0">{formatCount(item.chatCount)}人聊过</span>
            </div>
          </div>
          <div className="flex shrink-0 items-end gap-[14px]">
            <ActionBtn label={formatCount(likeCount)} onClick={() => void toggleLike()}>
              <HeartFill key={likeAnim} className={`h-[30px] w-[30px] ${liked ? "like-pop text-[#ff2c55]" : "text-white"}`} />
            </ActionBtn>
            <ActionBtn label={formatCount(shareCount)} onClick={() => setSheet("share")}>
              <ShareFill className="h-[30px] w-[30px]" />
            </ActionBtn>
            <ActionBtn label={formatCount(commentCount)} onClick={() => setSheet("comments")}>
              <CommentFill className="h-[30px] w-[30px]" />
            </ActionBtn>
            <ActionBtn label="历史" onClick={() => setSheet("history")}>
              <ClockFill className="h-[29px] w-[29px]" />
            </ActionBtn>
          </div>
        </div>

        <div className="px-3 pb-3 pt-2" data-nolike>
          {rec.on && (
            <div className="mb-2 flex flex-col items-center">
              {rec.text && <div className="mb-2 max-w-[85%] rounded-2xl bg-black/60 px-3.5 py-2 text-[14px] text-white backdrop-blur">{rec.text}</div>}
              <span className={`text-[12px] text-shadow ${rec.cancel ? "text-[#ff6b6b]" : "text-white/85"}`}>{rec.cancel ? "松开手指，取消发送" : "松开发送，上滑取消"}</span>
            </div>
          )}
          <div
            className={`flex h-[52px] items-center gap-0.5 rounded-2xl px-1.5 backdrop-blur-xl ${
              rec.on ? (rec.cancel ? "bg-[#ff3b30]/90" : "bg-black") : "border border-white/10 bg-white/[0.2]"
            }`}
          >
            {rec.on ? (
              <div className="flex flex-1 items-center justify-center gap-[3px]">
                {Array.from({ length: 30 }).map((_, i) => (
                  <span
                    key={i}
                    className="wave-bar w-[3px] rounded-full bg-white"
                    style={{ height: `${6 + ((i * 7) % 19)}px`, animationDelay: `${(i % 7) * 0.09}s` }}
                  />
                ))}
              </div>
            ) : inputMode === "voice" ? (
              <>
                {isChar && (
                  <IconBtn
                    label="语音通话"
                    onClick={() => {
                      cancelSpeech();
                      setCalling(true);
                    }}
                  >
                    <PhoneIcon className="h-[25px] w-[25px]" />
                  </IconBtn>
                )}
                <button
                  className="h-full flex-1 touch-none select-none text-[17px] font-semibold tracking-wide text-white"
                  onPointerDown={startRec}
                  onPointerMove={moveRec}
                  onPointerUp={endRec}
                  onPointerCancel={endRec}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  按住说话
                </button>
                <IconBtn
                  label="键盘输入"
                  onClick={() => {
                    setInputMode("text");
                    window.setTimeout(() => inputRef.current?.focus(), 60);
                  }}
                >
                  <KeyboardIcon className="h-[27px] w-[27px]" />
                </IconBtn>
                <IconBtn label="更多" onClick={() => setSheet("more")} dot={plusDot}>
                  <PlusCircleIcon className="h-[27px] w-[27px]" />
                </IconBtn>
              </>
            ) : (
              <>
                <IconBtn label="语音输入" onClick={() => setInputMode("voice")}>
                  <MicIcon className="h-[27px] w-[27px]" />
                </IconBtn>
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void send(text);
                    }
                  }}
                  placeholder={waiting ? "Ta正在输入…" : "发消息…"}
                  enterKeyHint="send"
                  maxLength={1000}
                  className="h-full min-w-0 flex-1 select-text bg-transparent px-1.5 text-[16px] text-white outline-none placeholder:text-white/55"
                />
                <button onClick={insertBrackets} aria-label="插入动作括注" className="h-8 shrink-0 rounded-full bg-white/20 px-2.5 text-[13px] font-semibold text-white">
                  （ ）
                </button>
                {/* 下文：一眼看到这条消息会带上什么上下文 */}
                <button
                  data-nolike
                  onClick={() => setContextOpen(true)}
                  aria-label="下一条消息的上下文"
                  className="flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold text-white"
                  style={{ background: "rgba(255,229,0,.16)", boxShadow: "inset 0 0 0 1px rgba(255,229,0,.34)" }}
                >
                  <BookIcon className="h-3 w-3" />
                  下文
                </button>
                {text.trim() ? (
                  <button
                    aria-label="发送"
                    onClick={() => void send(text)}
                    disabled={waiting}
                    className="ml-1 mr-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFE500] text-black disabled:opacity-50"
                  >
                    <SendIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <IconBtn label="更多" onClick={() => setSheet("more")}>
                    <PlusCircleIcon className="h-[27px] w-[27px]" />
                  </IconBtn>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {hearts.map((h) => (
        <HeartFill key={h.id} className="heart-fly pointer-events-none absolute z-30 h-24 w-24 text-[#ff2c55] drop-shadow-lg" style={{ left: h.x, top: h.y }} />
      ))}

      <ContextSheet open={contextOpen} onClose={() => setContextOpen(false)} item={item} conv={conv} />
      <MorePanel open={sheet === "more"} onClose={close} item={item} conv={conv} onAction={onMore} />
      <HistorySheet
        open={sheet === "history"}
        onClose={close}
        msgs={msgs}
        item={item}
        onRewind={async (id) => {
          const ok = await confirmDialog({ title: "回溯到这里", content: "该节点之后的对话将被删除，确定回溯吗？", okText: "回溯" });
          if (!ok) return;
          setSheet(null);
          await act("rewind", { messageId: id });
        }}
        onRestart={() => void restart()}
      />
      <CommentsSheet open={sheet === "comments"} onClose={close} item={item} count={commentCount} onCount={setCommentCount} />
      <ShareSheet open={sheet === "share"} onClose={close} item={item} onShared={setShareCount} />
      {isChar && (
        <HeartSheet open={sheet === "heart"} onClose={close} item={item} onSpent={() => void refresh()} />
      )}
      <MemorySheet
        open={sheet === "memory"}
        onClose={close}
        value={conv?.memory ?? ""}
        onSave={(v) => {
          setSheet(null);
          void act("memory", { memory: v });
        }}
      />
      <ModeSheet
        open={sheet === "mode"}
        onClose={close}
        mode={conv?.mode ?? "normal"}
        onChange={(m) => {
          setSheet(null);
          void act("mode", { mode: m });
        }}
      />
      <IntroSheet open={sheet === "intro"} onClose={close} item={item} />

      {calling && <CallOverlay item={item} onClose={() => setCalling(false)} onSent={(r) => apply(r, false)} />}
    </div>
  );
}
