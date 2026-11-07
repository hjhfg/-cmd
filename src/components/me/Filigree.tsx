"use client";

import type { CSSProperties } from "react";

/**
 * 「我的」专属装饰语言 —— 深夜猫咪档案馆。
 *
 * 主色是猫箱的柠檬黄，辅以月白与铜金；纹样取自旧纸张与水印：
 * 罗马刻度、双线细框、角花、印章、胶片齿孔。
 * 全部是纯 SVG / CSS，不引入任何图片，任意分辨率都锐利。
 */

/* ───────────────────────── 纹理层 ───────────────────────── */

/** 细密网格：模拟测量纸，铺在页面最底层。 */
export function GridVeil({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,.032) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.032) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        maskImage: "radial-gradient(120% 80% at 50% 0%, #000 35%, transparent 78%)",
        WebkitMaskImage: "radial-gradient(120% 80% at 50% 0%, #000 35%, transparent 78%)",
      }}
    />
  );
}

/** 纸张颗粒。 */
export function Grain({ className = "", opacity = 0.15 }: { className?: string; opacity?: number }) {
  return <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} style={{ opacity, backgroundImage: GRAIN_URL, backgroundSize: "160px 160px" }} />;
}

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E\")";

/** 斜向摩尔纹：用在卡片左上角，像防伪线。 */
export function HatchVeil({ color = "255,229,0", opacity = 0.06 }: { color?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        opacity,
        backgroundImage: `repeating-linear-gradient(135deg, rgba(${color},1) 0 1px, transparent 1px 7px)`,
        maskImage: "radial-gradient(90% 100% at 0% 0%, #000 0%, transparent 62%)",
        WebkitMaskImage: "radial-gradient(90% 100% at 0% 0%, #000 0%, transparent 62%)",
      }}
    />
  );
}

/* ───────────────────────── 角花与边框 ───────────────────────── */

/** 四角花：双折线 + 小圆点，卡片像一枚装裱过的照片。 */
export function CornerTicks({ color = "rgba(255,229,0,.55)", size = 13, inset = 9 }: { color?: string; size?: number; inset?: number }) {
  const base: CSSProperties = { position: "absolute", width: size, height: size, borderColor: color, borderStyle: "solid", pointerEvents: "none" };
  return (
    <>
      <span aria-hidden style={{ ...base, left: inset, top: inset, borderWidth: "1.5px 0 0 1.5px", borderTopLeftRadius: 3 }} />
      <span aria-hidden style={{ ...base, right: inset, top: inset, borderWidth: "1.5px 1.5px 0 0", borderTopRightRadius: 3 }} />
      <span aria-hidden style={{ ...base, left: inset, bottom: inset, borderWidth: "0 0 1.5px 1.5px", borderBottomLeftRadius: 3 }} />
      <span aria-hidden style={{ ...base, right: inset, bottom: inset, borderWidth: "0 1.5px 1.5px 0", borderBottomRightRadius: 3 }} />
    </>
  );
}

/** 章节标题下的分隔线：细线 + 菱形 + 短线。 */
export function RuleDivider({ color = "rgba(255,255,255,.18)", accent = "#FFE500", width = 34 }: { color?: string; accent?: string; width?: number }) {
  return (
    <span aria-hidden className="flex items-center gap-1.5">
      <span className="h-px" style={{ width, background: `linear-gradient(to left, ${color}, transparent)` }} />
      <span className="block h-[5px] w-[5px] rotate-45" style={{ background: accent, opacity: 0.85 }} />
      <span className="h-px" style={{ width: 6, background: color }} />
    </span>
  );
}

/** 竖向细密刻度尺：放在栏目标题左侧，像老式测量仪。 */
export function TickRule({ count = 14, height = 8, color = "rgba(255,255,255,.22)" }: { count?: number; height?: number; color?: string }) {
  return (
    <span aria-hidden className="flex items-end gap-[3px]">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="w-px" style={{ height: i % 4 === 0 ? height : height * 0.45, background: color }} />
      ))}
    </span>
  );
}

/* ───────────────────────── 印章 ───────────────────────── */

/**
 * 编号印章：圆形双环 + 弧排文字，像盖在档案上的印。
 * 顶部一段弧写编号，底部一段弧写英文标签。
 */
export function WaxSeal({
  label,
  caption = "MAOXIANG",
  size = 62,
  color = "#FFE500",
  rotate = -8,
}: {
  label: string;
  caption?: string;
  size?: number;
  color?: string;
  rotate?: number;
}) {
  const r = 26;
  const id = `seal-${label}-${caption}`.replace(/\s+/g, "");
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <defs>
        <path id={`${id}-top`} d="M32,32 m-21,0 a21,21 0 1,1 42,0" fill="none" />
        <path id={`${id}-bottom`} d="M32,32 m-21,0 a21,21 0 1,0 42,0" fill="none" />
      </defs>
      <circle cx="32" cy="32" r="30.5" fill="none" stroke={color} strokeWidth="1.2" opacity="0.85" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="0.7" opacity="0.5" strokeDasharray="2 3" />
      <text fill={color} fontSize="6.2" fontWeight="700" letterSpacing="0.9" fontFamily="ui-monospace, monospace">
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
      <text fill={color} fontSize="4.4" letterSpacing="1.1" opacity="0.78" fontFamily="ui-monospace, monospace">
        <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          {caption}
        </textPath>
      </text>
      <path d="M32 22.5l2.2 6.4 6.3 2.2-6.3 2.2-2.2 6.4-2.2-6.4-6.3-2.2 6.3-2.2z" fill={color} opacity="0.9" />
    </svg>
  );
}

/* ───────────────────────── 徽记 ───────────────────────── */

/** 双环加菱形的层级徽记，用于替换通用图标。 */
export function LevelMark({ level, color = "#FFE500" }: { level: number; color?: string }) {
  return (
    <span className="relative grid place-items-center" style={{ width: 34, height: 34 }}>
      <svg viewBox="0 0 36 36" width="34" height="34" aria-hidden>
        <circle cx="18" cy="18" r="16.2" fill="none" stroke={color} strokeOpacity=".35" strokeWidth="1" />
        <circle cx="18" cy="18" r="12.4" fill="none" stroke={color} strokeOpacity=".18" strokeWidth="3" strokeDasharray="1 4" strokeLinecap="round" />
        <circle cx="18" cy="18" r="8.6" fill={color} fillOpacity=".12" stroke={color} strokeOpacity=".5" strokeWidth=".9" />
      </svg>
      <span className="absolute font-mono text-[11px] font-bold leading-none" style={{ color }}>
        {String(level).padStart(2, "0")}
      </span>
    </span>
  );
}

/** 关系进度：一串菱形，点亮数量代表当前读数。 */
export function DiamondMeter({ value, max = 5, color = "#FFE500" }: { value: number; max?: number; color?: string }) {
  return (
    <span aria-hidden className="flex items-center gap-[3px]">
      {Array.from({ length: max }).map((_, i) => {
        const on = i < value;
        return (
          <span
            key={i}
            className="block h-[6px] w-[6px] rotate-45 transition-colors duration-500"
            style={{ background: on ? color : "rgba(255,255,255,.16)", boxShadow: on ? `0 0 6px ${color}66` : undefined }}
          />
        );
      })}
    </span>
  );
}
