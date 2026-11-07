"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CornerTicks } from "./Filigree";

/* ═══════════════════════════════════════════════════════════
   「我的」组件库 2.0 —— 深夜猫咪档案馆
   深靛底 / 柠檬黄主光 / 铜金辅助 / 思源宋体标题
   ═══════════════════════════════════════════════════════════ */

export const T = {
  stage: "#0A0A0E",
  stage2: "#0E0E15",
  card: "#13131C",
  card2: "#171722",
  raised: "#1D1D2A",
  line: "rgba(255,255,255,0.07)",
  line2: "rgba(255,255,255,0.12)",
  paper: "#F8F5EC",
  sub: "#ACABBE",
  dim: "#8B8A9E",
  faint: "rgba(255,255,255,0.34)",
  yellow: "#FFE500",
  copper: "#D8A657",
  moon: "#9CB4FF",
  rose: "#FF8FAE",
  jade: "#5FE0AE",
  alert: "#FF6F73",
} as const;

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ───────────────────────── 章节标题 ───────────────────────── */

export function SectionHead({
  zh,
  en,
  index,
  right,
  serif = true,
}: {
  zh: string;
  en: string;
  index?: string;
  right?: ReactNode;
  serif?: boolean;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div className="flex min-w-0 items-baseline gap-2">
        {index && (
          <span className="shrink-0 font-mono text-[10px] font-bold tracking-[0.16em]" style={{ color: rgba(T.yellow, 0.75) }}>
            {index}
          </span>
        )}
        <h2
          className={`truncate text-[16px] font-bold tracking-[0.01em] ${serif ? "font-serif" : ""}`}
          style={{ color: T.paper }}
        >
          {zh}
        </h2>
        <span className="shrink-0 font-mono text-[9px] tracking-[0.24em]" style={{ color: "rgba(255,255,255,.26)" }}>
          {en}
        </span>
      </div>
      {right}
    </div>
  );
}

/* ───────────────────────── 卡片 ───────────────────────── */

export function Panel({ children, className = "", glow = false }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[20px] ${className}`}
      style={{
        background: `linear-gradient(168deg, ${T.card2} 0%, ${T.card} 58%, #101018 100%)`,
        boxShadow: glow
          ? `inset 0 0 0 1px ${rgba(T.yellow, 0.16)}, 0 18px 44px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(0,0,0,.4)`
          : `inset 0 0 0 1px ${T.line}, 0 16px 40px -34px rgba(0,0,0,.9)`,
      }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,.16), transparent)" }} />
      {children}
    </div>
  );
}

/** 带角花与斜纹的「装裱卡」。 */
export function MountedPanel({ children, className = "", accent = T.yellow }: { children: ReactNode; className?: string; accent?: string }) {
  return (
    <div className={className}>
      <div className="relative">
        <Panel>
          <CornerTicks color={rgba(accent, 0.6)} inset={8} size={12} />
          {children}
        </Panel>
      </div>
    </div>
  );
}

/* ───────────────────────── 开关 ───────────────────────── */

export function Toggle({ on, accent = T.yellow }: { on: boolean; accent?: string }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      className="relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-300"
      style={{ background: on ? accent : "rgba(255,255,255,.14)", boxShadow: on ? `0 0 0 1px ${rgba(accent, 0.5)}, 0 6px 16px -8px ${rgba(accent, 0.8)}` : `inset 0 0 0 1px ${T.line}` }}
    >
      <span
        className="absolute top-[3px] h-[20px] w-[20px] rounded-full transition-all duration-300"
        style={{
          left: on ? 23 : 3,
          background: on ? "#111109" : "#D6D4E2",
          boxShadow: "0 1px 3px rgba(0,0,0,.5)",
        }}
      />
    </span>
  );
}

/* ───────────────────────── 行 ───────────────────────── */

