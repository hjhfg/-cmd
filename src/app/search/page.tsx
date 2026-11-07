"use client";
import { local } from "@/lib/storage";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Empty, Spinner, useGoBack } from "@/components/ui";
import { ChevronLeft, CloseIcon, FireIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { apiGet } from "@/lib/api";
import { HOT_SEARCHES } from "@/lib/constants";
import { formatCount } from "@/lib/format";
import type { FeedItem } from "@/lib/types";

const RANK_COLOR = ["text-[#ff4d4f]", "text-[#ff7a45]", "text-[#ffa940]"];

export default function SearchPage() {
  const back = useGoBack();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hot, setHot] = useState<FeedItem[]>([]);
  const [results, setResults] = useState<FeedItem[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(local.get("mx_search_history") || "[]") as string[]);
    } catch {
      setHistory([]);
    }
    apiGet<{ items: FeedItem[] }>("/api/feed?sort=hot")
      .then((r) => setHot(r.items))
      .catch(() => undefined);
    inputRef.current?.focus();
  }, []);

  async function search(term: string) {
    const t = term.trim();
    if (!t) return;
    setQ(t);
    setSubmitted(t);
    setResults(null);
    const h = [t, ...history.filter((x) => x !== t)].slice(0, 10);
    setHistory(h);
    local.set("mx_search_history", JSON.stringify(h));
    try {
      const r = await apiGet<{ items: FeedItem[] }>(`/api/feed?sort=hot&q=${encodeURIComponent(t)}`);
      setResults(r.items);
    } catch {
      setResults([]);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-14 shrink-0 items-center gap-1 pl-1 pr-3">
        <button aria-label="返回" onClick={back} className="p-2 text-[#161616]">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#f2f2f4] px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-[#a0a0a5]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (!e.target.value) setSubmitted("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) void search(q);
            }}
            placeholder="搜索角色、故事、创作者"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[#161616] outline-none placeholder:text-[#a0a0a5]"
          />
          {q && (
            <button
              aria-label="清除"
              onClick={() => {
                setQ("");
                setSubmitted("");
              }}
              className="grid h-4 w-4 place-items-center rounded-full bg-[#c7c7cc] text-white"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          )}
        </div>
        <button onClick={() => void search(q)} className="shrink-0 px-2 text-[15px] font-medium text-[#161616]">
          搜索
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!submitted ? (
          <div className="px-4 pb-8">
            {history.length > 0 && (
              <section className="mt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold">搜索历史</h3>
                  <button
                    aria-label="清空历史"
                    onClick={() => {
                      setHistory([]);
                      local.remove("mx_search_history");
                    }}
                    className="p-1 text-[#a0a0a5]"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {history.map((h) => (
                    <button key={h} onClick={() => void search(h)} className="max-w-[160px] truncate rounded-full bg-[#f4f4f6] px-3.5 py-1.5 text-[13px] text-[#3a3a3c]">
                      {h}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="mt-6">
              <h3 className="text-[15px] font-semibold">猜你想搜</h3>
              <div className="mt-2 grid grid-cols-2 gap-y-3">
                {HOT_SEARCHES.map((h) => (
                  <button key={h} onClick={() => void search(h)} className="truncate pr-3 text-left text-[14px] text-[#3a3a3c]">
                    {h}
                  </button>
                ))}
              </div>
            </section>
            <section className="mt-7 rounded-2xl bg-gradient-to-b from-[#fff6dc] to-white p-4">
              <h3 className="flex items-center gap-1 text-[16px] font-bold">
                <FireIcon className="h-4 w-4 text-[#ff5a36]" />
                猫箱热榜
              </h3>
              <div className="mt-2">
                {hot.slice(0, 10).map((it, i) => (
                  <Link key={it.key} href={`/chat/${it.type}/${it.id}`} className="flex items-center gap-3 py-2.5">
                    <span className={`w-5 text-center text-[16px] font-black italic ${RANK_COLOR[i] ?? "text-[#b0b0b5]"}`}>{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.cover} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium text-[#161616]">{it.title}</div>
                      <div className="truncate text-[12px] text-[#a0a0a5]">{it.intro}</div>
                    </div>
                    <span className="shrink-0 text-[12px] text-[#a0a0a5]">{formatCount(Math.round(it.likeCount + it.chatCount * 0.6))}热度</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : results === null ? (
          <div className="grid h-40 place-items-center text-[#c7c7cc]">
            <Spinner />
          </div>
        ) : results.length === 0 ? (
          <Empty text={`没有找到与「${submitted}」相关的内容，换个关键词试试吧`} />
        ) : (
          <div className="pb-6">
            <div className="px-4 pb-1 pt-1 text-[12px] text-[#a0a0a5]">找到 {results.length} 个相关结果</div>
            {results.map((it) => (
              <Link key={it.key} href={`/chat/${it.type}/${it.id}`} className="flex gap-3 px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.cover} alt="" className="h-[92px] w-[69px] shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[16px] font-semibold text-[#161616]">{it.title}</span>
                    {it.type === "story" && <span className="shrink-0 rounded bg-[#eef5ff] px-1 text-[10px] text-[#2b8cff]">故事</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#77777c]">{it.intro}</p>
                  <div className="mt-1.5 text-[12px] text-[#a0a0a5]">
                    @{it.creatorName} · {formatCount(it.chatCount)}人聊过
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
