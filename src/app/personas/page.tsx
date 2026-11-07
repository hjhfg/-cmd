"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar, PageHeader, confirmDialog, toast } from "@/components/ui";
import { CheckIcon, EditIcon, ImageIcon, PlusCircleIcon, TrashIcon } from "@/components/icons";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { fileToDataUrl } from "@/lib/image";

interface Persona { id: number; name: string; description: string; notes: string; avatar: string; isDefault: boolean }

export default function PersonasPage() {
  const [conversationId, setConversationId] = useState(0);
  useEffect(() => { setConversationId(Number(new URLSearchParams(window.location.search).get("conversation")) || 0); }, []);
  const [items, setItems] = useState<Persona[]>([]);
  const [editing, setEditing] = useState<Persona | null>(null);
  const [saving, setSaving] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    try { setItems((await apiGet<{ items: Persona[] }>("/api/studio?scope=personas")).items); }
    catch { toast("设定加载失败"); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const run = async (action: string, id: number, extra: Record<string, unknown> = {}) => {
    try { await apiSend("/api/studio", { scope: "personas", action, id, ...extra }); await load(); toast(action === "bind" ? "本次聊天已切换身份" : "操作成功"); }
    catch (e) { toast(e instanceof ApiError ? e.message : "操作失败"); }
  };
  const create = async () => {
    try { const { item } = await apiSend<{ item: Persona }>("/api/studio", { scope: "personas", action: "create" }); setItems((old) => [...old, item]); setEditing(item); }
    catch { toast("创建失败"); }
  };
  const autoNew = useRef(false);
  useEffect(() => {
    if (autoNew.current) return;
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      autoNew.current = true;
      void create();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const save = async () => {
    if (!editing?.name.trim() || saving) return toast("请填写设定名称");
    setSaving(true);
    try { await run("update", editing.id, editing as unknown as Record<string, unknown>); setEditing(null); }
    finally { setSaving(false); }
  };
  return <div className="flex h-full flex-col bg-[#f6f6f8] text-[#202024]">
    <PageHeader title="设定管理" right={<button onClick={() => void create()} className="rounded-full bg-[#ffe500] px-3 py-1.5 text-sm font-semibold">＋ 新建</button>} />
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
      <div className="rounded-2xl bg-[#fff6d2] px-4 py-3 text-[13px] leading-relaxed text-[#76621e]">用户设定决定你在故事中是谁。设为默认后，对所有新对话生效；也可以在聊天中单独指定身份。</div>
      {items.length === 0 && <div className="py-16 text-center text-sm text-[#aaa]">还没有身份设定，创建一张属于你的设定卡吧</div>}
      <div className="mt-4 space-y-3">
        {items.map((p) => <div key={p.id} className="rounded-[20px] bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3"><Avatar src={p.avatar} name={p.name} size={54} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2 font-bold">{p.name}{p.isDefault && <span className="rounded-full bg-[#ffe500] px-2 py-0.5 text-[10px]">默认</span>}</div><p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[#8a8a90]">{p.description || "尚未填写身份描述"}</p></div></div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#f1f1f3] pt-3 text-xs">
            <button className="rounded-full bg-[#ffe500] px-3 py-2 font-semibold" onClick={() => void run(conversationId > 0 ? "bind" : "default", p.id, { conversationId })}>{conversationId > 0 ? "用于当前聊天" : p.isDefault ? "✓ 当前默认" : "设为默认"}</button>
            <button className="rounded-full bg-[#f3f3f5] px-3 py-2" onClick={() => setEditing(p)}>编辑</button>
            <button className="rounded-full bg-[#f3f3f5] px-3 py-2" onClick={() => void run("duplicate", p.id)}>复制</button>
            <button className="ml-auto rounded-full px-2 py-2 text-[#ff5264]" onClick={async () => { if (await confirmDialog({ title: "删除身份设定？", content: "已绑定的对话将恢复使用默认身份。", danger: true })) void run("delete", p.id); }}>删除</button>
          </div>
        </div>)}
      </div>
    </div>
    {editing && <div className="absolute inset-0 z-40 flex flex-col bg-[#f6f6f8]"><PageHeader title="编辑身份设定" onBack={() => setEditing(null)} right={<button onClick={() => void save()} disabled={saving} className="font-semibold text-[#b18c00]">保存</button>} />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8"><div className="flex flex-col items-center py-5"><button onClick={() => file.current?.click()} className="relative"><Avatar src={editing.avatar} name={editing.name} size={84} /><span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-xs shadow">更换</span></button><input ref={file} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) try { setEditing({ ...editing, avatar: await fileToDataUrl(f, 300) }); } catch { toast("图片读取失败"); } }} /></div>
      <label className="mt-5 block text-sm font-semibold">身份名称<input value={editing.name} maxLength={30} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="例如：旅行中的剑客" className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label>
      <label className="mt-5 block text-sm font-semibold">身份描述 <span className="font-normal text-[#aaa]">（会发送给 AI）</span><textarea value={editing.description} maxLength={4000} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="描述你的外貌、性格、背景、与角色的关系……" rows={8} className="mt-2 w-full resize-none rounded-xl bg-white p-3.5 font-normal leading-relaxed outline-none" /></label>
      <label className="mt-5 block text-sm font-semibold">私人备注 <span className="font-normal text-[#aaa]">（不会发送给 AI）</span><textarea value={editing.notes} maxLength={2000} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={4} placeholder="仅供自己查看的备注" className="mt-2 w-full resize-none rounded-xl bg-white p-3.5 font-normal outline-none" /></label>
      <button onClick={() => void save()} className="mt-7 h-12 w-full rounded-full bg-[#ffe500] font-bold">保存身份设定</button></div></div>}
  </div>;
}
