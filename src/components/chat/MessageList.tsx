"use client";

import { Fragment, useEffect, useState } from "react";
import type { Msg, WorkChar, WorkType } from "@/lib/types";
import { Avatar } from "../ui";
import { DocIcon, ExpandIcon } from "../icons";

/** Renders text, dimming （动作/神态） segments like the original app. */
export function RichText({ text, dim }: { text: string; dim: string }) {
  const parts = text.split(/(（[^）]*）?|\([^)]*\)?)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("（") || p.startsWith("(") ? (
          <span key={i} className={dim}>
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function useTypewriter(text: string, enabled: boolean) {
  const [n, setN] = useState(() => (enabled ? 0 : text.length));
  useEffect(() => {
    if (!enabled) {
      setN(text.length);
      return;
    }
    let i = 0;
    setN(0);
    const timer = window.setInterval(() => {
      i += 2;
      setN(Math.min(i, text.length));
      if (i >= text.length) window.clearInterval(timer);
    }, 45);
    return () => window.clearInterval(timer);
  }, [text, enabled]);
  return text.slice(0, n);
}

export function MessageBubble({
  m,
  type,
  char,
  animate,
  onTap,
}: {
  m: Msg;
  type: WorkType;
  char?: WorkChar;
  animate: boolean;
  onTap?: () => void;
}) {
  const shown = useTypewriter(m.content, animate);

  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl bg-[#1c1c1e]/80 px-3.5 py-2.5 text-[15px] leading-[1.6] text-white backdrop-blur-md">
          <RichText text={m.content} dim="text-white/55" />
        </div>
      </div>
    );
  }

  const narrator = m.role === "narrator";
  const bubbleCls = narrator ? "bg-black/60 text-white" : "bg-white/[0.88] text-[#1d1d1f]";
  const dim = narrator ? "text-white/60" : "text-[#8e8e93]";

  if (type === "character" && !narrator) {
    return (
      <div className="flex">
        <div onClick={onTap} className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[15px] leading-[1.6] backdrop-blur-md ${bubbleCls}`}>
          <RichText text={shown} dim={dim} />
        </div>
      </div>
    );
  }

  const tagColor = narrator ? "rgba(44,44,46,0.88)" : (char?.color ?? "#4b4f8f");
  return (
    <div className="flex items-start gap-2">
      {narrator ? (
        <div className="mt-[3px] h-11 w-11 shrink-0 rounded-full border-2 border-white/75 bg-white/10 backdrop-blur" />
      ) : (
        <Avatar src={char?.avatar} focus={char?.avatarFocus} size={44} name={m.speaker} className="mt-[3px] border-2 border-white/85" />
      )}
      <div className="flex min-w-0 max-w-[80%] flex-col items-start">
        <span className="rounded-t-[10px] px-2.5 pb-[5px] pt-[2px] text-[12.5px] font-medium text-white" style={{ background: tagColor }}>
          {m.speaker || "旁白"}
        </span>
        <div
          onClick={onTap}
          className={`-mt-[3px] whitespace-pre-wrap break-words rounded-2xl rounded-tl-none px-3.5 py-2.5 text-[15px] leading-[1.6] backdrop-blur-md ${bubbleCls}`}
        >
          <RichText text={shown} dim={dim} />
        </div>
      </div>
    </div>
  );
}

export function IntroCard({ text, onExpand }: { text: string; onExpand: () => void }) {
  return (
    <div className="flex" data-nolike>
      <div
        onClick={onExpand}
        className="relative max-w-[92%] cursor-pointer rounded-2xl bg-black/55 py-2.5 pl-3.5 pr-9 text-[14px] leading-[1.6] text-white backdrop-blur-md"
      >
        <p className="line-clamp-2">
          <DocIcon className="-mt-[3px] mr-1 inline h-[15px] w-[15px] text-white" />
          <b className="font-semibold">介绍:</b> {text}
        </p>
        <ExpandIcon className="absolute bottom-2.5 right-3 h-[15px] w-[15px] text-white/90" />
      </div>
    </div>
  );
}

export function SystemPill({ text }: { text: string }) {
  return (
    <div className="my-1 flex justify-center">
      <span className="rounded-full bg-black/50 px-3.5 py-1 text-[12px] font-medium text-white/90 backdrop-blur-md">{text}</span>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex">
      <div className="flex items-center gap-1 rounded-2xl bg-white/[0.88] px-4 py-3.5 backdrop-blur-md">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-[#8e8e93]" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}
