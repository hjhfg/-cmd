"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, confirmDialog, toast } from "@/components/ui";
import { BookIcon, ChevronRight, CheckIcon } from "@/components/icons";
import { apiGet, apiSend, ApiError } from "@/lib/api";

type Book = { id: number; name: string; description: string; enabled: boolean };
type Entry = { id: number; bookId: number; title: string; keywords: string; content: string; constant: boolean; enabled: boolean; priority: number };

export default function WorldbookPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Book | null>(null);
  const [renameText, setRenameText] = useState("");
  const load = useCallback(async () => { try { const r = await apiGet<{ books: Book[]; entries: Entry[] }>("/api/studio?scope=world"); setBooks(r.books); setEntries(r.entries); } catch { toast("世界书加载失败"); } }, []);
  useEffect(() => { void load(); }, [load]);
  const call = async (action: string, extra: Record<string, unknown>) => { try { const r = await apiSend<{ item?: Book | Entry }>("/api/studio", { scope: "world", action, ...extra }); await load(); return r; } catch (e) { toast(e instanceof ApiError ? e.message : "操作失败"); return null; } };
  const book = books.find((x) => x.id === selected);
  const bookEntries = entries.filter((x) => x.bookId === selected);
  return <div className="flex h-full flex-col bg-[#f6f6f8] text-[#1c1c1e]">
    <PageHeader title={book ? book.name : "世界书"} onBack={selected ? () => setSelected(null) : undefined} right={<button onClick={() => { if (selected) void call("createEntry", { bookId: selected }).then((r) => { if (r?.item) setEditing(r.item as Entry); }); else setCreating(true); }} className="rounded-full bg-[#ffe500] px-3 py-1.5 text-sm font-semibold">＋ {selected ? "条目" : "新建"}</button>} />
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
      {!book ? <><div className="rounded-2xl bg-[#fff6d2] p-4 text-[13px] leading-relaxed text-[#786420]">世界书用于储存地点、事件、人物等背景信息。启用后，常驻条目与最近聊天中关键词命中的条目会自动注入 AI 上下文。</div>
        {books.length === 0 && <p className="py-16 text-center text-sm text-[#aaa]">尚无世界书，点击右上角新建</p>}
        <div className="mt-4 space-y-3">{books.map((b) => <div key={b.id} className="rounded-2xl bg-white p-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff6c8] text-[#8f7a12]"><BookIcon className="h-[22px] w-[22px]" /></span><button className="min-w-0 flex-1 text-left" onClick={() => setSelected(b.id)}><b className="text-[15px]">{b.name}</b><p className="mt-0.5 text-[12px] text-[#999]">{entries.filter((e) => e.bookId === b.id).length} 个条目 · {b.description || "点击查看条目"}</p></button><ChevronRight className="h-5 w-5 text-[#aaa]" /></div><div className="mt-3 flex gap-2 border-t border-[#f4f4f5] pt-3"><button className={`rounded-full px-3 py-1.5 text-xs ${b.enabled ? "bg-[#ffe500]" : "bg-[#f3f3f5]"}`} onClick={() => void call("toggleBook", { id: b.id })}>{b.enabled ? "● 已启用" : "○ 已停用"}</button><button className="ml-auto text-xs text-[#f05a61]" onClick={async () => { if (await confirmDialog({ title: `删除「${b.name}」？`, content: "书中的所有条目也将被删除", danger: true })) void call("deleteBook", { id: b.id }); }}>删除</button></div></div>)}</div>
      </> : <><div className="rounded-2xl bg-white p-4"><b>{book.name}</b><p className="mt-1 text-[13px] text-[#888]">{book.description || "输入关键词可在聊天时自动触发相关背景"}</p><div className="mt-2 flex gap-3 text-xs"><button onClick={() => { setRenaming(book); setRenameText(book.name); }} className="text-[#a38200]">重命名</button><button onClick={() => void call("toggleBook", { id: book.id })} className="text-[#888]">{book.enabled ? "停用此书" : "启用此书"}</button></div></div>
        <h2 className="mb-2 mt-5 font-semibold">条目 · {bookEntries.length}</h2>{bookEntries.length === 0 && <p className="py-12 text-center text-sm text-[#aaa]">还没有条目，添加人物、地点或背景设定</p>}
        <div className="space-y-2">{bookEntries.map((e) => <div key={e.id} className="rounded-2xl bg-white p-4"><div className="flex items-center gap-2"><button onClick={() => setEditing(e)} className="min-w-0 flex-1 text-left"><b className="text-[15px]">{e.title}</b><div className="mt-1 text-[12px] text-[#999]">{e.constant ? "常驻条目" : `关键词：${e.keywords || "未设置"}`} · 优先级 {e.priority}</div></button><button onClick={() => void call("toggleEntry", { id: e.id })} className={`rounded-full px-2.5 py-1 text-xs ${e.enabled ? "bg-[#ffe500]" : "bg-[#eee] text-[#aaa]"}`}>{e.enabled ? "启用" : "停用"}</button></div><p className="mt-2 line-clamp-2 text-[13px] text-[#777]">{e.content || "点击填写内容"}</p></div>)}</div>
      </>}
    </div>
    {creating && <div className="absolute inset-0 z-40 bg-[#f6f6f8]"><PageHeader title="新建世界书" onBack={() => setCreating(false)} /><div className="px-5 pt-4"><label className="text-sm font-semibold">世界书名称<input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="例如：青城山纪事" className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label><button onClick={async () => { if (!name.trim()) return toast("请输入名称"); const r = await call("createBook", { name }); if (r?.item) { setSelected((r.item as Book).id); setCreating(false); setName(""); } }} className="mt-6 h-12 w-full rounded-full bg-[#ffe500] font-bold">创建世界书</button></div></div>}
    {renaming && <div className="absolute inset-0 z-[45] flex items-end bg-black/40" onClick={() => setRenaming(null)}><div className="w-full rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}><h3 className="text-[16px] font-bold">重命名世界书</h3><input value={renameText} onChange={(e) => setRenameText(e.target.value)} maxLength={50} placeholder="世界书名称" className="mt-3 w-full rounded-xl bg-[#f4f4f6] p-3.5 outline-none" /><div className="mt-4 flex gap-3"><button onClick={() => setRenaming(null)} className="h-11 flex-1 rounded-full bg-[#f2f2f4]">取消</button><button onClick={async () => { const name = renameText.trim(); if (!name) return toast("请输入名称"); await call("updateBook", { id: renaming.id, name, description: renaming.description }); setRenaming(null); }} className="h-11 flex-1 rounded-full bg-[#ffe500] font-semibold">保存</button></div></div></div>}
    {editing && <div className="absolute inset-0 z-40 flex flex-col bg-[#f6f6f8]"><PageHeader title="编辑条目" onBack={() => setEditing(null)} right={<button onClick={async () => { const r = await call("updateEntry", { ...editing, id: editing.id }); if (r) { setEditing(null); toast("条目已保存"); } }} className="font-semibold text-[#af8b00]">保存</button>} /><div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-8">
      <label className="mt-2 block text-sm font-semibold">条目名称<input value={editing.title} maxLength={80} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label>
      <div className="flex items-center justify-between rounded-xl bg-white p-4"><div><b className="text-sm">常驻条目</b><p className="text-xs text-[#999]">每次聊天都注入，无需关键词</p></div><button onClick={() => setEditing({ ...editing, constant: !editing.constant })} className={`relative h-7 w-12 rounded-full ${editing.constant ? "bg-[#ffe500]" : "bg-[#ddd]"}`}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${editing.constant ? "right-0.5" : "left-0.5"}`} /></button></div>
      {!editing.constant && <label className="block text-sm font-semibold">触发关键词<input value={editing.keywords} onChange={(e) => setEditing({ ...editing, keywords: e.target.value })} placeholder="多个关键词用逗号分隔" className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /><span className="mt-1 block text-[11px] font-normal text-[#999]">最近 12 条消息包含其中任一关键词时触发</span></label>}
      <label className="block text-sm font-semibold">注入内容<textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={10} maxLength={4000} placeholder="写下该地点、人物或事件的具体设定" className="mt-2 w-full resize-none rounded-xl bg-white p-3.5 font-normal leading-relaxed outline-none" /></label>
      <label className="block text-sm font-semibold">优先级<input type="number" min="0" max="1000" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label>
      <button onClick={async () => { if (await confirmDialog({ title: "删除条目？", danger: true })) { await call("deleteEntry", { id: editing.id }); setEditing(null); } }} className="w-full py-3 text-sm text-[#f05a61]">删除此条目</button>
    </div></div>}
  </div>;
}
