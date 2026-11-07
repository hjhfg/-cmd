"use client";

import type { ReactNode } from "react";
import { Sheet } from "@/components/ui";

/**
 * 深色玻璃抽屉：与「我的」页面同一套馆藏质感，
 * 用于正则快速编辑、外出卡片等轻量浮层。
 */
export function VaultSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50" onClick={onClose}>
      <div className="anim-fade absolute inset-0" style={{ background: "rgba(4,4,8,.62)", backdropFilter: "blur(6px)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-up absolute inset-x-0 bottom-0 flex max-h-[86%] flex-col overflow-hidden rounded-t-[26px]"
        style={{
          background: "linear-gradient(180deg, #17171F 0%, #101017 100%)",
          boxShadow: "0 -1px 0 0 rgba(255,255,255,.1), 0 -30px 60px -20px rgba(0,0,0,.8)",
        }}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full" style={{ background: "rgba(255,255,255,.18)" }} />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3.5">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-bold text-[#F8F5EC]">{title}</h3>
            {subtitle && <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "#8B8A9E" }}>{subtitle}</p>}
          </div>
          <button type="button" aria-label="关闭" onClick={onClose} className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: "rgba(255,255,255,.08)", color: "#ACABBE" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">{children}</div>
        {footer && <div className="shrink-0 border-t px-5 py-3.5" style={{ borderColor: "rgba(255,255,255,.07)" }}>{footer}</div>}
      </div>
    </div>
  );
}

export { Sheet };
