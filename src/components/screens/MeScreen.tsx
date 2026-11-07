"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from "react";
import { useApp } from "@/components/AppProvider";
import { toast } from "@/components/ui";
import {
  BellIcon,
  BookIcon,
  ChatSmallIcon,
  CheckIcon,
  CopyIcon,
  EditIcon,
  GearIcon,
  HeartBadgeIcon,
  PlusCircleIcon,
  PuzzleIcon,
  SparkleIcon,
  SpeakerIcon,
  UserCardIcon,
  WandIcon,
} from "@/components/icons";
import { apiGet, apiSend } from "@/lib/api";
import { switchTab } from "@/lib/tabs";
import type { RegexRule } from "@/lib/types";
import { CornerTicks, DiamondMeter, Grain, GridVeil, HatchVeil, LevelMark, RuleDivider, TickRule, WaxSeal } from "@/components/me/Filigree";
import { Chip, GhostButton, Panel, rgba, Row, Segment, SectionHead, T, Toggle } from "@/components/me/kit";
import { VaultSheet } from "@/components/me/VaultSheet";

type Glyph = ComponentType<SVGProps<SVGSVGElement>>;

interface Persona {
  id: number;
  name: string;
  description: string;
  avatar: string;
  isDefault: boolean;
}

interface StudioState {
  provider: string;
  model: string;
  hasKey: boolean;
  promptName: string;
  promptOn: boolean;
  promptCount: number;
  books: number;
  entries: number;
  worldName: string;
  ext: Record<string, boolean>;
}

const INITIAL: StudioState = {
  provider: "built-in",
  model: "",
  hasKey: false,
  promptName: "",
  promptOn: false,
  promptCount: 0,
  books: 0,
  entries: 0,
  worldName: "",
  ext: { autoVoice: true, actionText: true, longMemory: true, worldInfo: true, typingEffect: true },
};

const EXT_LABELS: Record<string, string> = {
  autoVoice: "语音",
  actionText: "动作",
  longMemory: "长记忆",
  worldInfo: "世界书",
  typingEffect: "打字机",
};

type OutingId = "home" | "diary" | "phone" | "heart";
const OUTINGS: { id: OutingId; label: string; hint: string }[] = [
  { id: "home", label: "Ta 的主页", hint: "最近在发什么" },
  { id: "diary", label: "Ta 的日记", hint: "写给你的那页" },
  { id: "phone", label: "Ta 的手机", hint: "备忘录与搜索" },
  { id: "heart", label: "Ta 的心声", hint: "此刻在想什么" },
];

/* ══════════════════════════════════════════════════════════════
   版面骨架
   ══════════════════════════════════════════════════════════════ */

function PageHead({ unread, onBell }: { unread: number; onBell: () => void }) {
  return (
    <header className="relative flex items-center justify-between px-5 pt-[18px]">
      <div className="flex items-center gap-2.5">
        <h1 className="font-serif text-[23px] font-bold leading-none tracking-[0.04em]" style={{ color: T.paper }}>
          我的
        </h1>
        <span className="font-mono text-[8.5px] tracking-[0.32em]" style={{ color: rgba(T.yellow, 0.7) }}>
          ARCHIVE
        </span>
        <span aria-hidden className="ml-0.5 h-[9px] w-px" style={{ background: "rgba(255,255,255,.16)" }} />
        <span className="font-mono text-[8.5px] tracking-[0.18em]" style={{ color: "rgba(255,255,255,.26)" }}>
          VOL.3
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="互动消息"
          onClick={onBell}
          className="relative grid h-8 w-8 place-items-center rounded-full backdrop-blur-md transition active:scale-95"
          style={{ background: "rgba(255,255,255,.06)", boxShadow: `inset 0 0 0 1px ${T.line2}`, color: T.paper }}
        >
          <BellIcon className="h-[16px] w-[16px]" strokeWidth={1.8} />
          {unread > 0 && (
            <span className="absolute right-[6px] top-[6px] h-[6px] w-[6px] rounded-full" style={{ background: T.alert, boxShadow: `0 0 0 2px ${T.stage}` }} />
          )}
        </button>
        <Link
          href="/settings"
          aria-label="设置"
          className="grid h-8 w-8 place-items-center rounded-full backdrop-blur-md transition active:scale-95"
          style={{ background: "rgba(255,255,255,.06)", boxShadow: `inset 0 0 0 1px ${T.line2}`, color: T.paper }}
        >
          <GearIcon className="h-[16px] w-[16px]" strokeWidth={1.8} />
        </Link>
      </div>
    </header>
  );
}

/* ───────────────────────── 证件照（身份主卡） ───────────────────────── */

