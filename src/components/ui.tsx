"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatSmallIcon, ChevronLeft, CloseIcon, HeartFill } from "./icons";
import { colorOf, formatCount } from "@/lib/format";
import type { FeedItem } from "@/lib/types";

/* ------------------------------ Avatar ------------------------------ */

/** Background style that crops a 9:16 portrait around a face focus ("fx% fy% scale"). */
export function avatarBg(src: string, focus: string, size: number): CSSProperties {
  const parts = (focus || "cover").trim().split(/\s+/);
  if (parts[0] === "cover" || parts.length < 3) {
    return { backgroundImage: `url("${src}")`, backgroundSize: "cover", backgroundPosition: "center 22%" };
  }
  const fx = parseFloat(parts[0]) / 100;
  const fy = parseFloat(parts[1]) / 100;
  const s = parseFloat(parts[2]) || 1.5;
  const w = size * s;
  const h = w * (16 / 9);
  const x = Math.min(0, Math.max(size - w, size / 2 - fx * w));
  const y = Math.min(0, Math.max(size - h, size / 2 - fy * h));
  return { backgroundImage: `url("${src}")`, backgroundSize: `${w}px ${h}px`, backgroundPosition: `${x}px ${y}px` };
}

export function Avatar({
  src,
  focus,
  size,
  name,
  className = "",
  style,
}: {
  src?: string;
  focus?: string;
  size: number;
  name?: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!src) {
    const n = name || "猫";
    return (
      <div
        className={`grid shrink-0 place-items-center rounded-full font-semibold text-white ${className}`}
        style={{ width: size, height: size, background: colorOf(n), fontSize: size * 0.42, ...style }}
      >
        {n.slice(0, 1)}
      </div>
    );
  }
  return (
    <div
      className={`shrink-0 rounded-full bg-neutral-600 bg-no-repeat ${className}`}
      style={{ width: size, height: size, ...avatarBg(src, focus ?? "cover", size), ...style }}
    />
  );
}

/* ------------------------------ Sheet ------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  children,
  dark = false,
  full = false,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  dark?: boolean;
  full?: boolean;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50" data-nolike onClick={onClose}>
      <div className="anim-fade absolute inset-0 bg-black/45" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`anim-up absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[18px] ${full ? "h-[86%]" : "max-h-[84%]"} ${
          dark ? "bg-[#1c1c1e] text-white" : "bg-white text-[#161616]"
        } ${className}`}
      >
        {title !== undefined && (
          <div className="relative flex h-[50px] shrink-0 items-center justify-center px-12 text-[15px] font-semibold">
            <span className="truncate">{title}</span>
            <button aria-label="关闭" onClick={onClose} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 opacity-60">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------- Toast & Confirm ------------------------- */

type ConfirmOpts = { title: string; content?: string; okText?: string; cancelText?: string; danger?: boolean };
type ConfirmReq = ConfirmOpts & { resolve: (v: boolean) => void };

export function toast(text: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<string>("mx-toast", { detail: text }));
}

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<ConfirmReq>("mx-confirm", { detail: { ...opts, resolve } }));
  });
}

export function Toaster() {
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [confirm, setConfirm] = useState<ConfirmReq | null>(null);
  useEffect(() => {
    let n = 0;
    const onToast = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      const id = ++n;
      setToasts((t) => [...t.slice(-2), { id, text }]);
      window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
    };
    const onConfirm = (e: Event) => setConfirm((e as CustomEvent<ConfirmReq>).detail);
    window.addEventListener("mx-toast", onToast);
    window.addEventListener("mx-confirm", onConfirm);
    return () => {
      window.removeEventListener("mx-toast", onToast);
      window.removeEventListener("mx-confirm", onConfirm);
    };
  }, []);
  const close = (v: boolean) => {
    confirm?.resolve(v);
    setConfirm(null);
  };
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-[42%] z-[100] flex flex-col items-center gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="anim-pop max-w-[78%] rounded-xl bg-black/80 px-4 py-2.5 text-center text-[14px] leading-snug text-white">
            {t.text}
          </div>
        ))}
      </div>
      {confirm && (
        <div className="anim-fade absolute inset-0 z-[90] grid place-items-center bg-black/50 px-10">
          <div className="anim-pop w-full max-w-[290px] overflow-hidden rounded-2xl bg-white text-center">
            <div className="px-5 pb-4 pt-5">
              <div className="text-[16px] font-semibold text-[#161616]">{confirm.title}</div>
              {confirm.content && <div className="mt-2 text-[14px] leading-relaxed text-[#77777c]">{confirm.content}</div>}
            </div>
            <div className="flex border-t border-[#eee] text-[16px]">
              <button className="h-12 flex-1 text-[#77777c]" onClick={() => close(false)}>
                {confirm.cancelText ?? "取消"}
              </button>
              <button
                className={`h-12 flex-1 border-l border-[#eee] font-semibold ${confirm.danger ? "text-[#ff3b30]" : "text-[#161616]"}`}
                onClick={() => close(true)}
              >
                {confirm.okText ?? "确定"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------ Misc ------------------------------ */

export function Spinner({ className = "" }: { className?: string }) {
  return <div className={`h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function useGoBack() {
  const router = useRouter();
  return () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  };
}

export function PageHeader({ title, right, dark = false, onBack }: { title?: ReactNode; right?: ReactNode; dark?: boolean; onBack?: () => void }) {
  const back = useGoBack();
  return (
    <header className={`relative flex h-12 shrink-0 items-center justify-center ${dark ? "text-white" : "text-[#161616]"}`}>
      <button aria-label="返回" onClick={onBack ?? back} className="absolute left-1.5 p-2">
        <ChevronLeft className="h-6 w-6" />
      </button>
      {title && <h1 className="text-[17px] font-semibold">{title}</h1>}
      {right && <div className="absolute right-3 flex items-center">{right}</div>}
    </header>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <svg viewBox="0 0 120 104" className="h-20 w-24 opacity-25">
        <path d="M18 48c0-14 8-24 18-24l5-14 10 14h18c18 0 30 10 32 24z" fill="#888" />
        <rect x="16" y="46" width="88" height="48" rx="10" fill="none" stroke="#888" strokeWidth="8" />
      </svg>
      <p className="mt-3 text-[14px] text-[#9a9aa0]">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function WorkCard({ item, href }: { item: FeedItem; href?: string }) {
  return (
    <Link href={href ?? `/chat/${item.type}/${item.id}`} className="block overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="relative aspect-[3/4] bg-neutral-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.cover} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        {item.type === "story" && (
          <span className="absolute left-2 top-2 rounded-md bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">故事</span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2.5 pb-2 pt-10">
          <div className="line-clamp-1 text-[15px] font-semibold text-white">{item.title}</div>
        </div>
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <p className="line-clamp-2 min-h-[36px] text-[12.5px] leading-[1.45] text-[#55555a]">{item.intro || "快来和Ta聊聊吧～"}</p>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#9a9aa0]">
          <span className="truncate">@{item.creatorName}</span>
          <span className="flex shrink-0 items-center gap-0.5">
            <ChatSmallIcon className="h-3.5 w-3.5" />
            {formatCount(item.chatCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function LikeBadge({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5 text-[11px] font-medium text-white text-shadow">
      <HeartFill className="h-3.5 w-3.5" />
      {formatCount(count)}
    </span>
  );
}
