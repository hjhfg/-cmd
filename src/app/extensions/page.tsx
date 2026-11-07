"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PageHeader, toast } from "@/components/ui";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { BookIcon, BrainIcon, KeyboardIcon, SpeakerIcon, WandIcon } from "@/components/icons";
import type { ComponentType, SVGProps } from "react";
type IconC = ComponentType<SVGProps<SVGSVGElement>>;

type Ext = { autoVoice: boolean; actionText: boolean; longMemory: boolean; worldInfo: boolean; typingEffect: boolean };
const defaults: Ext = { autoVoice: true, actionText: true, longMemory: true, worldInfo: true, typingEffect: true };
const modules: { key: keyof Ext; title: string; desc: string; icon: IconC; group: string }[] = [
  { key: "autoVoice", title: "语音朗读", desc: "自动朗读角色与旁白的回复", icon: SpeakerIcon, group: "沉浸体验" },
  { key: "actionText", title: "动作描写", desc: "引导角色用括号描绘神态与动作", icon: WandIcon, group: "沉浸体验" },
  { key: "typingEffect", title: "打字机效果", desc: "逐字显示新生成的回复", icon: KeyboardIcon, group: "沉浸体验" },
  { key: "longMemory", title: "长对话记忆", desc: "向模型传入更多历史消息", icon: BrainIcon, group: "上下文增强" },
  { key: "worldInfo", title: "世界书注入", desc: "根据关键词自动读取启用的世界书", icon: BookIcon, group: "上下文增强" },
];

export default function ExtensionsPage() {
  const { setAutoVoice } = useApp();
  const [cfg, setCfg] = useState<Ext>(defaults);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiGet<Ext>("/api/studio?scope=extensions").then((r) => { setCfg(r); setLoading(false); }).catch(() => setLoading(false)); }, []);
  const toggle = async (key: keyof Ext) => {
    const next = { ...cfg, [key]: !cfg[key] };
    setCfg(next);
    try { await apiSend("/api/studio", { scope: "extensions", action: "save", ...next }); if (key === "autoVoice") setAutoVoice(next.autoVoice); toast(`${modules.find((x) => x.key === key)?.title}已${next[key] ? "启用" : "关闭"}`); }
    catch (e) { setCfg(cfg); toast(e instanceof ApiError ? e.message : "保存失败"); }
  };
  return <div className="flex h-full flex-col bg-[#f6f6f8] text-[#1c1c1e]"><PageHeader title="扩展" /><div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
    <div className="rounded-2xl bg-[#fff6d2] p-4 text-[13px] leading-relaxed text-[#786420]">按自己的喜好定制聊天体验。开关会自动保存，回复相关设置从下一条消息起生效。</div>
    {(["沉浸体验", "上下文增强"] as const).map((g) => <section key={g}><h2 className="mb-2 mt-6 text-[16px] font-bold">{g}</h2><div className="overflow-hidden rounded-2xl bg-white">{modules.filter((m) => m.group === g).map((m) => <button key={m.key} disabled={loading} onClick={() => void toggle(m.key)} className="flex w-full items-center gap-3 border-b border-[#f2f2f4] p-4 text-left last:border-none"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff8d6] text-[#8f7a12]">{<m.icon className="h-[22px] w-[22px]" />}</span><span className="min-w-0 flex-1"><b className="text-[14px]">{m.title}</b><span className="block text-[12px] leading-relaxed text-[#999]">{m.desc}</span></span><span className={`relative h-7 w-12 shrink-0 rounded-full transition ${cfg[m.key] ? "bg-[#ffe500]" : "bg-[#ddd]"}`}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${cfg[m.key] ? "right-0.5" : "left-0.5"}`} /></span></button>)}</div></section>)}
    <div className="mt-6 rounded-2xl bg-white p-4"><h3 className="font-semibold">关于扩展</h3><p className="mt-1 text-[12px] leading-relaxed text-[#999]">目前提供内置扩展能力，不支持安装未经审核的第三方代码。世界书可在「我的 · 世界书」中管理。</p></div>
  </div></div>;
}
