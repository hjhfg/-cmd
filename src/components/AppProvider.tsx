"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { local } from "@/lib/storage";
import { apiGet, apiSend, rotateDeviceToken } from "@/lib/api";
import { ALL_TAGS } from "@/lib/constants";
import { cancelSpeech } from "@/lib/speech";
import type { UserInfo } from "@/lib/types";
import { CheckIcon } from "./icons";
import { Toaster, toast } from "./ui";
import { ErrorBoundary } from "./ErrorBoundary";

interface AppCtx {
  user: UserInfo | null;
  unread: number;
  refresh: () => Promise<void>;
  setUser: (u: UserInfo) => void;
  logout: () => Promise<void>;
  autoVoice: boolean;
  setAutoVoice: (v: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);
const USER_CACHE_KEY = "mx_user_cache";
let memoryUser: UserInfo | null = null;

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

function readUserCache(): UserInfo | null {
  if (memoryUser) return memoryUser;
  try {
    const raw = local.get(USER_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as UserInfo;
    if (cached && typeof cached.id === "number" && cached.nickname) {
      memoryUser = cached;
      return cached;
    }
  } catch {
    // A malformed or unavailable cache must not block access to the app.
  }
  return null;
}

function writeUserCache(user: UserInfo | null) {
  memoryUser = user;
  if (user) local.set(USER_CACHE_KEY, JSON.stringify(user));
  else local.remove(USER_CACHE_KEY);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUserState] = useState<UserInfo | null>(memoryUser);
  const [unread, setUnread] = useState(0);
  const [autoVoice, setAutoVoiceState] = useState(true);
  const [failed, setFailed] = useState(false);

  const setUser = useCallback((next: UserInfo) => {
    writeUserCache(next);
    setUserState(next);
  }, []);

  const refresh = useCallback(async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const result = await apiGet<{ user: UserInfo; unread: number }>("/api/me");
        if (!result?.user) throw new Error("empty user");
        setUser(result.user);
        setUnread(result.unread);
        setFailed(false);
        return;
      } catch {
        setFailed(true);
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await apiSend("/api/me", undefined, "DELETE");
    } catch {
      // Still rotate the local device identity if the network is unavailable.
    }
    rotateDeviceToken();
    writeUserCache(null);
    setUserState(null);
    setUnread(0);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (local.get("mx_auto_voice") === "0") setAutoVoiceState(false);
    if (!memoryUser) {
      const cached = readUserCache();
      if (cached) setUserState(cached);
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const setAutoVoice = useCallback((enabled: boolean) => {
    setAutoVoiceState(enabled);
    local.set("mx_auto_voice", enabled ? "1" : "0");
    if (!enabled) cancelSpeech();
    toast(enabled ? "已开启自动播放语音" : "已关闭自动播放语音");
  }, []);

  const value = useMemo(
    () => ({ user, unread, refresh, setUser, logout, autoVoice, setAutoVoice }),
    [user, unread, refresh, setUser, logout, autoVoice, setAutoVoice],
  );

  return (
    <Ctx.Provider value={value}>
      <div className="relative mx-auto h-[100dvh] min-h-[100vh] w-full max-w-[430px] overflow-hidden bg-black shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 flex min-h-0 flex-col">
          <div className="h-full min-h-0 flex-1">
            <ErrorBoundary pathname={pathname}>{children}</ErrorBoundary>
          </div>
          {failed && !user && (
            <button
              type="button"
              onClick={() => void refresh()}
              className="absolute left-1/2 top-3 z-[70] -translate-x-1/2 rounded-full bg-black/80 px-4 py-1.5 text-[12px] font-medium text-[#FFE500] shadow-lg backdrop-blur"
            >
              网络连接较慢，点击重试
            </button>
          )}
          <Toaster />
        </div>
      </div>
    </Ctx.Provider>
  );
}

/** Optional content preferences, opened by the user from the home screen. */
export function InterestPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {ALL_TAGS.map((tag) => {
        const selected = value.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? value.filter((item) => item !== tag) : [...value, tag])}
            className={`flex h-10 items-center gap-1 rounded-full px-4 text-[14px] transition ${
              selected ? "bg-[#FFE500] font-semibold text-black" : "bg-[#f3f3f5] text-[#3a3a3c]"
            }`}
          >
            {selected && <CheckIcon className="h-3.5 w-3.5" />}
            {tag}
          </button>
        );
      })}
    </div>
  );
}
