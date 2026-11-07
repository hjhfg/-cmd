"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Empty, Spinner, WorkCard } from "@/components/ui";
import { ChevronRight, FireIcon, PlayIcon, SearchIcon } from "@/components/icons";
import { apiGet } from "@/lib/api";
import { DISCOVER_TABS } from "@/lib/constants";
import { formatCount } from "@/lib/format";
import type { FeedItem } from "@/lib/types";

const RANK_BG = ["bg-[#ff4d4f]", "bg-[#ff7a45]", "bg-[#ffa940]"];

export default function DiscoverScreen({ visible }: { visible: boolean }) {
  const [tab, setTab] = useState("推荐");
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [hot, setHot] = useState<FeedItem[]>([]);

  const lastLoad = useRef(0);
  const cache = useRef<Record<string, FeedItem[]>>({});

  const loadHot = useCallback(() => {
    apiGet<{ items: FeedItem[] }>("/api/feed?sort=hot")
      .then((r) => setHot(r.items))
      .catch(() => undefined);
  }, []);

  // 切分类：先用缓存立即显示，再静默刷新；只有从未加载过的分类才显示转圈
  useEffect(() => {
    const q = tab === "推荐" ? "sort=personal" : `sort=hot&tag=${encodeURIComponent(tab)}`;
    setItems(cache.current[tab] ?? null);
    let alive = true;
    apiGet<{ items: FeedItem[] }>(`/api/feed?${q}`)
      .then((r) => {
        cache.current[tab] = r.items;
        lastLoad.current = Date.now();
        if (alive) setItems(r.items);
      })
      .catch(() => {
        if (alive) setItems((cur) => cur ?? []);
      });
    return () => {
      alive = false;
    };
  }, [tab]);

  useEffect(() => {
    loadHot();
  }, [loadHot]);

  // 标签页保活：重新回到发现页时，若数据超过 60 秒才静默刷新一次
  const wasVisible = useRef(visible);
  useEffect(() => {
    if (visible && !wasVisible.current && Date.now() - lastLoad.current > 60_000) {
      loadHot();
      const q = tab === "推荐" ? "sort=personal" : `sort=hot&tag=${encodeURIComponent(tab)}`;
      apiGet<{ items: FeedItem[] }>(`/api/feed?${q}`)
        .then((r) => {
          cache.current[tab] = r.items;
          lastLoad.current = Date.now();
          setItems(r.items);
        })
        .catch(() => undefined);
    }
    wasVisible.current = visible;
  }, [visible, tab, loadHot]);

  const theater = hot.filter((h) => h.type === "story" && h.chapters.length > 0);

  return (
    <div className="relative flex h-full flex-col bg-[#f6f6f8]">
      <div className="shrink-0 bg-white px-4 pt-3">
        <Link href="/search" className="flex h-9 items-center gap-2 rounded-full bg-[#f2f2f4] px-3.5 text-[14px] text-[#a0a0a5]">
          <SearchIcon className="h-4 w-4" />
          搜索感兴趣的内容
        </Link>
        <div className="no-scrollbar mt-2 flex gap-5 overflow-x-auto">
          {DISCOVER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative shrink-0 pb-2.5 pt-1 text-[15px] ${t === tab ? "font-semibold text-black" : "text-[#8a8a8f]"}`}
            >
              {t}
              {t === tab && <span className="absolute inset-x-1 bottom-1 h-[3px] rounded-full bg-[#FFE500]" />}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "推荐" && hot.length > 0 && (
          <>
            <section className="mt-2.5 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1 text-[16px] font-bold">
                  <FireIcon className="h-4 w-4 text-[#ff5a36]" />
                  猫箱热榜
                </h2>
                <Link href="/search" className="flex items-center text-[12px] text-[#9a9aa0]">
                  完整榜单
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
                {hot.slice(0, 6).map((it, i) => (
                  <Link key={it.key} href={`/chat/${it.type}/${it.id}`} className="relative h-[150px] w-[112px] shrink-0 overflow-hidden rounded-xl bg-neutral-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.cover} alt={it.title} className="h-full w-full object-cover" />
                    <span className={`absolute left-0 top-0 rounded-br-xl px-2 py-0.5 text-[13px] font-black italic text-white ${RANK_BG[i] ?? "bg-black/40"}`}>{i + 1}</span>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-8">
                      <div className="truncate text-[13px] font-semibold text-white">{it.title}</div>
                      <div className="text-[10px] text-white/75">{formatCount(it.chatCount)}人聊过</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {theater.length > 0 && (
              <section className="mt-2.5 bg-white px-4 py-3">
                <h2 className="flex items-center gap-1 text-[16px] font-bold">
                  <PlayIcon className="h-4 w-4 text-[#7a5cff]" />
                  AI 剧场
                  <span className="ml-1 text-[12px] font-normal text-[#9a9aa0]">心爱角色 跃然成片</span>
                </h2>
                <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
                  {theater.map((s) => (
                    <Link key={s.key} href={`/theater/${s.id}`} className="relative h-[120px] w-[200px] shrink-0 overflow-hidden rounded-xl bg-neutral-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.cover} alt={s.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
                        <PlayIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-2.5">
                        <div className="text-[14px] font-semibold text-white">{s.title}</div>
                        <div className="text-[11px] text-white/75">
                          共{s.chapters.length}集 · {formatCount(s.chatCount)}次观看
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {items === null ? (
          <div className="grid h-48 place-items-center text-[#c7c7cc]">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <Empty text="这个分类还没有内容，去创作第一个吧～" action={<Link href="/create" className="rounded-full bg-[#FFE500] px-5 py-2 text-[14px] font-semibold">去创作</Link>} />
        ) : (
          <div className="grid grid-cols-2 gap-2.5 p-3">
            {items.map((it) => (
              <WorkCard key={it.key} item={it} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
