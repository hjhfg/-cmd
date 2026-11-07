"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Avatar, Empty, Sheet, Spinner, confirmDialog, toast } from "@/components/ui";
import { BellIcon, ChevronRight, PinIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { apiGet, apiSend } from "@/lib/api";
import { chatTime, stripActions } from "@/lib/format";
import type { ConvListItem } from "@/lib/types";

export default function MessagesScreen({ visible }: { visible: boolean }) {
  const router = useRouter();
  const { refresh } = useApp();
  const [list, setList] = useState<ConvListItem[] | null>(null);
  const [notiUnread, setNotiUnread] = useState(0);
  const [notiPreview, setNotiPreview] = useState("点击查看互动消息");
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<ConvListItem | null>(null);
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ items: ConvListItem[]; notiUnread: number; notiPreview: string }>("/api/conversations");
      setList(r.items);
      setNotiUnread(r.notiUnread);
      setNotiPreview(r.notiPreview);
      void refresh();
    } catch {
      setList([]);
    }
  }, [refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  // 标签页保活：每次切回消息页都静默同步一次（不清空列表、不转圈）
  const wasVisible = useRef(visible);
  useEffect(() => {
    if (visible && !wasVisible.current) void load();
    wasVisible.current = visible;
  }, [visible, load]);

  const clearTimer = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  async function pin(c: ConvListItem) {
    setMenu(null);
    await apiSend("/api/conversations", { id: c.id, pinned: !c.pinned }, "PATCH");
    toast(c.pinned ? "已取消置顶" : "已置顶");
    void load();
  }

  async function del(c: ConvListItem) {
    setMenu(null);
    const ok = await confirmDialog({ title: "删除聊天", content: `删除后将清空与「${c.title}」的全部聊天记录`, okText: "删除", danger: true });
    if (!ok) return;
    await apiSend(`/api/conversations?id=${c.id}`, undefined, "DELETE");
    toast("已删除");
    void load();
  }

  const shown = (list ?? []).filter((c) => !q || c.title.includes(q) || c.lastMessage.includes(q));

  return (
    <div className="relative flex h-full flex-col bg-white">
      <header className="flex h-12 shrink-0 items-center justify-center text-[17px] font-semibold text-[#161616]">消息</header>
      <div className="shrink-0 px-4 pb-2">
        <div className="flex h-9 items-center gap-2 rounded-full bg-[#f2f2f4] px-3.5">
          <SearchIcon className="h-4 w-4 text-[#a0a0a5]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索聊过的角色和故事"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#a0a0a5]"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Link href="/messages/interactions" className="flex items-center gap-3 px-4 py-3">
          <div className="relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-[#FFE500] text-black">
            <BellIcon className="h-6 w-6" />
            {notiUnread > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#ff2d55] px-1 text-center text-[11px] font-semibold leading-[18px] text-white ring-2 ring-white">
                {notiUnread}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-medium text-[#161616]">互动消息</div>
            <div className="mt-1 truncate text-[13.5px] text-[#8a8a8f]">{notiPreview}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-[#c7c7cc]" />
        </Link>
        <div className="mx-4 h-px bg-[#f2f2f4]" />

        {list === null ? (
          <div className="grid h-40 place-items-center text-[#c7c7cc]">
            <Spinner />
          </div>
        ) : shown.length === 0 ? (
          <Empty
            text={q ? "没有找到相关聊天" : "还没有聊过天，去首页和心动的角色打个招呼吧"}
            action={
              !q && (
                <Link href="/" className="rounded-full bg-[#FFE500] px-5 py-2 text-[14px] font-semibold">
                  去首页看看
                </Link>
              )
            }
          />
        ) : (
          shown.map((c) => (
            <button
              key={c.id}
              onPointerDown={() => {
                longPressed.current = false;
                clearTimer();
                timer.current = window.setTimeout(() => {
                  longPressed.current = true;
                  setMenu(c);
                }, 520);
              }}
              onPointerUp={clearTimer}
              onPointerLeave={clearTimer}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu(c);
              }}
              onClick={() => {
                if (!longPressed.current) router.push(`/chat/${c.type}/${c.targetId}`);
              }}
              className={`flex w-full select-none items-center gap-3 px-4 py-3 text-left ${c.pinned ? "bg-[#f7f7f9]" : ""}`}
            >
              <div className="relative">
                <Avatar src={c.avatar} focus={c.avatarFocus} size={52} name={c.title} />
                {c.unread > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#ff2d55] px-1 text-center text-[11px] font-semibold leading-[18px] text-white ring-2 ring-white">
                    {c.unread}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[16px] font-medium text-[#161616]">{c.title}</span>
                    {c.type === "story" && <span className="shrink-0 rounded bg-[#eef5ff] px-1 py-[1px] text-[10px] text-[#2b8cff]">故事</span>}
                    {c.pinned && <PinIcon className="h-3.5 w-3.5 shrink-0 text-[#c7c7cc]" />}
                  </span>
                  <span className="shrink-0 text-[12px] text-[#b0b0b5]">{chatTime(c.lastAt)}</span>
                </div>
                <div className="mt-1 truncate text-[13.5px] text-[#8a8a8f]">{stripActions(c.lastMessage) || c.lastMessage}</div>
              </div>
            </button>
          ))
        )}
      </div>

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.title}>
        {menu && (
          <div className="px-4 pb-7">
            <button onClick={() => void pin(menu)} className="flex h-14 w-full items-center gap-3 border-b border-[#f2f2f4] text-[15px]">
              <PinIcon className="h-5 w-5" />
              {menu.pinned ? "取消置顶" : "置顶聊天"}
            </button>
            <button onClick={() => void del(menu)} className="flex h-14 w-full items-center gap-3 text-[15px] text-[#ff3b30]">
              <TrashIcon className="h-5 w-5" />
              删除聊天
            </button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
