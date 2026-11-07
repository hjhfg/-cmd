import { NAME_COLORS } from "./constants";

export function formatCount(n: number): string {
  if (n >= 10000) {
    const v = n / 10000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}w`;
  }
  return String(n);
}

export function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const d = Date.now() - t;
  if (d < 60_000) return "刚刚";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}分钟前`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}小时前`;
  if (d < 86_400_000 * 7) return `${Math.floor(d / 86_400_000)}天前`;
  const x = new Date(iso);
  return `${x.getMonth() + 1}-${x.getDate()}`;
}

export function chatTime(iso: string): string {
  const x = new Date(iso);
  const now = new Date();
  const sameDay = x.toDateString() === now.toDateString();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (sameDay) return `${pad(x.getHours())}:${pad(x.getMinutes())}`;
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (x.toDateString() === y.toDateString()) return "昨天";
  if (now.getTime() - x.getTime() < 6 * 86_400_000) return `星期${"日一二三四五六"[x.getDay()]}`;
  if (x.getFullYear() === now.getFullYear()) return `${x.getMonth() + 1}/${x.getDate()}`;
  return `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`;
}

export function colorOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return NAME_COLORS[h % NAME_COLORS.length];
}

export function stripActions(s: string): string {
  return s.replace(/（[^）]*）|\([^)]*\)/g, "").trim();
}
