"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatStage, { AiGenLabel } from "@/components/chat/ChatStage";
import { InterestPicker, useApp } from "@/components/AppProvider";
import { Sheet, Spinner, toast } from "@/components/ui";
import { HeartBadgeIcon, SearchIcon, SpeakerIcon, SpeakerOffIcon } from "@/components/icons";
import { apiGet, apiSend } from "@/lib/api";
import type { FeedItem } from "@/lib/types";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HomeScreen({ visible }: { visible: boolean }) {
  const { user, autoVoice, setAutoVoice, refresh } = useApp();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [prefOpen, setPrefOpen] = useState(false);
  const [prefs, setPrefs] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const base = useRef<FeedItem[]>([]);
  const round = useRef(0);
  const appendedAt = useRef(-1);
  const interestsKey = user ? user.interests.join(",") : null;
  const lastInterests = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ items: FeedItem[] }>("/api/feed");
      base.current = r.items;
      round.current = 0;
      appendedAt.current = -1;
      setItems(r.items);
      setActive(0);
      ref.current?.scrollTo({ top: 0 });
    } catch {
      toast("加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次挂载立即加载一次（不等用户信息）；之后只有「兴趣偏好真的变了」才重新推荐，
  // 避免用户信息到达时把整个信息流重载一遍造成闪动。
  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (interestsKey === null) return;
    if (lastInterests.current !== null && lastInterests.current !== interestsKey) void load();
    lastInterests.current = interestsKey;
  }, [interestsKey, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (!visible || !el || tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowDown") el.scrollBy({ top: el.clientHeight, behavior: "smooth" });
      if (e.key === "ArrowUp") el.scrollBy({ top: -el.clientHeight, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.clientHeight) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== active) setActive(i);
    if (i >= items.length - 2 && base.current.length && appendedAt.current !== items.length) {
      appendedAt.current = items.length;
      round.current += 1;
      const r = round.current;
      setItems((prev) => [...prev, ...shuffle(base.current).map((x) => ({ ...x, key: `${x.key}-r${r}` }))]);
    }
  };

  async function savePrefs() {
    try {
      await apiSend("/api/me", { interests: prefs }, "PATCH");
      setPrefOpen(false);
      toast(prefs.length ? "已更新偏好，为你重新推荐" : "已清空内容偏好");
      await refresh();
    } catch {
      toast("保存失败");
    }
  }

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        <div ref={ref} onScroll={onScroll} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll">
          {items.map((it, i) => (
            <section key={it.key} className="relative h-full w-full snap-start snap-always">
              {Math.abs(i - active) <= 1 ? (
                <ChatStage item={it} active={visible && i === active} variant="feed" />
              ) : (
                <div className="h-full w-full bg-neutral-900 bg-cover bg-center" style={{ backgroundImage: `url("${it.cover}")` }} />
              )}
            </section>
          ))}
        </div>

        {loading && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <Spinner />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="absolute inset-0 grid place-items-center px-10 text-center">
            <div>
              <p className="text-[15px] leading-relaxed text-white/70">暂时没有可推荐的内容</p>
              <button
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
                className="mt-4 rounded-full bg-[#FFE500] px-6 py-2.5 text-[14px] font-semibold text-black"
              >
                重新加载
              </button>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3 pt-2.5">
          <button
            aria-label="内容偏好"
            onClick={() => {
              setPrefs(user?.interests ?? []);
              setPrefOpen(true);
            }}
            className="pointer-events-auto p-1.5 text-white icon-shadow"
          >
            <HeartBadgeIcon className="h-[29px] w-[29px]" />
          </button>
          <div className="pointer-events-auto flex items-center gap-2.5">
            <Link href="/search" aria-label="搜索" className="p-1.5 text-white icon-shadow">
              <SearchIcon className="h-[27px] w-[27px]" />
            </Link>
            <button aria-label="自动播放" onClick={() => setAutoVoice(!autoVoice)} className="p-1.5 text-white icon-shadow">
              {autoVoice ? <SpeakerIcon className="h-[27px] w-[27px]" /> : <SpeakerOffIcon className="h-[27px] w-[27px]" />}
            </button>
          </div>
        </div>
        <AiGenLabel />

        <Sheet open={prefOpen} onClose={() => setPrefOpen(false)} title="内容偏好">
          <div className="px-5 pb-7">
            <p className="mb-4 text-[13px] text-[#8a8a8f]">选几个喜欢的标签，可以随时改，也可以全部清空</p>
            <InterestPicker value={prefs} onChange={setPrefs} />
            <button onClick={() => void savePrefs()} className="mt-6 h-12 w-full rounded-full bg-[#FFE500] text-[16px] font-semibold">
              保存（已选 {prefs.length}）
            </button>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