function Portrait({
  name,
  portrait,
  code,
  level,
  bio,
  onCopy,
  personaCount,
}: {
  name: string;
  portrait: string;
  code: string;
  level: number;
  bio: string;
  onCopy: () => void;
  personaCount: number;
}) {
  return (
    <section className="relative mt-3.5 px-4">
      <div
        className="relative overflow-hidden rounded-[24px]"
        style={{
          background: `linear-gradient(152deg, #1A1A26 0%, #14141D 46%, #0F0F16 100%)`,
          boxShadow: `inset 0 0 0 1px ${T.line}, 0 30px 60px -34px rgba(0,0,0,.95)`,
        }}
      >
        {/* 光斑 + 斜纹 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-[210px] w-[210px] rounded-full"
          style={{ background: `radial-gradient(circle, ${rgba(T.yellow, 0.16)} 0%, ${rgba(T.copper, 0.07)} 42%, transparent 70%)`, filter: "blur(2px)" }}
        />
        <HatchVeil opacity={0.05} />
        <CornerTicks color={rgba(T.copper, 0.5)} inset={8} size={11} />
        <Grain opacity={0.1} />
        {/* 一道斜向高光，像玻璃卡面的反光 */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-1/3 -top-1/2 h-[220%] w-[46%] rotate-[18deg]"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.05) 42%, rgba(255,255,255,.09) 50%, rgba(255,255,255,.03) 62%, transparent)" }}
        />

        <div className="relative flex items-stretch gap-3.5 p-4">
          {/* 立绘 / 姓名首字 */}
          <div className="relative shrink-0">
            <div
              className="relative h-[104px] w-[78px] overflow-hidden rounded-[14px]"
              style={{ background: T.raised, boxShadow: `inset 0 0 0 1px rgba(255,255,255,.1), 0 10px 22px -14px #000` }}
            >
              {portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portrait} alt="" className="h-full w-full object-cover object-top" />
              ) : (
                <span className="grid h-full w-full place-items-center font-serif text-[34px] font-bold" style={{ color: rgba(T.yellow, 0.5) }}>
                  {name.slice(0, 1)}
                </span>
              )}
              <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,12,.72), transparent 52%)" }} />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 py-[3px] font-mono text-[7.5px] tracking-[0.2em]" style={{ color: rgba(T.yellow, 0.9) }}>
                LV.{String(level).padStart(2, "0")}
              </span>
            </div>
            {/* 胶片齿孔 */}
            <span
              aria-hidden
              className="absolute -left-[5px] -top-[5px] h-[7px] w-[7px] rotate-45"
              style={{ background: T.copper, opacity: 0.75 }}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-1.5">
              <span className="h-[5px] w-[5px] rounded-full stage-live" style={{ background: T.yellow }} />
              <span className="font-mono text-[8.5px] tracking-[0.22em]" style={{ color: T.yellow }}>
                ON STAGE
              </span>
              <span className="text-[9.5px]" style={{ color: T.dim }}>
                登场中
              </span>
            </div>

            <h2 className="mt-1.5 truncate text-[25px] font-black leading-[1.15] tracking-[-0.03em]" style={{ color: T.paper }}>
              {name}
            </h2>

            <p className="mt-1 line-clamp-2 text-[11px] leading-[1.65]" style={{ color: T.sub }}>
              {bio}
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-[3px] font-mono text-[9.5px] transition active:opacity-60"
                style={{ background: "rgba(0,0,0,.38)", color: T.sub, boxShadow: `inset 0 0 0 1px ${T.line}` }}
              >
                ID {code || "······"}
                <CopyIcon className="h-[9px] w-[9px]" />
              </button>
              <span className="rounded-md px-1.5 py-[3px] font-mono text-[9.5px]" style={{ background: "rgba(0,0,0,.38)", color: rgba(T.yellow, 0.85), boxShadow: `inset 0 0 0 1px ${rgba(T.yellow, 0.18)}` }}>
                {"{{user}}"}
              </span>
              <Link
                href="/me/edit"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[9.5px] transition active:opacity-60"
                style={{ background: "rgba(0,0,0,.38)", color: T.sub, boxShadow: `inset 0 0 0 1px ${T.line}` }}
              >
                <EditIcon className="h-[9px] w-[9px]" />
                资料
              </Link>
              {personaCount > 0 && (
                <span className="rounded-md px-1.5 py-[3px] font-mono text-[9.5px]" style={{ background: "rgba(0,0,0,.38)", color: T.dim, boxShadow: `inset 0 0 0 1px ${T.line}` }}>
                  {personaCount} 张面具
                </span>
              )}
            </div>
          </div>

          {/* 编号印章 */}
          <div className="absolute -bottom-1 right-2 opacity-[0.5]">
            <WaxSeal label={`NO.${code.slice(-4) || "0000"}`} caption="MAOXIANG" size={58} rotate={-11} color={T.copper} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── 统计条 ───────────────────────── */

function StatsRibbon({
  chats,
  works,
  likes,
  affection,
}: {
  chats: number;
  works: number;
  likes: number;
  affection: number;
}) {
  const items = [
    { v: chats, u: "段", l: "羁绊" },
    { v: works, u: "件", l: "作品" },
    { v: likes, u: "次", l: "心动" },
  ];
  return (
    <section className="mt-2.5 px-4">
      <Panel>
        <div className="flex items-stretch">
          {items.map((it, i) => (
            <div
              key={it.l}
              className={`flex flex-1 flex-col items-center py-3 ${i ? "border-l" : ""}`}
              style={{ borderColor: T.line }}
            >
              <div className="flex items-baseline gap-[2px]">
                <span className="font-mono text-[19px] font-bold leading-none tracking-[-0.02em]" style={{ color: it.v > 0 ? T.paper : "rgba(248,245,236,.34)" }}>
                  {it.v > 999 ? `${(it.v / 1000).toFixed(1)}k` : it.v}
                </span>
                <span className="text-[9px]" style={{ color: T.dim }}>
                  {it.u}
                </span>
              </div>
              <span className="mt-[5px] text-[9.5px] tracking-[0.1em]" style={{ color: T.dim }}>
                {it.l}
              </span>
            </div>
          ))}
          <div className="flex flex-1 flex-col items-center border-l py-3" style={{ borderColor: T.line }}>
            <DiamondMeter value={affection} max={5} />
            <span className="mt-[6px] text-[9.5px] tracking-[0.1em]" style={{ color: T.dim }}>
              亲密度
            </span>
          </div>
        </div>
      </Panel>
    </section>
  );
}

