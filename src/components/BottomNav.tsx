"use client";

import type { MouseEvent } from "react";
import { useApp } from "./AppProvider";
import { CompassTabIcon, CreateTabIcon, HomeTabIcon, MeTabIcon, MessageTabIcon } from "./icons";

export type TabPath = "/" | "/discover" | "/create" | "/messages" | "/me";

/**
 * 常驻底部导航：由 TabShell 渲染一份，所有标签页共用，切换时不会被重建。
 * 点击不走网络——只是切换显示哪一个保活的页面。
 */
export default function BottomNav({
  active,
  theme,
  onSelect,
}: {
  active: TabPath;
  theme: "dark" | "light";
  onSelect: (path: TabPath) => void;
}) {
  const { unread } = useApp();
  const dark = theme === "dark";
  const bg = dark ? "#000" : "#fff";
  const on = dark ? "text-white" : "text-[#111]";
  const off = dark ? "text-[#6b6b6e]" : "text-[#b4b4b8]";

  const click = (path: TabPath) => (e: MouseEvent<HTMLAnchorElement>) => {
    // 保留 Ctrl/⌘/中键「新标签打开」的原生行为
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelect(path);
  };

  const cls = (path: TabPath) => `relative grid h-full flex-1 place-items-center ${active === path ? on : off}`;

  return (
    <nav
      className={`relative z-30 flex h-[54px] shrink-0 items-center justify-around transition-colors ${
        dark ? "bg-black" : "border-t border-[#f0f0f2] bg-white"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <a href="/" aria-label="推荐" onClick={click("/")} className={cls("/")}>
        <HomeTabIcon active={active === "/"} eye={bg} className="h-[27px] w-[27px]" />
      </a>
      <a href="/discover" aria-label="发现" onClick={click("/discover")} className={cls("/discover")}>
        <CompassTabIcon active={active === "/discover"} eye={bg} className="h-[27px] w-[27px]" />
      </a>
      <a
        href="/create"
        aria-label="创作"
        onClick={click("/create")}
        className={`relative grid h-full flex-1 place-items-center ${dark ? "text-white" : "text-[#111]"}`}
      >
        <CreateTabIcon bg={bg} className="h-[29px] w-[44px]" />
      </a>
      <a href="/messages" aria-label="消息" onClick={click("/messages")} className={cls("/messages")}>
        <MessageTabIcon active={active === "/messages"} eye={bg} className="h-[27px] w-[27px]" />
        {unread > 0 && (
          <span className="absolute left-1/2 top-[7px] ml-1.5 min-w-[17px] rounded-full bg-[#ff2d55] px-1 text-center text-[10px] font-semibold leading-[17px] text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </a>
      <a href="/me" aria-label="我的" onClick={click("/me")} className={cls("/me")}>
        <MeTabIcon active={active === "/me"} className="h-[27px] w-[27px]" />
      </a>
    </nav>
  );
}