export function Row({
  icon,
  tint,
  title,
  detail,
  trailing,
  onClick,
  href,
  last,
  chevron = true,
  badge,
  dim,
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  detail?: string;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  last?: boolean;
  chevron?: boolean;
  badge?: number;
  dim?: boolean;
}) {
  const body = (
    <>
      <span
        className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px]"
        style={{ background: rgba(tint, 0.1), color: tint, boxShadow: `inset 0 0 0 1px ${rgba(tint, 0.18)}` }}
      >
        {icon}
      </span>
      <span className={`flex min-w-0 flex-1 items-center gap-3 py-[12px] pr-4 ${last ? "" : "border-b"}`} style={{ borderColor: T.line }}>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[14px] font-medium" style={{ color: dim ? T.sub : T.paper }}>
            {title}
            {!!badge && badge > 0 && (
              <span className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1.5 text-[9.5px] font-bold leading-none" style={{ background: T.alert, color: "#1A0B0C" }}>
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </span>
          {detail && (
            <span className="mt-[2px] block truncate text-[11px] leading-[1.5]" style={{ color: T.dim }}>
              {detail}
            </span>
          )}
        </span>
        {trailing ?? (chevron ? <Chevron /> : null)}
      </span>
    </>
  );
  const cls = "flex w-full items-center gap-3 pl-3.5 text-left transition-colors duration-150 active:bg-white/[0.04]";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export function Chevron({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(255,255,255,.22)", flexShrink: 0 }} aria-hidden>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ───────────────────────── 标签 ───────────────────────── */

export function Chip({ children, color = T.yellow, solid = false }: { children: ReactNode; color?: string; solid?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[9.5px] font-bold tracking-[0.04em]"
      style={
        solid
          ? { background: color, color: "#14140F" }
          : { background: rgba(color, 0.12), color, boxShadow: `inset 0 0 0 1px ${rgba(color, 0.24)}` }
      }
    >
      {children}
    </span>
  );
}

/** 胶囊切换组。 */
export function Segment<T extends string>({
  value,
  options,
  onChange,
  accent = T.yellow,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  accent?: string;
}) {
  return (
    <div
      className="flex gap-1 rounded-full p-1"
      style={{ background: "rgba(255,255,255,.045)", boxShadow: `inset 0 0 0 1px ${T.line}` }}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="flex-1 rounded-full py-[7px] text-[12px] font-semibold transition-all duration-200"
            style={on ? { background: accent, color: "#14140F", boxShadow: `0 6px 18px -10px ${rgba(accent, 0.9)}` } : { color: T.sub }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── 按钮 ───────────────────────── */

export function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex h-[46px] w-full items-center justify-center gap-2 overflow-hidden rounded-[15px] text-[14px] font-bold transition active:scale-[0.988] disabled:opacity-50"
      style={{ background: T.yellow, color: "#14140F", boxShadow: `0 14px 34px -18px ${rgba(T.yellow, 0.85)}` }}
    >
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(135deg, rgba(0,0,0,.05) 0 1px, transparent 1px 8px)" }} />
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}

export function GhostButton({ children, onClick, href }: { children: ReactNode; onClick?: () => void; href?: string }) {
  const cls =
    "flex h-[38px] items-center justify-center gap-1.5 rounded-[12px] px-3 text-[12px] font-medium transition active:scale-[0.985]";
  const style = { background: "rgba(255,255,255,.06)", color: T.paper, boxShadow: `inset 0 0 0 1px ${T.line2}` };
  return href ? (
    <Link href={href} className={cls} style={style}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {children}
    </button>
  );
}

/* ───────────────────────── 数据 ───────────────────────── */

export function Stat({ value, unit, label, accent = T.yellow }: { value: ReactNode; unit?: string; label: string; accent?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="flex items-baseline gap-0.5">
        <span className="font-mono text-[19px] font-bold leading-none tracking-[-0.02em]" style={{ color: accent }}>
          {value}
        </span>
        {unit && (
          <span className="text-[9.5px]" style={{ color: rgba(accent, 0.7) }}>
            {unit}
          </span>
        )}
      </div>
      <span className="mt-[6px] text-[10px] tracking-[0.06em]" style={{ color: T.dim }}>
        {label}
      </span>
    </div>
  );
}

export function StatBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-stretch divide-x" style={{ borderColor: T.line }}>
      <style>{`/* 统计条分隔线 */`}</style>
      {children}
    </div>
  );
}
