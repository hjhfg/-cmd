"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import type { CommentInfo, ConvInfo, FeedItem, HeartKind, HeartResult, Msg } from "@/lib/types";
import { formatCount, relTime } from "@/lib/format";
import { Avatar, Sheet, Spinner, toast } from "../ui";
import { RichText } from "./MessageList";
import {
  BrainIcon,
  BulbIcon,
  EditIcon,
  HomeIcon,
  CheckIcon,
  ChevronLeft,
  CopyIcon,
  FlagIcon,
  HeartFill,
  HeartSparkIcon,
  PhoneIcon,
  PlayIcon,
  RefreshIcon,
  RestartIcon,
  SearchIcon,
  SparkleIcon,
  ThumbDownIcon,
  UserCardIcon,
} from "../icons";

type IconT = ComponentType<SVGProps<SVGSVGElement>>;

function HistoryIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/* ------------------------------ ⊕ 更多 ------------------------------ */

export function MorePanel({
  open,
  onClose,
  item,
  conv,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  item: FeedItem;
  conv: ConvInfo | null;
  onAction: (id: string) => void;
}) {
  const isChar = item.type === "character";
  const list: { id: string; label: string; icon: IconT; on?: boolean }[] = [
    { id: "inspire", label: "灵感回复", icon: BulbIcon },
    ...(isChar ? [{ id: "heart", label: "心动指令", icon: HeartSparkIcon }] : []),
    { id: "regenerate", label: "重新生成", icon: RefreshIcon },
    { id: "mode", label: conv?.mode === "heart" ? "心动模式" : "对话模式", icon: SparkleIcon, on: conv?.mode === "heart" },
    { id: "memory", label: "记忆", icon: BrainIcon, on: !!conv?.memory },
    { id: "persona", label: "切换身份", icon: UserCardIcon },
    isChar ? { id: "call", label: "语音通话", icon: PhoneIcon } : { id: "theater", label: "AI剧场", icon: PlayIcon },
    { id: "history", label: "历史回溯", icon: HistoryIcon },
    { id: "restart", label: "重新开始", icon: RestartIcon },
    { id: "profile", label: isChar ? "角色主页" : "故事详情", icon: UserCardIcon },
    { id: "report", label: "举报", icon: FlagIcon },
  ];
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-[#e2e2e6]" />
      <div className="grid grid-cols-4 gap-y-5 px-3 pb-8 pt-5">
        {list.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.id} onClick={() => onAction(a.id)} className="flex flex-col items-center gap-2">
              <span className={`relative grid h-[56px] w-[56px] place-items-center rounded-2xl ${a.on ? "bg-[#FFE500] text-black" : "bg-[#f4f4f6] text-[#2c2c2e]"}`}>
                <Icon className="h-[26px] w-[26px]" />
              </span>
              <span className="text-[12px] text-[#3a3a3c]">{a.label}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ------------------------------ 历史 ------------------------------ */

export function HistorySheet({
  open,
  onClose,
  msgs,
  item,
  onRewind,
  onRestart,
}: {
  open: boolean;
  onClose: () => void;
  msgs: Msg[];
  item: FeedItem;
  onRewind: (id: number) => void;
  onRestart: () => void;
}) {
  const colorOf = (m: Msg) =>
    m.role === "user" ? "#c99a00" : m.role === "narrator" ? "#8e8e93" : (item.characters.find((c) => c.id === m.characterId)?.color ?? "#4b4f8f");
  return (
    <Sheet open={open} onClose={onClose} title="历史记录" full>
      <div className="flex items-center justify-between px-4 pb-2 text-[12px] text-[#9a9aa0]">
        <span>点击「回溯」可回到任意节点重新发展剧情</span>
        <button onClick={onRestart} className="flex shrink-0 items-center gap-1 rounded-full border border-[#e5e5ea] px-3 py-1 text-[12px] text-[#3a3a3c]">
          <RestartIcon className="h-3.5 w-3.5" />
          重新开始
        </button>
      </div>
      {msgs.map((m, i) =>
        m.role === "system" ? (
          <div key={m.id} className="my-2 flex items-center gap-3 px-4 text-[12px] text-[#9a9aa0]">
            <span className="h-px flex-1 bg-[#eee]" />
            {m.content}
            <span className="h-px flex-1 bg-[#eee]" />
          </div>
        ) : (
          <div key={m.id} className="flex gap-3 border-b border-[#f4f4f6] px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold" style={{ color: colorOf(m) }}>
                {m.role === "user" ? "我" : m.role === "narrator" ? "旁白" : m.speaker}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-[14px] leading-[1.65] text-[#2c2c2e]">
                <RichText text={m.content} dim="text-[#9a9aa0]" />
              </div>
            </div>
            {m.id > 0 && i < msgs.length - 1 && (
              <button onClick={() => onRewind(m.id)} className="shrink-0 self-center rounded-full bg-[#f4f4f6] px-3 py-1 text-[12px] text-[#3a3a3c]">
                回溯
              </button>
            )}
          </div>
        ),
      )}
      <div className="h-6" />
    </Sheet>
  );
}

/* ------------------------------ 评论 ------------------------------ */

export function CommentsSheet({
  open,
  onClose,
  item,
  count,
  onCount,
}: {
  open: boolean;
  onClose: () => void;
  item: FeedItem;
  count: number;
  onCount: (n: number) => void;
}) {
  const [list, setList] = useState<CommentInfo[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setList(null);
    apiGet<{ comments: CommentInfo[] }>(`/api/interact?type=${item.type}&id=${item.id}`)
      .then((r) => setList(r.comments))
      .catch(() => setList([]));
  }, [open, item.type, item.id]);

  async function submit() {
    const c = text.trim();
    if (!c || sending) return;
    setSending(true);
    try {
      const r = await apiSend<{ comment: CommentInfo; commentCount: number }>("/api/interact", { action: "comment", type: item.type, id: item.id, content: c });
      setList((l) => [r.comment, ...(l ?? [])]);
      onCount(r.commentCount);
      setText("");
      toast("评论成功");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "评论失败");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`${formatCount(count)}条评论`} full>
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list === null ? (
            <div className="grid h-40 place-items-center text-[#c7c7cc]">
              <Spinner />
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center text-[14px] text-[#9a9aa0]">还没有评论，快来抢沙发吧～</div>
          ) : (
            list.map((c) => {
              const on = liked.includes(c.id);
              return (
                <div key={c.id} className="flex gap-3 px-4 py-3">
                  <Avatar src={c.userAvatar || undefined} name={c.userName} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-[#8a8a8f]">
                      {c.userName}
                      {c.mine && <span className="ml-1.5 rounded bg-[#FFE500] px-1 text-[10px] text-black">我</span>}
                    </div>
                    <div className="mt-1 break-words text-[15px] leading-relaxed text-[#1c1c1e]">{c.content}</div>
                    <div className="mt-1.5 text-[12px] text-[#b0b0b5]">{relTime(c.createdAt)} · 回复</div>
                  </div>
                  <button
                    onClick={() => setLiked((l) => (on ? l.filter((x) => x !== c.id) : [...l, c.id]))}
                    className="flex shrink-0 flex-col items-center pt-1 text-[11px] text-[#9a9aa0]"
                  >
                    <HeartFill className={`h-[18px] w-[18px] ${on ? "like-pop text-[#ff2c55]" : "text-[#d1d1d6]"}`} />
                    {c.likeCount + (on ? 1 : 0)}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-[#f2f2f4] px-3 py-2.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) void submit();
            }}
            placeholder="留下你的精彩评论吧"
            maxLength={300}
            className="h-10 min-w-0 flex-1 rounded-full bg-[#f4f4f6] px-4 text-[14px] outline-none"
          />
          <button disabled={!text.trim() || sending} onClick={() => void submit()} className="h-10 shrink-0 rounded-full bg-[#FFE500] px-4 text-[14px] font-semibold disabled:opacity-40">
            发送
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------ 分享 ------------------------------ */

async function copyText(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

const SHARE_TARGETS = [
  { k: "wechat", label: "微信好友", bg: "#07c160", t: "微" },
  { k: "moments", label: "朋友圈", bg: "#1aad19", t: "圈" },
  { k: "qq", label: "QQ", bg: "#12b7f5", t: "Q" },
  { k: "qzone", label: "QQ空间", bg: "#f8c41a", t: "空" },
  { k: "douyin", label: "抖音", bg: "#111111", t: "抖" },
];

export function ShareSheet({ open, onClose, item, onShared }: { open: boolean; onClose: () => void; item: FeedItem; onShared: (n: number) => void }) {
  async function share(label: string) {
    const url = `${window.location.origin}/chat/${item.type}/${item.id}`;
    const ok = await copyText(`【猫箱】${item.title}：${item.intro.slice(0, 40)}… 点击和Ta聊天 ${url}`);
    toast(ok ? (label === "复制链接" ? "链接已复制" : `链接已复制，快去${label}分享吧`) : "复制失败");
    onClose();
    try {
      const r = await apiSend<{ shareCount: number }>("/api/interact", { action: "share", type: item.type, id: item.id });
      onShared(r.shareCount);
    } catch {
      /* ignore */
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="分享至">
      <div className="no-scrollbar flex gap-5 overflow-x-auto px-5 pb-4 pt-1">
        {SHARE_TARGETS.map((s) => (
          <button key={s.k} onClick={() => void share(s.label)} className="flex shrink-0 flex-col items-center gap-2">
            <span className="grid h-[52px] w-[52px] place-items-center rounded-full text-[18px] font-bold text-white" style={{ background: s.bg }}>
              {s.t}
            </span>
            <span className="text-[12px] text-[#3a3a3c]">{s.label}</span>
          </button>
        ))}
        <button onClick={() => void share("复制链接")} className="flex shrink-0 flex-col items-center gap-2">
          <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#f2f2f4] text-[#3a3a3c]">
            <CopyIcon className="h-6 w-6" />
          </span>
          <span className="text-[12px] text-[#3a3a3c]">复制链接</span>
        </button>
      </div>
      <div className="mx-5 h-px bg-[#f0f0f2]" />
      <div className="flex gap-5 px-5 pb-8 pt-4">
        <button
          onClick={() => {
            onClose();
            toast("举报已提交，我们会尽快核实处理");
          }}
          className="flex flex-col items-center gap-2"
        >
          <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#f2f2f4] text-[#3a3a3c]">
            <FlagIcon className="h-6 w-6" />
          </span>
          <span className="text-[12px] text-[#3a3a3c]">举报</span>
        </button>
        <button
          onClick={() => {
            onClose();
            toast("将减少此类内容的推荐");
          }}
          className="flex flex-col items-center gap-2"
        >
          <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-[#f2f2f4] text-[#3a3a3c]">
            <ThumbDownIcon className="h-6 w-6" />
          </span>
          <span className="text-[12px] text-[#3a3a3c]">不感兴趣</span>
        </button>
      </div>
    </Sheet>
  );
}

/* ------------------------------ 心动指令 ------------------------------ */

const HEART_OPTS: { k: HeartKind; title: string; desc: string; bg: string; icon: IconT }[] = [
  { k: "home", title: "看Ta主页", desc: "Ta的动态与签名", bg: "from-[#ff9a9e] to-[#fbc2eb]", icon: HomeIcon },
  { k: "diary", title: "看Ta日记", desc: "Ta今天写了什么", bg: "from-[#f6d365] to-[#fda085]", icon: EditIcon },
  { k: "phone", title: "查Ta手机", desc: "备忘录与聊天记录", bg: "from-[#5ee7df] to-[#66a6ff]", icon: PhoneIcon },
  { k: "heart", title: "Ta的心声", desc: "此刻的真实想法", bg: "from-[#a18cd1] to-[#fbc2eb]", icon: HeartFill },
];

function HeartResultView({ res, item }: { res: HeartResult; item: FeedItem }) {
  const ch = item.characters[0];
  if (res.home) {
    return (
      <div className="overflow-hidden rounded-2xl bg-[#f7f7f9]">
        <div className="relative h-28 bg-cover bg-center" style={{ backgroundImage: `url("${item.cover}")` }}>
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <div className="-mt-8 px-4">
          <Avatar src={ch?.avatar} focus={ch?.avatarFocus} size={64} name={ch?.name} className="border-[3px] border-white" />
          <div className="mt-2 text-[18px] font-bold">{ch?.name}</div>
          <div className="mt-0.5 text-[13px] text-[#8a8a8f]">{res.home.signature}</div>
        </div>
        <div className="mt-4 space-y-2.5 px-3 pb-4">
          {res.home.posts.map((p, i) => (
            <div key={i} className="rounded-xl bg-white p-3.5">
              <p className="text-[14.5px] leading-relaxed text-[#1c1c1e]">{p.content}</p>
              <div className="mt-2 flex items-center justify-between text-[12px] text-[#a0a0a5]">
                <span>{p.time}</span>
                <span className="flex items-center gap-1">
                  <HeartFill className="h-3.5 w-3.5 text-[#ff6b8a]" />
                  {p.likes}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (res.diary) {
    return (
      <div className="rounded-2xl bg-[#fffaf0] p-5 shadow-[inset_0_0_0_1px_rgba(200,160,100,0.18)]">
        <div className="flex items-center justify-between border-b border-dashed border-[#e8d9bd] pb-2 text-[13px] text-[#a68b5b]">
          <span>{res.diary.date}</span>
          <span>天气：{res.diary.weather}</span>
        </div>
        <p className="paper-lines mt-3 font-serif text-[15.5px] leading-[30px] text-[#5a4630]">{res.diary.content}</p>
        <div className="mt-3 text-right font-serif text-[14px] text-[#a68b5b]">—— {ch?.name}</div>
      </div>
    );
  }
  if (res.phone) {
    return (
      <div className="rounded-[30px] bg-[#111] p-3">
        <div className="rounded-[22px] bg-[#f2f2f7] p-3.5">
          <div className="text-center text-[11px] text-[#8e8e93]">{ch?.name}的手机</div>
          <div className="mt-3 rounded-xl bg-[#fff8c4] p-3">
            <div className="text-[12px] font-semibold text-[#a08a00]">备忘录</div>
            <p className="mt-1 text-[14px] leading-relaxed text-[#3a3a3c]">{res.phone.memo}</p>
          </div>
          <div className="mt-3 rounded-xl bg-white p-3">
            <div className="text-[12px] font-semibold text-[#8e8e93]">最近搜索</div>
            {res.phone.searches.map((s, i) => (
              <div key={i} className="mt-2 flex items-center gap-2 text-[14px] text-[#3a3a3c]">
                <SearchIcon className="h-3.5 w-3.5 shrink-0 text-[#c7c7cc]" />
                {s}
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-white p-3">
            <div className="text-[12px] font-semibold text-[#8e8e93]">聊天记录</div>
            <div className="mt-2 space-y-2">
              {res.phone.chats.map((c, i) => {
                const me = c.from === ch?.name;
                return (
                  <div key={i} className={`flex ${me ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-1.5 text-[13.5px] ${me ? "bg-[#95ec69] text-black" : "bg-[#f2f2f7] text-[#1c1c1e]"}`}>
                      {!me && <div className="text-[10px] text-[#8e8e93]">{c.from}</div>}
                      {c.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (res.heart) {
    return (
      <div className="rounded-2xl bg-gradient-to-b from-[#fff0f5] to-white p-5">
        <div className="flex items-center gap-3">
          <Avatar src={ch?.avatar} focus={ch?.avatarFocus} size={56} name={ch?.name} />
          <div>
            <div className="text-[17px] font-bold">{ch?.name}</div>
            <span className="mt-1 inline-block rounded-full bg-[#ff4f81] px-2.5 py-0.5 text-[12px] text-white">心情：{res.heart.mood}</span>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-[13px] text-[#8a8a8f]">
            <span>心动值</span>
            <span className="font-semibold text-[#ff4f81]">{res.heart.affinity}</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#ffe1ea]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#ff9ab5] to-[#ff4f81]" style={{ width: `${Math.max(4, res.heart.affinity)}%` }} />
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-white p-4 text-[15px] leading-relaxed text-[#3a3a3c] shadow-sm">
          <div className="mb-1 text-[12px] text-[#ff4f81]">内心独白</div>“{res.heart.thought}”
        </div>
        {res.heart.status && <div className="mt-3 text-[13px] text-[#8a8a8f]">Ta正在：{res.heart.status}</div>}
      </div>
    );
  }
  return null;
}

export function HeartSheet({
  open,
  onClose,
  item,
  onSpent,
}: {
  open: boolean;
  onClose: () => void;
  item: FeedItem;
  onSpent: () => void;
}) {
  const [res, setRes] = useState<HeartResult | null>(null);
  const [loading, setLoading] = useState<HeartKind | null>(null);
  useEffect(() => {
    if (!open) {
      setRes(null);
      setLoading(null);
    }
  }, [open]);
  const ch = item.characters[0];

  async function run(k: HeartKind) {
    if (loading) return;
    setLoading(k);
    try {
      const r = await apiSend<{ result: HeartResult }>("/api/chat/extra", { kind: "heart", type: item.type, id: item.id, heartKind: k });
      setRes(r.result);
      onSpent();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "获取失败，请重试");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={res ? HEART_OPTS.find((o) => o.k === res.kind)?.title : "心动指令"} full>
      {!res ? (
        <div className="px-4 pb-6">
          <p className="text-center text-[13px] text-[#8a8a8f]">
            窥探{ch?.name ?? "Ta"}的小秘密 · 内容会随着你们的聊天而变化
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {HEART_OPTS.map((o) => (
              <button key={o.k} onClick={() => void run(o.k)} className={`relative h-32 overflow-hidden rounded-2xl bg-gradient-to-br ${o.bg} p-4 text-left text-white`}>
                <o.icon className="h-8 w-8 text-white" />
                <div className="mt-3 text-[16px] font-bold">{o.title}</div>
                <div className="text-[12px] opacity-90">{o.desc}</div>
                {loading === o.k && (
                  <div className="absolute inset-0 grid place-items-center bg-black/25">
                    <Spinner className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-[12px] text-[#b0b0b5]">内容会随着你们的聊天而变化哦～</p>
        </div>
      ) : (
        <div className="px-4 pb-8">
          <button onClick={() => setRes(null)} className="mb-3 flex items-center gap-0.5 text-[13px] text-[#8a8a8f]">
            <ChevronLeft className="h-4 w-4" />
            返回心动指令
          </button>
          <HeartResultView res={res} item={item} />
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------ 记忆 / 模式 / 简介 ------------------------------ */

export function MemorySheet({ open, onClose, value, onSave }: { open: boolean; onClose: () => void; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (open) setV(value);
  }, [open, value]);
  return (
    <Sheet open={open} onClose={onClose} title="记忆">
      <div className="px-4 pb-7">
        <p className="text-[13px] leading-relaxed text-[#8a8a8f]">告诉Ta需要记住的事，比如你的名字、喜好、你们之间的约定，Ta会在之后的对话中一直记得哦～</p>
        <textarea
          value={v}
          onChange={(e) => setV(e.target.value)}
          maxLength={500}
          rows={6}
          placeholder="例如：我叫小鱼，喜欢喝不加糖的拿铁，我们约好了周末一起去看海。"
          className="mt-3 w-full resize-none rounded-2xl bg-[#f4f4f6] p-3.5 text-[15px] leading-relaxed outline-none"
        />
        <div className="mt-1 text-right text-[12px] text-[#b0b0b5]">{v.length}/500</div>
        <button onClick={() => onSave(v.trim())} className="mt-3 h-12 w-full rounded-full bg-[#FFE500] text-[16px] font-semibold">
          保存记忆
        </button>
      </div>
    </Sheet>
  );
}

export function ModeSheet({
  open,
  onClose,
  mode,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  mode: "normal" | "heart";
  onChange: (m: "normal" | "heart") => void;
}) {
  const opts: { k: "normal" | "heart"; title: string; desc: string; tag: string }[] = [
    { k: "normal", title: "普通模式", desc: "默认模式，简洁自然的对话", tag: "" },
    { k: "heart", title: "心动模式", desc: "原灵动模式 · 角色更聪明有灵性，记忆力与情绪表现力大幅提升", tag: "推荐" },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="对话模式">
      <div className="space-y-3 px-4 pb-7">
        {opts.map((o) => (
          <button
            key={o.k}
            onClick={() => onChange(o.k)}
            className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left ${mode === o.k ? "border-[#FFE500] bg-[#fffbe0]" : "border-transparent bg-[#f6f6f8]"}`}
          >
            <span
              className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${o.k === "heart" ? "bg-gradient-to-br from-[#ff7eb3] to-[#ff4f81] text-white" : "bg-white text-[#3a3a3c]"}`}
            >
              {o.k === "heart" ? <HeartSparkIcon className="h-5 w-5" /> : <SparkleIcon className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[16px] font-semibold">
                {o.title}
                {o.tag && <span className="rounded-full bg-[#ffe9f0] px-2 py-0.5 text-[11px] font-medium text-[#ff4f81]">{o.tag}</span>}
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-[#8a8a8f]">{o.desc}</span>
            </span>
            {mode === o.k && <CheckIcon className="mt-1 h-5 w-5 shrink-0" />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export function IntroSheet({ open, onClose, item }: { open: boolean; onClose: () => void; item: FeedItem }) {
  return (
    <Sheet open={open} onClose={onClose} title={item.type === "story" ? "故事简介" : "角色简介"}>
      <div className="px-5 pb-8">
        <p className="whitespace-pre-wrap text-[15px] leading-[1.8] text-[#2c2c2e]">{item.intro}</p>
        {item.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.tags.map((t) => (
              <span key={t} className="rounded-full bg-[#f4f4f6] px-3 py-1 text-[12px] text-[#55555a]">
                #{t}
              </span>
            ))}
          </div>
        )}
        {item.type === "story" && item.characters.length > 0 && (
          <div className="mt-5">
            <div className="text-[13px] font-semibold text-[#8a8a8f]">出场角色</div>
            <div className="mt-2 flex gap-4">
              {item.characters.map((c) => (
                <div key={c.id} className="flex flex-col items-center gap-1">
                  <Avatar src={c.avatar} focus={c.avatarFocus} size={48} name={c.name} />
                  <span className="text-[12px]">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <Link href={`/work/${item.type}/${item.id}`} className="mt-6 flex h-11 items-center justify-center rounded-full bg-[#f4f4f6] text-[14px] font-medium">
          查看{item.type === "story" ? "故事详情" : "角色主页"}
        </Link>
      </div>
    </Sheet>
  );
}

/* ---------------------------- 下文（上下文装配） ---------------------------- */

type CtxItem = { label: string; value: string; on: boolean; href: string; tint: string };

/**
 * 聊天页的「下文」浮层：把这一条消息真正会带上的上下文摊开，
 * 与「我的 · 上下文装配」共享同一套读数，方便随时确认人设、语气、世界书是否生效。
 */
export function ContextSheet({ open, onClose, item, conv }: { open: boolean; onClose: () => void; item: FeedItem; conv: ConvInfo | null }) {
  const [items, setItems] = useState<CtxItem[] | null>(null);
  const [rules, setRules] = useState<{ total: number; on: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    let alive = true;
    (async () => {
      const [p, pr, w, e, rg] = await Promise.allSettled([
        fetchJson<{ items: { id: number; name: string; description: string; isDefault: boolean }[] }>("/api/studio?scope=personas"),
        fetchJson<{ items: { name: string; isActive: boolean }[] }>("/api/studio?scope=prompts"),
        fetchJson<{ books: { id: number; name: string; enabled: boolean }[] }>("/api/studio?scope=world"),
        fetchJson<Record<string, boolean>>("/api/studio?scope=extensions"),
        fetchJson<{ items: { name: string; enabled: boolean }[] }>("/api/regex"),
      ]);
      if (!alive) return;
      const persona = p.status === "fulfilled" ? p.value.items?.find((x) => x.isDefault) ?? p.value.items?.[0] : undefined;
      const prompt = pr.status === "fulfilled" ? pr.value.items?.find((x) => x.isActive) : undefined;
      const books = w.status === "fulfilled" ? (w.value.books ?? []).filter((b) => b.enabled) : [];
      const ext = e.status === "fulfilled" ? e.value : {};
      const extOn = Object.entries(ext ?? {}).filter(([, v]) => v);
      const ruleList = rg.status === "fulfilled" ? rg.value.items ?? [] : [];
      const ruleOn = ruleList.filter((r) => r.enabled);
      setRules({ total: ruleList.length, on: ruleOn.length });
      setItems([
        {
          label: "用户人设",
          value: persona ? `${persona.name} · ${persona.description.length} 字` : "未设置",
          on: Boolean(persona),
          href: "/personas",
          tint: "#FFE500",
        },
        { label: "语气预设", value: prompt ? prompt.name : "内置风格", on: Boolean(prompt), href: "/prompts", tint: "#FF8FAE" },
        { label: "世界书", value: books.length ? `${books.length} 本 · ${books[0].name}` : "未启用", on: books.length > 0, href: "/worldbook", tint: "#5FE0AE" },
        { label: "正则规则", value: ruleOn.length ? `${ruleOn.length} 条生效` : ruleList.length ? "全部关闭" : "未创建", on: ruleOn.length > 0, href: "/regex", tint: "#D8A657" },
        { label: "扩展模块", value: extOn.length ? extOn.length + "/5" : "全部关闭", on: extOn.length > 0, href: "/extensions", tint: "#9CB4FF" },
      ]);
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  const heart = conv?.mode === "heart";
  return (
    <Sheet open={open} onClose={onClose} title="下文" full>
      <div className="px-4 pb-10">
        <div className="rounded-2xl bg-[#FFF8D2] px-4 py-3 text-[12px] leading-relaxed text-[#7A6620]">
          {item.type === "character" ? item.title : item.title} 的下一条回复会带上以下内容。
          {heart ? "当前为心动模式，情感描写会更强。" : ""}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white">
          {items === null
            ? [0, 1, 2].map((i) => <div key={i} className="h-[56px] border-b border-[#f2f2f4] last:border-0 shimmer opacity-60" />)
            : items.map((c, i) => (
                <Link key={c.label} href={c.href} onClick={onClose} className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-[#f2f2f4]" : ""}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.on ? c.tint : "#DDDCE2" }} />
                  <span className="min-w-0 flex-1">
                    <b className="text-[13.5px] text-[#1c1c1e]">{c.label}</b>
                    <span className="mt-[1px] block truncate text-[11.5px] text-[#9a9aa2]">{c.value}</span>
                  </span>
                  <span className="shrink-0 rounded-full px-2 py-[2px] font-mono text-[9px]" style={{ background: c.on ? "#F0F8F3" : "#F5F5F7", color: c.on ? "#1E9E6A" : "#A0A0AA" }}>
                    {c.on ? "ON" : "OFF"}
                  </span>
                </Link>
              ))}
        </div>

        {conv?.memory ? (
          <div className="mt-3 rounded-2xl bg-white px-4 py-3">
            <div className="text-[11px] font-semibold text-[#8a8a92]">记忆</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[#3a3a3c]">{conv.memory}</p>
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          <Link href="/regex" onClick={onClose} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white text-[13px] font-semibold text-[#1c1c1e] shadow-[inset_0_0_0_1px_#ECEAE2]">
            正则规则{rules ? ` · ${rules.on}/${rules.total}` : ""}
          </Link>
          <Link href="/me" onClick={onClose} className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#FFE500] text-[13px] font-bold text-[#14140F]">
            装配详情
          </Link>
        </div>
        <p className="mt-4 text-center text-[10.5px] leading-relaxed text-[#a5a5ad]">
          上下文按编号顺序注入模型，改动从下一条消息开始生效。
        </p>
      </div>
    </Sheet>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()) as T;
}