/* ───────────────────────── 档案三联 ───────────────────────── */

function ArchiveTriplet({
  personaName,
  personaDetail,
  promptName,
  promptDetail,
  worldName,
  worldDetail,
  voiceOn,
}: {
  personaName: string;
  personaDetail: string;
  promptName: string;
  promptDetail: string;
  worldName: string;
  worldDetail: string;
  voiceOn: boolean;
}) {
  const cards = [
    {
      to: "/personas",
      kicker: "PERSONA",
      title: personaName,
      detail: personaDetail,
      accent: T.yellow,
      glyph: UserCardIcon,
      mark: "人设",
    },
    {
      to: "/prompts",
      kicker: "TONE",
      title: promptName,
      detail: promptDetail,
      accent: T.rose,
      glyph: WandIcon,
      mark: "语气",
    },
    {
      to: "/worldbook",
      kicker: "LORE",
      title: worldName,
      detail: worldDetail,
      accent: T.jade,
      glyph: BookIcon,
      mark: "世界",
    },
  ];
  return (
    <section className="mt-3.5 px-4">
      <div className="grid grid-cols-3 gap-2.5">
        {cards.map((c) => {
          const G = c.glyph;
          return (
            <Link
              key={c.kicker}
              href={c.to}
              className="relative overflow-hidden rounded-[16px] p-3 transition active:scale-[0.975]"
              style={{
                background: `linear-gradient(165deg, ${rgba(c.accent, 0.1)} 0%, ${T.card} 46%, #101018 100%)`,
                boxShadow: `inset 0 0 0 1px ${rgba(c.accent, 0.16)}`,
              }}
            >
              <span aria-hidden className="pointer-events-none absolute -right-5 -top-6 h-14 w-14 rounded-full" style={{ background: rgba(c.accent, 0.12), filter: "blur(8px)" }} />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[7.5px] tracking-[0.2em]" style={{ color: rgba(c.accent, 0.85) }}>
                  {c.kicker}
                </span>
                <G className="h-[13px] w-[13px]" style={{ color: rgba(c.accent, 0.75) }} strokeWidth={1.8} />
              </div>
              <div className="mt-2 truncate text-[13.5px] font-bold leading-tight" style={{ color: T.paper }}>
                {c.title}
              </div>
              <div className="mt-[3px] line-clamp-2 h-[26px] text-[9.5px] leading-[1.4]" style={{ color: T.dim }}>
                {c.detail}
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                <span className="h-[3px] w-[3px] rotate-45" style={{ background: c.accent }} />
                <span className="text-[8.5px] tracking-[0.1em]" style={{ color: rgba(c.accent, 0.8) }}>
                  {c.mark}
                </span>
                {c.kicker === "PERSONA" && voiceOn && (
                  <SpeakerIcon className="ml-auto h-[10px] w-[10px]" style={{ color: rgba(T.jade, 0.8) }} strokeWidth={2} />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────── 工具箱（正则 / 下文 / 设置） ───────────────────────── */

function ToolTile({
  label,
  value,
  hint,
  accent,
  glyph,
  badge,
  onClick,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  accent: string;
  glyph: Glyph;
  badge?: string;
  onClick?: () => void;
  href?: string;
}) {
  const G = glyph;
  const inner = (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.55]" style={{ background: `radial-gradient(120% 90% at 100% 0%, ${rgba(accent, 0.16)} 0%, transparent 62%)` }} />
      <CornerTicks color={rgba(accent, 0.42)} inset={7} size={10} />
      <div className="relative flex items-start justify-between">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px]" style={{ background: rgba(accent, 0.13), color: accent, boxShadow: `inset 0 0 0 1px ${rgba(accent, 0.2)}` }}>
          <G className="h-[15px] w-[15px]" strokeWidth={1.9} />
        </span>
        {badge && <Chip color={accent}>{badge}</Chip>}
      </div>
      <div className="relative mt-2.5 text-[13.5px] font-bold tracking-[0.02em]" style={{ color: T.paper }}>
        {label}
      </div>
      <div className="relative mt-[3px] font-mono text-[10px] tracking-[0.02em]" style={{ color: accent }}>
        {value}
      </div>
      <div className="relative mt-[2px] text-[9px] leading-[1.45]" style={{ color: T.dim }}>
        {hint}
      </div>
    </>
  );
  const cls = "relative flex flex-col overflow-hidden rounded-[16px] p-3 text-left transition active:scale-[0.975]";
  const style = { background: `linear-gradient(168deg, ${T.card2} 0%, ${T.card} 60%, #0F0F16 100%)`, boxShadow: `inset 0 0 0 1px ${T.line}, 0 14px 30px -28px rgba(0,0,0,.9)` };
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {inner}
    </button>
  );
}

/* ───────────────────────── 上下文装配（改进版） ───────────────────────── */

function AssembleNode({
  index,
  glyph: G,
  tint,
  title,
  detail,
  href,
  on,
  last,
}: {
  index: number;
  glyph: Glyph;
  tint: string;
  title: string;
  detail: string;
  href: string;
  on: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative pl-[46px]">
      {!last && (
        <span aria-hidden className="absolute bottom-[-4px] left-[17px] top-[40px] w-[1.5px] overflow-hidden rounded-full" style={{ background: on ? rgba(tint, 0.28) : "rgba(255,255,255,.08)" }}>
          {on && <span className="stage-rail absolute inset-0" />}
        </span>
      )}
      <span
        aria-hidden
        className="absolute left-0 top-[9px] grid h-[36px] w-[36px] place-items-center rounded-[12px] transition-colors duration-300"
        style={{
          background: on ? `linear-gradient(160deg, ${rgba(tint, 0.22)}, ${rgba(tint, 0.06)})` : T.raised,
          color: on ? tint : "rgba(255,255,255,.3)",
          boxShadow: on ? `inset 0 0 0 1px ${rgba(tint, 0.42)}, 0 0 18px -8px ${rgba(tint, 0.9)}` : `inset 0 0 0 1px ${T.line}`,
        }}
      >
        <G className="h-[16px] w-[16px]" strokeWidth={1.85} />
        <span
          className="absolute -left-[5px] -top-[5px] grid h-[14px] w-[14px] place-items-center rounded-full font-mono text-[8px] font-bold"
          style={{ background: on ? tint : "#2A2A38", color: on ? "#12121A" : "rgba(255,255,255,.45)" }}
        >
          {index}
        </span>
      </span>
      <Link href={href} className="flex items-center gap-2 rounded-[12px] py-[11px] pr-2 transition active:bg-white/[0.045]">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-semibold" style={{ color: on ? T.paper : T.sub }}>
              {title}
            </span>
            <span className="rounded px-1.5 py-[1px] font-mono text-[8.5px] tracking-[0.04em]" style={{ background: on ? rgba(tint, 0.14) : "rgba(255,255,255,.05)", color: on ? tint : T.dim }}>
              {on ? "ON" : "OFF"}
            </span>
          </span>
          <span className="mt-[2px] block truncate text-[10.5px]" style={{ color: T.dim }}>
            {detail}
          </span>
        </span>
        <ChevronMini />
      </Link>
    </div>
  );
}

function ChevronMini() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(255,255,255,.2)", flexShrink: 0 }} aria-hidden>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ───────────────────────── 面具档案（人设） ───────────────────────── */

function MaskShelf({ personas, busyId, currentId, onPick }: { personas: Persona[]; busyId: number | null; currentId: number | null; onPick: (p: Persona) => void }) {
  const active = currentId ? 1 : 0;
  return (
    <section data-scroll="masks" className="mt-4 px-4">
      <SectionHead
        zh="面具档案"
        en="PERSONAS"
        index="01"
        right={
          <Link href="/personas" className="flex items-center gap-0.5 text-[10.5px] transition active:opacity-60" style={{ color: T.dim }}>
            {active > 0 ? `${active} 张登场中` : "未选默认"}
            <ChevronMini />
          </Link>
        }
      />
      {/* 档案柜：顶部一道黄铜导轨 + 底部抽手，像拉开一格抽屉 */}
      <div className="relative overflow-hidden rounded-[18px]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.032), rgba(255,255,255,.014))", boxShadow: `inset 0 0 0 1px ${T.line}` }}>
        <span aria-hidden className="absolute inset-x-4 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${rgba(T.copper, 0.55)}, transparent)` }} />
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-3 pb-2.5 pt-3.5">
          {personas.map((p) => {
            const on = p.id === currentId;
            return (
              <button
                key={p.id}
                type="button"
                disabled={busyId !== null}
                onClick={() => onPick(p)}
                aria-pressed={on}
                className="group w-[64px] shrink-0 text-center transition active:scale-95 disabled:opacity-60"
              >
                <span
                  className="relative block h-[82px] w-[64px] overflow-hidden rounded-[12px] transition-all duration-300"
                  style={{
                    boxShadow: on ? `0 0 0 1.5px ${T.yellow}, 0 10px 22px -14px ${rgba(T.yellow, 0.9)}` : `inset 0 0 0 1px ${T.line}`,
                    filter: on ? "none" : "saturate(.5) brightness(.68)",
                  }}
                >
                  {p.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar} alt="" className="h-full w-full object-cover object-top" />
                  ) : (
                    <span className="grid h-full w-full place-items-center font-serif text-[20px] font-bold" style={{ background: T.raised, color: T.sub }}>
                      {p.name.slice(0, 1)}
                    </span>
                  )}
                  {on && (
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 py-[2px] text-[8px] font-bold" style={{ background: T.yellow, color: "#14140F" }}>
                      <CheckIcon className="h-[8px] w-[8px]" strokeWidth={4} />
                      登场
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block truncate text-[10px]" style={{ color: on ? T.paper : T.dim, fontWeight: on ? 700 : 400 }}>
                  {p.name}
                </span>
              </button>
            );
          })}
          <Link href="/personas?new=1" className="w-[64px] shrink-0 text-center transition active:scale-95">
            <span className="grid h-[82px] w-[64px] place-items-center rounded-[12px] border border-dashed" style={{ borderColor: "rgba(255,255,255,.18)", color: T.dim }}>
              <PlusCircleIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="mt-1.5 block text-[10px]" style={{ color: T.dim }}>
              新建
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-1.5 border-t px-3 py-[7px]" style={{ borderColor: T.line }}>
          <span className="h-[3px] w-[3px] rounded-full" style={{ background: active ? T.jade : T.copper }} />
          <span className="text-[9px] leading-tight" style={{ color: T.dim }}>
            {active > 0 ? "点选缩略图即可换人登场，对话中仍可单独指定" : "新建一张面具，让每场戏知道该与谁说话"}
          </span>
          <span aria-hidden className="ml-auto flex gap-[3px] opacity-30">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-[10px] w-[1px]" style={{ background: "#fff" }} />
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════
   页面
   ══════════════════════════════════════════════════════════════ */

export default function MeScreen({ visible }: { visible: boolean }) {
  const { user, unread, refresh, autoVoice, setAutoVoice } = useApp();
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [studio, setStudio] = useState<StudioState>(INITIAL);
  const [rules, setRules] = useState<RegexRule[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [outingOpen, setOutingOpen] = useState(false);
  const [outing, setOuting] = useState<OutingId>("heart");
  const [outingText, setOutingText] = useState("");
  const [outingBusy, setOutingBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, a, pr, w, e, rg] = await Promise.allSettled([
      apiGet<{ items: Persona[] }>("/api/studio?scope=personas"),
      apiGet<{ provider: string; model: string; hasKey: boolean }>("/api/studio?scope=api"),
      apiGet<{ items: { name: string; isActive: boolean }[] }>("/api/studio?scope=prompts"),
      apiGet<{ books: { id: number; name: string; enabled: boolean }[]; entries: { bookId: number; enabled: boolean }[] }>("/api/studio?scope=world"),
      apiGet<Record<string, boolean>>("/api/studio?scope=extensions"),
      apiGet<{ items: RegexRule[] }>("/api/regex"),
    ]);

    setPersonas(p.status === "fulfilled" ? [...(p.value.items ?? [])].sort((x, y) => x.id - y.id) : []);
    setRules(rg.status === "fulfilled" ? rg.value.items ?? [] : []);

    setStudio((prev) => {
      const next = { ...prev };
      if (a.status === "fulfilled") {
        next.provider = a.value.provider || "built-in";
        next.model = a.value.model || "";
        next.hasKey = Boolean(a.value.hasKey);
      }
      if (pr.status === "fulfilled") {
        const items = pr.value.items ?? [];
        const on = items.find((x) => x.isActive);
        next.promptOn = Boolean(on);
        next.promptName = on?.name || "";
        next.promptCount = items.length;
      }
      if (w.status === "fulfilled") {
        const enabled = (w.value.books ?? []).filter((b) => b.enabled);
        const ids = new Set(enabled.map((b) => b.id));
        next.books = ids.size;
        next.worldName = enabled[0]?.name || "";
        next.entries = (w.value.entries ?? []).filter((x) => x.enabled && ids.has(x.bookId)).length;
      }
      if (e.status === "fulfilled") next.ext = { ...next.ext, ...(e.value ?? {}) };
      return next;
    });
  }, []);

  const wasVisible = useRef(visible);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      void refresh();
      void load();
    }
    wasVisible.current = visible;
  }, [visible, refresh, load]);

  const current = personas?.find((p) => p.isDefault) ?? personas?.[0] ?? null;
  const defaultPersonaId = personas?.find((p) => p.isDefault)?.id ?? current?.id ?? null;
  const portrait = current?.avatar || user?.avatar || "";

  const customModel = studio.provider !== "built-in" && (studio.hasKey || studio.provider === "custom");
  const modelLabel = customModel ? studio.model || studio.provider : "内置引擎";
  const extOn = useMemo(() => Object.entries(studio.ext).filter(([, v]) => v), [studio.ext]);
  const ruleOn = useMemo(() => (rules ?? []).filter((r) => r.enabled), [rules]);

  const sources = [
    { label: "人设", on: Boolean(current), tint: T.yellow },
    { label: "语气", on: studio.promptOn, tint: T.rose },
    { label: "世界", on: studio.books > 0, tint: T.jade },
    { label: "正则", on: ruleOn.length > 0, tint: T.copper },
    { label: "扩展", on: extOn.length > 0, tint: T.moon },
  ];
  const assembled = sources.filter((s) => s.on).length;
  const level = Math.min(99, 3 + Math.floor(((user?.chattedCount ?? 0) + (user?.worksCount ?? 0) * 2) / 3));
  const affection = Math.max(1, Math.min(5, 1 + Math.round(((user?.chattedCount ?? 0) + (user?.likesReceived ?? 0)) / 4)));

  async function pickPersona(p: Persona) {
    if (p.id === defaultPersonaId || busyId !== null) return;
    const backup = personas;
    setBusyId(p.id);
    setPersonas((list) => list?.map((x) => ({ ...x, isDefault: x.id === p.id })) ?? list);
    try {
      await apiSend("/api/studio", { scope: "personas", action: "default", id: p.id });
      await load();
      toast(`已换成「${p.name}」登场`);
    } catch {
      setPersonas(backup);
      toast("切换失败，请重试");
    } finally {
      setBusyId(null);
    }
  }

  async function copyId() {
    if (!user?.code) return;
    try {
      await navigator.clipboard.writeText(user.code);
      toast("猫箱号已复制");
    } catch {
      toast(`猫箱号：${user.code}`);
    }
  }

  async function readOuting(kind: OutingId) {
    setOuting(kind);
    setOutingBusy(true);
    setOutingText("");
    try {
      const target = current ? { type: "character", id: (personas?.[0]?.id ?? 0) } : null;
      void target;
      const conv = await apiGet<{ items: { id: number; type: string; targetId: number }[] }>("/api/conversations");
      const last = conv.items?.find((c) => c.type === "character");
      if (!last) {
        setOutingText("先在信息流里和某个角色聊上几句，Ta 才会把心事留在这里。");
        return;
      }
      const r = await apiSend<{ result: { home?: { signature: string; posts: { content: string }[] }; diary?: { date: string; weather: string; content: string }; phone?: { memo: string; searches: string[]; chats: { from: string; content: string }[] }; heart?: { mood: string; affinity: number; thought: string; status: string } } }>(
        "/api/chat/extra",
        { kind: "heart", heartKind: kind, type: "character", id: last.targetId },
      );
      const res = r.result;
      if (kind === "home" && res.home) {
        setOutingText([res.home.signature, "", ...res.home.posts.map((p) => `· ${p.content}`)].join("\n"));
      } else if (kind === "diary" && res.diary) {
        setOutingText(`${res.diary.date} · ${res.diary.weather}\n\n${res.diary.content}`);
      } else if (kind === "phone" && res.phone) {
        setOutingText([`备忘：${res.phone.memo}`, "", "搜索记录：", ...res.phone.searches.map((s) => `· ${s}`), "", "最近聊天：", ...res.phone.chats.map((c) => `${c.from}：${c.content}`)].join("\n"));
      } else if (kind === "heart" && res.heart) {
        setOutingText([`心情：${res.heart.mood}`, `状态：${res.heart.status}`, "", res.heart.thought].join("\n"));
      } else {
        setOutingText("Ta 把这一页合上了，稍后再来看吧。");
      }
    } catch {
      setOutingText("暂时读不到 Ta 的动静，稍后再试。");
    } finally {
      setOutingBusy(false);
    }
  }

  function openOuting() {
    setOutingOpen(true);
    if (!outingText) void readOuting(outing);
  }

  return (
    <div className="flex h-full flex-col" style={{ background: T.stage, color: T.paper }}>
      <div className="stage-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* ══ 夜空 ══ */}
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -right-24 -top-32 h-[320px] w-[320px] rounded-full"
              style={{ background: `radial-gradient(circle, ${rgba(T.yellow, 0.15)} 0%, ${rgba(T.copper, 0.06)} 46%, transparent 72%)` }}
            />
            <div
              className="absolute -left-28 top-24 h-[260px] w-[260px] rounded-full"
              style={{ background: `radial-gradient(circle, ${rgba(T.moon, 0.1)} 0%, transparent 70%)` }}
            />
          </div>
          <GridVeil opacity={0.6} />
          {/* 顶部一道细金线，像档案柜的铜边 */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${rgba(T.copper, 0.55)} 22%, ${rgba(T.yellow, 0.75)} 50%, ${rgba(T.copper, 0.55)} 78%, transparent)` }} />
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${rgba(T.yellow, 0.07)}, transparent 70%)` }} />

          <PageHead unread={unread} onBell={() => switchTab("/messages")} />

          <Portrait
            name={current?.name || user?.nickname || "猫箱用户"}
            portrait={portrait}
            code={user?.code ?? ""}
            level={level}
            bio={current?.description || user?.bio || "还没有写下人设。补上外貌、身份与性格，AI 才会在每场戏里记得你是谁。"}
            onCopy={() => void copyId()}
            personaCount={personas?.length ?? 0}
          />

          <StatsRibbon
            chats={user?.chattedCount ?? 0}
            works={user?.worksCount ?? 0}
            likes={user?.likesReceived ?? 0}
            affection={affection}
          />

          <ArchiveTriplet
            personaName={current?.name || (personas === null ? "…" : "未设定")}
            personaDetail={current ? `${current.description.length} 字身份 · 点击切换` : "定义 AI 眼中的你"}
            promptName={studio.promptOn ? studio.promptName : "内置语气"}
            promptDetail={studio.promptOn ? `共 ${studio.promptCount} 个预设 · 启用中` : `共 ${studio.promptCount} 个预设 · 未启用`}
            worldName={studio.books > 0 ? studio.worldName || "已启用" : "未启用"}
            worldDetail={studio.books > 0 ? `${studio.books} 本 · ${studio.entries} 条目待命` : "关键词触发的世界观"}
            voiceOn={Boolean(autoVoice)}
          />
        </div>

        {/* ══ 工具箱：正则 / 下文 / 设置 ══ */}
        <section className="mt-6 px-4">
          <SectionHead zh="工具箱" en="TOOLBOX" index="02" right={<TickRule count={9} height={7} />} />
          <div className="grid grid-cols-3 gap-2.5">
            <ToolTile
              label="正则"
              value={rules === null ? "……" : `${ruleOn.length}/${rules.length}`}
              hint="改写输出与输入"
              accent={T.yellow}
              glyph={WandIcon}
              badge={ruleOn.length > 0 ? "运行中" : "未启用"}
              href="/regex"
            />
            <ToolTile
              label="下文"
              value={`${assembled}/5 已装配`}
              hint="下一条消息的上下文"
              accent={T.rose}
              glyph={SparkleIcon}
              badge={assembled >= 5 ? "满载" : `${assembled}/5`}
              onClick={() => document.querySelector('[data-scroll="context"]')?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
            <ToolTile
              label="设置"
              value={customModel ? "自定义" : "内置"}
              hint="模型、缓存与账号"
              accent={T.moon}
              glyph={GearIcon}
              href="/settings"
            />
          </div>

          {/* 装配速览：把下一条消息真正会喂给模型的东西摊开 */}
          <div className="mt-2.5">
            <Panel>
              <div className="flex items-center gap-2 px-3 py-[10px]">
                <span className="font-mono text-[8.5px] tracking-[0.2em]" style={{ color: "rgba(255,255,255,.3)" }}>
                  CONTEXT
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                  {sources.map((s) => (
                    <span key={s.label} className="flex shrink-0 items-center gap-1">
                      <span
                        className="h-[5px] w-[5px] rounded-full transition-colors duration-300"
                        style={{ background: s.on ? s.tint : "rgba(255,255,255,.16)", boxShadow: s.on ? `0 0 7px ${rgba(s.tint, 0.9)}` : undefined }}
                      />
                      <span className="text-[10px]" style={{ color: s.on ? T.paper : "rgba(255,255,255,.32)" }}>
                        {s.label}
                      </span>
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  onClick={openOuting}
                  className="shrink-0 rounded-full px-2 py-[3px] text-[9.5px] font-bold transition active:scale-95"
                  style={{ background: rgba(T.rose, 0.12), color: T.rose, boxShadow: `inset 0 0 0 1px ${rgba(T.rose, 0.24)}` }}
                >
                  让 Ta 出门
                </button>
              </div>
              {/* 装配进度：五段刻度 */}
              <div className="flex gap-[3px] px-3 pb-2.5">
                {sources.map((s) => (
                  <span
                    key={`bar-${s.label}`}
                    className="h-[2.5px] flex-1 rounded-full transition-colors duration-500"
                    style={{ background: s.on ? s.tint : "rgba(255,255,255,.09)", boxShadow: s.on ? `0 0 6px ${rgba(s.tint, 0.6)}` : undefined }}
                  />
                ))}
              </div>
            </Panel>
          </div>
        </section>

        {/* ══ 面具档案 ══ */}
        {personas !== null && personas.length > 0 && (
          <MaskShelf personas={personas} busyId={busyId} currentId={defaultPersonaId} onPick={(p) => void pickPersona(p)} />
        )}

        {/* ══ 上下文装配 ══ */}
        <section data-scroll="context" className="mt-5 scroll-mt-3 px-4">
          <SectionHead
            zh="上下文装配"
            en="ASSEMBLY"
            index="03"
            right={
              <Chip color={assembled >= 4 ? T.jade : T.yellow} solid={assembled >= 4}>
                {assembled}/5
              </Chip>
            }
          />
          <Panel glow>
            <div className="relative px-3.5 pb-1.5 pt-3">
              <p className="mb-1.5 text-[10.5px] leading-[1.7]" style={{ color: T.dim }}>
                下一条消息发出时，下列内容按编号顺序注入模型。点亮的节点即为本次生效项。
              </p>
              <div className="absolute right-4 top-3 opacity-40">
                <RuleDivider color={rgba(T.yellow, 0.2)} width={16} />
              </div>
              <AssembleNode index={1} glyph={UserCardIcon} tint={T.yellow} title="用户人设" detail={current ? `${current.name} · ${current.description.length} 字身份描述` : "未设置 · AI 还不知道你是谁"} href="/personas" on={Boolean(current)} />
              <AssembleNode index={2} glyph={WandIcon} tint={T.rose} title="语气预设" detail={studio.promptOn ? `${studio.promptName} · 定义叙事口吻` : `默认风格 · 共 ${studio.promptCount} 个预设未启用`} href="/prompts" on={studio.promptOn} />
              <AssembleNode index={3} glyph={BookIcon} tint={T.jade} title="世界书" detail={studio.books > 0 ? `${studio.books} 本启用 · ${studio.entries} 个条目待命` : "未启用 · 关键词触发的世界观"} href="/worldbook" on={studio.books > 0} />
              <AssembleNode index={4} glyph={WandIcon} tint={T.copper} title="正则规则" detail={ruleOn.length > 0 ? `${ruleOn.length} 条生效 · ${ruleOn.map((r) => r.name).slice(0, 2).join("、")}` : "未启用 · 输出与输入的文本替换"} href="/regex" on={ruleOn.length > 0} />
              <AssembleNode index={5} glyph={PuzzleIcon} tint={T.moon} title="扩展模块" detail={extOn.length > 0 ? `${extOn.length}/5 · ${extOn.map(([k]) => EXT_LABELS[k] ?? k).join(" · ")}` : "全部关闭"} href="/extensions" on={extOn.length > 0} last />
            </div>
            <Link href="/aip" className="flex items-center gap-2 border-t px-3.5 py-[10px] transition active:bg-white/[0.03]" style={{ borderColor: T.line }}>
              <span className="font-mono text-[8.5px] tracking-[0.2em]" style={{ color: "rgba(255,255,255,.28)" }}>
                AIP
              </span>
              <span className="min-w-0 flex-1 truncate text-[10.5px]" style={{ color: T.dim }}>
                {customModel ? `${modelLabel} · 自定义端点` : "内置引擎 · 可接入自己的模型"}
              </span>
              <Chip color={customModel ? T.jade : T.dim}>{customModel ? "已接管" : "内置"}</Chip>
              <ChevronMini />
            </Link>
          </Panel>
        </section>

        {/* ══ 常用 ══ */}
        <section className="mt-5 px-4">
          <SectionHead zh="常用" en="QUICK" index="04" />
          <Panel>
            <Row icon={<ChatSmallIcon className="h-[16px] w-[16px]" strokeWidth={1.9} />} tint={T.moon} title="我的聊天" detail="继续进行中的角色对话与剧情" onClick={() => switchTab("/messages")} />
            <Row icon={<BellIcon className="h-[16px] w-[16px]" strokeWidth={1.9} />} tint={T.rose} title="互动消息" detail={unread > 0 ? `${unread} 条未读` : "点赞、评论与系统通知"} badge={unread} onClick={() => switchTab("/messages")} />
            <Row icon={<HeartBadgeIcon className="h-[16px] w-[16px]" strokeWidth={1.9} />} tint={T.copper} title="让 Ta 出门" detail="主页 · 日记 · 手机 · 心声" onClick={openOuting} />
            <Row icon={<SparkleIcon className="h-[16px] w-[16px]" strokeWidth={1.9} />} tint={T.yellow} title="创作中心" detail="创建角色、编排多章节故事" onClick={() => switchTab("/create")} last />
          </Panel>
        </section>

        {/* ══ 偏好 ══ */}
        <section className="mt-5 px-4 pb-10">
          <SectionHead zh="偏好" en="PREFERENCE" index="05" />
          <Panel>
            <Row
              icon={<SpeakerIcon className="h-[16px] w-[16px]" strokeWidth={1.9} />}
              tint={T.jade}
              title="角色语音朗读"
              detail={autoVoice ? "新回复自动播报" : "已关闭 · 点气泡可手动播报"}
              onClick={() => setAutoVoice(!autoVoice)}
              chevron={false}
              trailing={<Toggle on={Boolean(autoVoice)} />}
            />
            <Row icon={<GearIcon className="h-[16px] w-[16px]" strokeWidth={1.9} />} tint={T.moon} title="通用设置" detail="缓存清理、账号与本地身份" href="/settings" />
            <Row icon={<EditIcon className="h-[16px] w-[16px]" strokeWidth={1.9} />} tint={T.yellow} title="账号资料" detail="头像、昵称与签名" href="/me/edit" />
            <Row icon={<PuzzleIcon className="h-[16px] w-[16px]" strokeWidth={1.9} />} tint={T.rose} title="扩展模块" detail={`${extOn.length}/5 已启用`} href="/extensions" last />
          </Panel>

          <div className="mt-6 flex flex-col items-center gap-2">
            <span className="font-serif text-[12px] tracking-[0.3em]" style={{ color: "rgba(255,255,255,.22)" }}>
              猫 箱
            </span>
            <RuleDivider color="rgba(255,255,255,.12)" accent={T.copper} width={26} />
            <p className="text-[9.5px] leading-relaxed" style={{ color: "rgba(255,255,255,.26)" }}>
              角色与剧情内容由 AI 生成，请理性看待
            </p>
          </div>
        </section>
      </div>

      {/* ══ 让 Ta 出门 ══ */}
      <VaultSheet
        open={outingOpen}
        onClose={() => setOutingOpen(false)}
        title="让 Ta 出门走走"
        subtitle="读一段角色镜头：主页、日记、手机与心声。"
      >
        <div className="pb-4">
          <Segment value={outing} onChange={(v) => void readOuting(v)} options={OUTINGS.map((o) => ({ id: o.id, label: o.label }))} />
          <div className="relative mt-3 min-h-[150px] overflow-hidden rounded-[16px] p-3.5" style={{ background: "rgba(255,255,255,.03)", boxShadow: `inset 0 0 0 1px ${T.line}` }}>
            <HatchVeil opacity={0.04} color="216,166,87" />
            {outingBusy ? (
              <div className="flex items-center gap-2 text-[11.5px]" style={{ color: T.dim }}>
                <span className="h-[5px] w-[5px] animate-pulse rounded-full" style={{ background: T.yellow }} />
                Ta 正在翻找……
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-[1.9]" style={{ color: T.sub }}>
                {outingText || "选一个地方，看看 Ta 此刻在做什么。"}
              </pre>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <GhostButton onClick={() => void readOuting(outing)}>换一页</GhostButton>
            <Link href="/messages" onClick={() => setOutingOpen(false)} className="flex h-[38px] flex-1 items-center justify-center rounded-[12px] text-[12px] font-semibold" style={{ background: T.yellow, color: "#14140F" }}>
              回去聊天
            </Link>
          </div>
        </div>
      </VaultSheet>
    </div>
  );
}
