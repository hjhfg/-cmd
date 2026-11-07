"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, confirmDialog, toast } from "@/components/ui";
import { CheckIcon, ChevronRight } from "@/components/icons";
import { apiGet, apiSend, ApiError } from "@/lib/api";

type Preset = { id: number; name: string; systemPrompt: string; postHistory: string; temperature: number; maxTokens: number; isActive: boolean };
const templates = [
  { name: "沉浸式角色扮演", systemPrompt: "保持角色人设与情绪连续性，用自然的中文交流；描写细腻的动作与环境，不替用户行动。", postHistory: "根据当前情景推进剧情，避免重复已发生的内容。" },
  { name: "细腻长文", systemPrompt: "以第三人称刻画场景、神态与心理变化，注重人物动机和对话的真实感。", postHistory: "写出有画面感的回应，不要草率结束场景。" },
  { name: "轻松日常", systemPrompt: "保持轻松自然的对话节奏，回复口语化、温暖且有角色特色。", postHistory: "适度推进关系，不要使用说教语气。" },
];

export default function PromptsPage() {
  const [items, setItems] = useState<Preset[]>([]);
  const [editing, setEditing] = useState<Preset | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setItems((await apiGet<{ items: Preset[] }>("/api/studio?scope=prompts")).items); } catch { toast("加载失败"); } }, []);
  useEffect(() => { void load(); }, [load]);
  const call = async (action: string, id: number, rest: Record<string, unknown> = {}) => {
    try { await apiSend("/api/studio", { scope: "prompts", action, id, ...rest }); await load(); toast("已保存"); }
    catch (e) { toast(e instanceof ApiError ? e.message : "操作失败"); }
  };
  const create = async (template?: typeof templates[number]) => {
    try { const r = await apiSend<{ item: Preset }>("/api/studio", { scope: "prompts", action: "create", name: template?.name || "新预设", systemPrompt: template?.systemPrompt || "", postHistory: template?.postHistory || "" }); setItems((x) => [...x, r.item]); setEditing(r.item); }
    catch { toast("创建失败"); }
  };
  return <div className="flex h-full flex-col bg-[#f6f6f8] text-[#1c1c1e]"><PageHeader title="提示词" right={<button onClick={() => void create()} className="rounded-full bg-[#ffe500] px-3 py-1.5 text-sm font-semibold">＋ 新建</button>} />
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
      <div className="rounded-2xl bg-[#fff6d2] p-4 text-[13px] leading-relaxed text-[#786420]">提示词预设控制 AI 的叙事和回复风格。一次只激活一套；身份设定、世界书与角色设定会一起发送给模型。</div>
      <h2 className="mb-2 mt-6 font-bold">我的预设</h2>
      {items.length === 0 && <div className="rounded-2xl bg-white p-6 text-center text-sm text-[#aaa]">暂无预设，试试下方模板</div>}
      <div className="space-y-2">{items.map((p) => <div key={p.id} className="rounded-2xl bg-white p-4"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><b className="text-[15px]">{p.name}</b>{p.isActive && <span className="ml-2 rounded-full bg-[#ffe500] px-2 py-0.5 text-[10px]">使用中</span>}<p className="mt-1 line-clamp-2 text-[12px] text-[#999]">{p.systemPrompt || "点击编辑提示词"}</p></div><button onClick={() => setEditing(p)} className="p-1 text-[#aaa]"><ChevronRight className="h-5 w-5" /></button></div><div className="mt-3 flex gap-2 border-t border-[#f5f5f6] pt-3"><button className={`rounded-full px-3 py-1.5 text-[12px] ${p.isActive ? "bg-[#f3f3f5]" : "bg-[#ffe500] font-semibold"}`} onClick={() => void call(p.isActive ? "deactivate" : "activate", p.id)}>{p.isActive ? "停用" : "启用预设"}</button><button className="rounded-full bg-[#f3f3f5] px-3 py-1.5 text-[12px]" onClick={() => setEditing(p)}>编辑</button><button className="ml-auto text-xs text-[#ff5360]" onClick={async () => { if (await confirmDialog({ title: "删除这套预设？", danger: true })) void call("delete", p.id); }}>删除</button></div></div>)}</div>
      <h2 className="mb-2 mt-7 font-bold">从模板开始</h2><div className="grid gap-2">{templates.map((t) => <button key={t.name} onClick={() => void create(t)} className="flex items-center justify-between rounded-2xl bg-white p-4 text-left text-sm"><span>{t.name}</span><span className="text-[#aaa]">使用模板 ›</span></button>)}</div>
    </div>
    {editing && <div className="absolute inset-0 z-40 flex flex-col bg-[#f6f6f8]"><PageHeader title="编辑提示词" onBack={() => setEditing(null)} right={<button disabled={busy} className="font-semibold text-[#b18c00]" onClick={async () => { setBusy(true); await call("update", editing.id, editing as unknown as Record<string, unknown>); setBusy(false); setEditing(null); }}>保存</button>} /><div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-8">
      <label className="mt-2 block text-sm font-semibold">预设名称<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} maxLength={40} className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label>
      <label className="block text-sm font-semibold">主提示词 <span className="font-normal text-[#aaa]">（系统提示）</span><textarea value={editing.systemPrompt} onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })} rows={9} maxLength={6000} placeholder="告诉 AI 应如何扮演角色、采用怎样的叙事风格……" className="mt-2 w-full resize-none rounded-xl bg-white p-3.5 font-normal leading-relaxed outline-none" /></label>
      <label className="block text-sm font-semibold">历史后指令<textarea value={editing.postHistory} onChange={(e) => setEditing({ ...editing, postHistory: e.target.value })} rows={5} maxLength={3000} placeholder="在聊天历史后进一步要求 AI 如何回复" className="mt-2 w-full resize-none rounded-xl bg-white p-3.5 font-normal leading-relaxed outline-none" /></label>
      <label className="block text-sm font-semibold">温度：{(editing.temperature / 100).toFixed(2)}<input type="range" min="0" max="200" value={editing.temperature} onChange={(e) => setEditing({ ...editing, temperature: Number(e.target.value) })} className="mt-3 w-full accent-[#e7c600]" /></label>
      <label className="block text-sm font-semibold">最大输出 tokens<input type="number" min="64" max="4000" value={editing.maxTokens} onChange={(e) => setEditing({ ...editing, maxTokens: Number(e.target.value) })} className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label>
      <button className="h-12 w-full rounded-full bg-[#ffe500] font-bold" onClick={async () => { await call("update", editing.id, editing as unknown as Record<string, unknown>); setEditing(null); }}>保存预设</button>
    </div></div>}
  </div>;
}
