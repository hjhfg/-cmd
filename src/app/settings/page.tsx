"use client";
import { local, session } from "@/lib/storage";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { PageHeader, Sheet, confirmDialog, toast } from "@/components/ui";
import { ChevronRight } from "@/components/icons";
import { apiSend } from "@/lib/api";

function Row({ label, value, onClick, href, danger }: { label: string; value?: ReactNode; onClick?: () => void; href?: string; danger?: boolean }) {
  const inner = (
    <>
      <span className={`text-[15px] ${danger ? "text-[#ff3b30]" : "text-[#161616]"}`}>{label}</span>
      <span className="flex items-center gap-1 text-[13px] text-[#a0a0a5]">
        {value}
        {!danger && <ChevronRight className="h-4 w-4 text-[#c7c7cc]" />}
      </span>
    </>
  );
  const cls = "flex h-[54px] w-full items-center justify-between border-b border-[#f2f2f4] px-4 last:border-b-0";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      role="switch"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={`relative inline-block h-[28px] w-[48px] rounded-full transition ${on ? "bg-[#34c759]" : "bg-[#e5e5ea]"}`}
    >
      <span className={`absolute top-[2px] h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-[2px]"}`} />
    </span>
  );
}

const DOCS: Record<string, string> = {
  用户协议: "欢迎使用猫箱。猫箱中的角色与故事内容均由人工智能生成，不代表平台立场。请遵守法律法规，文明创作、友善互动，不得发布违法违规内容。",
  隐私政策: "我们重视你的隐私。你的聊天记录仅用于为你提供对话服务，不会公开展示。你可以随时在设置中清空聊天记录或退出登录。",
  关于猫箱: "猫箱 v2.28.0\n和心动 AI 探索剧情宇宙。身临其境地与个性鲜明、背景各异的虚拟 AI 角色聊天互动，开启专属于你们的故事！",
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, refresh, logout: logoutAccount, autoVoice, setAutoVoice } = useApp();
  const [doc, setDoc] = useState<string | null>(null);

  async function clearChats() {
    const ok = await confirmDialog({ title: "清空聊天记录", content: "将删除与所有角色和故事的聊天记录，且无法恢复", okText: "清空", danger: true });
    if (!ok) return;
    try {
      await apiSend("/api/conversations", { action: "clearAll" });
      await refresh();
      toast("聊天记录已清空");
    } catch {
      toast("清空失败，请稍后重试");
    }
  }

  function clearCache() {
    // 保留设备令牌，避免清理缓存后丢失当前本地账号
    const keep = new Set(["mx_device_token", "mx_auto_voice"]);
    local.keys()
      .filter((k) => k.startsWith("mx_") && !keep.has(k))
      .forEach((k) => local.remove(k));
    session.clear();
    toast("缓存已清理");
  }

  async function logout() {
    const ok = await confirmDialog({ title: "退出登录", content: "退出后将以新的游客身份进入猫箱", okText: "退出", danger: true });
    if (!ok) return;
    await logoutAccount();
    router.replace("/");
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f5f7]">
      <PageHeader title="设置" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
        <div className="mt-2 overflow-hidden rounded-2xl bg-white">
          <Row label="编辑资料" href="/me/edit" />
          <Row label="账号与安全" value={`游客 · ${user?.code ?? ""}`} onClick={() => toast("当前为游客账号，绑定手机号功能即将开放")} />
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white">
          <div className="flex h-[54px] items-center justify-between border-b border-[#f2f2f4] px-4">
            <span className="text-[15px] text-[#161616]">自动播放角色语音</span>
            <Toggle on={autoVoice} onChange={setAutoVoice} />
          </div>
          <Row label="内容偏好" value="首页左上角可修改" onClick={() => router.push("/")} />
          <Row label="青少年模式" value="未开启" onClick={() => toast("青少年模式开启后，将为你提供更适合的内容")} />
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white">
          <Row label="清空聊天记录" onClick={() => void clearChats()} />
          <Row label="清理缓存" onClick={clearCache} />
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white">
          {Object.keys(DOCS).map((k) => (
            <Row key={k} label={k} value={k === "关于猫箱" ? "v2.28.0" : undefined} onClick={() => setDoc(k)} />
          ))}
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl bg-white">
          <Row label="退出登录" danger onClick={() => void logout()} />
        </div>
        <p className="mt-6 text-center text-[12px] text-[#b0b0b5]">内容由 AI 生成，请理性看待</p>
      </div>
      <Sheet open={!!doc} onClose={() => setDoc(null)} title={doc ?? ""}>
        <p className="whitespace-pre-wrap px-5 pb-8 text-[14.5px] leading-[1.8] text-[#3a3a3c]">{doc ? DOCS[doc] : ""}</p>
      </Sheet>
    </div>
  );
}
