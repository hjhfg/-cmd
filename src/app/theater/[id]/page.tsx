"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PageHeader, Spinner, useGoBack } from "@/components/ui";
import { RichText } from "@/components/chat/MessageList";
import { ChevronLeft, ChevronRight, PauseIcon, PlayIcon } from "@/components/icons";
import { apiGet, ApiError } from "@/lib/api";
import { cancelSpeech, speakLines } from "@/lib/speech";
import type { WorkDetail } from "@/lib/types";

type Line = { speaker: string; text: string; voice: string; color: string };
type Episode = { title: string; lines: Line[]; durs: number[]; total: number };

function buildEpisodes(item: WorkDetail): Episode[] {
  const charByName = new Map(item.characters.map((c) => [c.name, c]));
  const mk = (speaker: string, text: string): Line => {
    const c = charByName.get(speaker);
    return { speaker: c ? c.name : "旁白", text: text.replace(/用户/g, "你"), voice: c ? c.voice : "旁白", color: c ? c.color : "rgba(44,44,46,.9)" };
  };
  return item.chaptersFull.map((ch, i) => {
    const lines: Line[] = [
      ...(i === 0 ? item.openingLines.map((l) => mk(l.speaker, l.content)) : []),
      mk("旁白", ch.content),
      ...(ch.goal ? [mk("旁白", `本集看点：${ch.goal}`)] : []),
    ];
    const durs = lines.map((l) => Math.max(3, l.text.length * 0.24));
    return { title: ch.title, lines, durs, total: durs.reduce((a, b) => a + b, 0) };
  });
}

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function TheaterPage() {
  const { id } = useParams<{ id: string }>();
  const back = useGoBack();
  const { autoVoice } = useApp();
  const [item, setItem] = useState<WorkDetail | null>(null);
  const [err, setErr] = useState("");
  const [ep, setEp] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const lastSpoken = useRef("");

  useEffect(() => {
    apiGet<{ item: WorkDetail }>(`/api/works/story/${id}`)
      .then((r) => setItem(r.item))
      .catch((e) => setErr(e instanceof ApiError ? e.message : "加载失败"));
    return () => cancelSpeech();
  }, [id]);

  const episodes = useMemo(() => (item ? buildEpisodes(item) : []), [item]);
  const cur = episodes[ep];

  let lineIdx = 0;
  if (cur) {
    let acc = 0;
    for (let i = 0; i < cur.durs.length; i++) {
      acc += cur.durs[i];
      lineIdx = i;
      if (elapsed < acc) break;
    }
  }
  const line = cur?.lines[lineIdx];

  useEffect(() => {
    if (!playing || !cur) return;
    const t = window.setInterval(() => {
      setElapsed((e) => Math.min(cur.total, e + 0.2));
    }, 200);
    return () => window.clearInterval(t);
  }, [playing, cur]);

  // 当前集播完后切到下一集（在 effect 中处理，避免在状态更新函数里调用 setState）
  useEffect(() => {
    if (!cur || !playing || elapsed < cur.total) return;
    if (ep < episodes.length - 1) {
      setEp(ep + 1);
      setElapsed(0);
    } else {
      setPlaying(false);
    }
  }, [elapsed, cur, playing, ep, episodes.length]);

  useEffect(() => {
    if (!line || !playing || !autoVoice) return;
    const key = `${ep}-${lineIdx}`;
    if (lastSpoken.current === key) return;
    lastSpoken.current = key;
    speakLines([{ text: line.text, voice: line.voice }]);
  }, [line, playing, autoVoice, ep, lineIdx]);

  if (err) {
    return (
      <div className="flex h-full flex-col bg-black text-white">
        <PageHeader dark />
        <div className="grid flex-1 place-items-center text-white/60">{err}</div>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="grid h-full place-items-center bg-black text-white/60">
        <Spinner />
      </div>
    );
  }
  if (!cur) {
    return (
      <div className="flex h-full flex-col bg-black text-white">
        <PageHeader dark />
        <div className="grid flex-1 place-items-center px-8 text-center text-[14px] leading-relaxed text-white/60">
          这部故事还没有章节内容，进入详情页和角色聊聊，或创作自己的故事吧。
        </div>
        <div className="px-5 pb-8">
          <Link href={`/work/story/${item.id}`} className="flex h-12 items-center justify-center rounded-full bg-[#FFE500] text-[15px] font-semibold text-black">
            查看故事详情
          </Link>
        </div>
      </div>
    );
  }

  const progress = Math.min(100, (elapsed / cur.total) * 100);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={ep} src={item.cover} alt="" className="kenburns absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />

      <div className="relative flex items-center justify-between px-1.5 pt-2">
        <button aria-label="返回" onClick={back} className="p-2 icon-shadow">
          <ChevronLeft className="h-7 w-7" />
        </button>
        <span className="rounded-full bg-black/30 px-3 py-1 text-[12px] text-white/80 backdrop-blur">AI 剧场 · 由AI生成</span>
        <span className="w-11" />
      </div>

      <div className="relative mt-auto px-4 pb-3">
        {line && (
          <div className="anim-fade mb-5 flex flex-col items-start" key={`${ep}-${lineIdx}`}>
            <span className="rounded-t-[10px] px-2.5 pb-[5px] pt-[2px] text-[12.5px] font-medium text-white" style={{ background: line.color }}>
              {line.speaker}
            </span>
            <div className="-mt-[3px] max-w-[92%] rounded-2xl rounded-tl-none bg-black/55 px-3.5 py-2.5 text-[15px] leading-[1.65] backdrop-blur-md">
              <RichText text={line.text} dim="text-white/60" />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Link href={`/work/story/${item.id}`} className="flex items-center gap-0.5 text-[17px] font-semibold text-shadow">
            {item.title}
            <ChevronRight className="h-4 w-4" />
          </Link>
          <span className="text-[12px] text-white/80">
            {fmt(elapsed)} / {fmt(cur.total)}
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          <button
            aria-label={playing ? "暂停" : "播放"}
            onClick={() => {
              if (playing) cancelSpeech();
              if (!playing && elapsed >= cur.total) setElapsed(0);
              setPlaying(!playing);
            }}
            className="grid h-8 w-8 shrink-0 place-items-center"
          >
            {playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </button>
          <div
            className="relative h-1 flex-1 cursor-pointer rounded-full bg-white/30"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setElapsed(((e.clientX - r.left) / r.width) * cur.total);
              lastSpoken.current = "";
            }}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${progress}%` }} />
            <div className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `${progress}%` }} />
          </div>
        </div>

        <div className="no-scrollbar mt-4 max-h-[150px] space-y-2 overflow-y-auto">
          {episodes.map((e, i) => (
            <button
              key={i}
              onClick={() => {
                setEp(i);
                setElapsed(0);
                setPlaying(true);
                lastSpoken.current = "";
                cancelSpeech();
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left backdrop-blur-md ${i === ep ? "bg-white/20" : "bg-white/10 text-white/60"}`}
            >
              <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-cover bg-center" style={{ backgroundImage: `url("${item.cover}")` }}>
                {i === ep && playing && (
                  <span className="absolute inset-0 flex items-end justify-center gap-[2px] bg-black/40 pb-2">
                    {[0, 1, 2].map((k) => (
                      <span key={k} className="wave-bar h-3 w-[3px] rounded-full bg-white" style={{ animationDelay: `${k * 0.15}s` }} />
                    ))}
                  </span>
                )}
              </span>
              <span className="truncate text-[14px] font-medium">
                第 {i + 1} 集 · {e.title}
              </span>
            </button>
          ))}
        </div>
        <Link href={`/chat/story/${item.id}`} className="mt-3 flex h-11 items-center justify-center rounded-full bg-[#FFE500] text-[15px] font-semibold text-black">
          进入故事，亲自参与剧情
        </Link>
      </div>
    </div>
  );
}
