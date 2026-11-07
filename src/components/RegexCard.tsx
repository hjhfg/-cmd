"use client";

import type { ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════
   正则卡片的排版零件 —— 深色档案馆风格的浅色浮层
   ═══════════════════════════════════════════════════════════ */

export const R = {
  paper: "#FBF9F3",
  ink: "#1B1B22",
  sub: "#6E6E7C",
  dim: "#9A9AA8",
  line: "#E9E6DD",
  wash: "#F3F0E7",
  yellow: "#FFE500",
  copper: "#B8863B",
  alert: "#D9484E",
  ok: "#1E9E6A",
} as const;

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-mono text-[10px] tracking-[0.02em] ${className}`} style={{ color: R.dim }}>
      {children}
    </span>
  );
}

/** 正则字面量展示：/pattern/flags，逐字对齐，方便检查。 */
export function Literal({ pattern, flags, broken }: { pattern: string; flags: string; broken?: boolean }) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-[1px] font-mono text-[11.5px] leading-none">
      <span style={{ color: R.dim }}>/</span>
      <span className="truncate" style={{ color: broken ? R.alert : R.ink }}>
        {pattern || "（空）"}
      </span>
      <span style={{ color: R.dim }}>/{flags}</span>
    </span>
  );
}
