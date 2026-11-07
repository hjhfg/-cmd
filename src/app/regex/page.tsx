"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, confirmDialog, toast } from "@/components/ui";
import { PlusCircleIcon, TrashIcon, WandIcon } from "@/components/icons";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { REGEX_PRESETS, compileRule, normalizeFlags, ruleError, type RegexScope } from "@/lib/regex";
import type { RegexRule } from "@/lib/types";
import { Literal, Mono, R } from "@/components/RegexCard";

const SCOPES: { id: RegexScope; label: string; hint: string }[] = [
  { id: "reply", label: "角色输出", hint: "只改写 AI 发来的文字" },
  { id: "input", label: "我的输入", hint: "只改写你发出去的文字" },
  { id: "both", label: "双向", hint: "输入与输出都改写" },
];

const DEMO = {
  reply: "（轻轻揉了揉你的头发，声音低下来）笨蛋，我一直都在。\n（内心OS：其实我等这句话很久了。）作为一个AI，我不能……",
  input: "（我走过去，在他身边坐下）你今天怎么一直不说话呀？",
};

export default function RegexPage() {
  const [items, setItems] = useState<RegexRule[] | null>(null);
  const [editing, setEditing] = useState<RegexRule | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiGet<{ items: RegexRule[] }>("/api/regex");
      setItems(r.items);
    } catch {
      setItems([]);
      toast("加载正则规则失败");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = useMemo(() => (items ?? []).filter((r) => r.enabled && !ruleError(r)), [items]);
  const broken = useMemo(() => (items ?? []).filter((r) => ruleError(r)), [items]);

  async function toggle(rule: RegexRule) {
    setItems((list) => list?.map((x) => (x.id === rule.id ? { ...x, enabled: !x.enabled } : x)) ?? list);
    try {
      await apiSend("/api/regex", { action: "toggle", id: rule.id, enabled: !rule.enabled });
    } catch {
      setItems((list) => list?.map((x) => (x.id === rule.id ? { ...x, enabled: rule.enabled } : x)) ?? list);
      toast("保存失败，请重试");
    }
  }

  async function remove(rule: RegexRule) {
    const ok = await confirmDialog({ title: "删除这条规则", content: `「${rule.name}」删除后无法恢复，输出将恢复原样。`, okText: "删除", danger: true });
    if (!ok) return;
    const backup = items;
    setItems((list) => list?.filter((x) => x.id !== rule.id) ?? list);
    try {
      await apiSend("/api/regex", { action: "delete", id: rule.id });
      toast("规则已删除");
    } catch {
      setItems(backup);
      toast("删除失败，请重试");
    }
  }

  async function addPreset(p: (typeof REGEX_PRESETS)[number]) {
    setBusy(true);
    try {
      const r = await apiSend<{ item: RegexRule }>("/api/regex", { action: "create", ...p });
      setItems((list) => [...(list ?? []), r.item]);
      setPresetOpen(false);
      toast(`已添加「${p.name}」`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "添加失败");
    } finally {
      setBusy(false);
    }
  }

  async function save(rule: RegexRule) {
    const err = ruleError(rule);
    if (err) {
      toast(err);
      return;
    }
    setBusy(true);
    try {
      if (rule.id > 0) {
        const r = await apiSend<{ item: RegexRule }>("/api/regex", { action: "update", ...rule });
        setItems((list) => list?.map((x) => (x.id === rule.id ? r.item : x)) ?? list);
      } else {
        const r = await apiSend<{ item: RegexRule }>("/api/regex", { action: "create", ...rule });
        setItems((list) => [...(list ?? []), r.item]);
      }
      setEditing(null);
      toast("规则已保存");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col" style={{ background: R.paper, color: R.ink }}>
      {/* 顶部：像一页档案的页眉 */}
      <div className="relative shrink-0 overflow-hidden" style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FBF8F0 100%)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(to right, ${R.yellow}, ${R.copper}, ${R.yellow})` }} />
        <PageHeader
          title={<span className="font-serif text-[17px] tracking-[0.04em]">正则</span>}
          right={
            <button
              type="button"
              aria-label="新建规则"
              onClick={() => setEditing({ id: 0, name: "新规则", pattern: "", replacement: "", flags: "g", scope: "reply", enabled: true, createdAt: new Date().toISOString() })}
              className="grid h-8 w-8 place-items-center rounded-full"
              style={{ background: R.ink, color: R.yellow }}
            >
              <PlusCircleIcon className="h-[17px] w-[17px]" />
            </button>
          }
        />
        <div className="flex items-baseline justify-between px-4 pb-3">
          <p className="text-[11.5px] leading-relaxed" style={{ color: R.sub }}>
            用 <b style={{ color: R.ink }}>查找 → 替换</b> 改写对话里的文字。
          </p>
          <Mono>
            {active.length}/{items?.length ?? 0} 生效
          </Mono>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-12">
        {items === null && (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[92px] rounded-2xl shimmer" style={{ opacity: 0.5 - i * 0.12 }} />
            ))}
          </div>
        )}

        {items !== null && items.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed px-5 py-8 text-center" style={{ borderColor: R.line, background: "#fff" }}>
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full" style={{ background: R.wash, color: R.copper }}>
              <WandIcon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[13.5px] font-semibold">还没有任何正则规则</p>
            <p className="mt-1.5 text-[11.5px] leading-relaxed" style={{ color: R.sub }}>
              可以从预设开始：去掉括号动作、清理空行，或者先看看效果。
            </p>
            <button type="button" onClick={() => setPresetOpen(true)} className="mt-4 h-10 w-full rounded-xl text-[13px] font-bold" style={{ background: R.yellow, color: "#14140F" }}>
              从预设添加
            </button>
          </div>
        )}

        {items !== null && items.length > 0 && (
          <>
            <div className="mt-1 space-y-2.5">
              {items.map((rule) => {
                const err = ruleError(rule);
                return (
                  <div key={rule.id} className="relative overflow-hidden rounded-2xl bg-white" style={{ boxShadow: `0 1px 0 ${R.line}, 0 8px 24px -22px rgba(0,0,0,.4)`, opacity: rule.enabled ? 1 : 0.62 }}>
                    <div className="flex items-start gap-2 px-3.5 pt-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13.5px] font-bold">{rule.name}</span>
                          <span className="shrink-0 rounded-full px-1.5 py-[1px] font-mono text-[8.5px] font-bold" style={{ background: SCOPES.find((s) => s.id === rule.scope)?.id === "both" ? "#E9F6EF" : R.wash, color: rule.scope === "both" ? R.ok : R.copper }}>
                            {SCOPES.find((s) => s.id === rule.scope)?.label ?? "角色输出"}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1 overflow-hidden">
                          <Literal pattern={rule.pattern} flags={rule.flags} broken={Boolean(err)} />
                        </div>
                        <div className="mt-1 truncate font-mono text-[10.5px]" style={{ color: R.sub }}>
                          → {rule.replacement ? rule.replacement.replace(/\n/g, "⏎").slice(0, 40) : "（删除匹配内容）"}
                        </div>
                        {err && (
                          <p className="mt-1 text-[10.5px]" style={{ color: R.alert }}>
                            {err}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.enabled}
                        aria-label={`启用 ${rule.name}`}
                        onClick={() => void toggle(rule)}
                        className="relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors"
                        style={{ background: rule.enabled ? R.ink : "#DEDBD2" }}
                      >
                        <span className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-all" style={{ left: rule.enabled ? 18 : 2 }} />
                      </button>
                    </div>
                    <div className="mt-2.5 flex items-center gap-1 border-t px-3.5 py-2" style={{ borderColor: R.line }}>
                      <button type="button" onClick={() => setEditing(rule)} className="rounded-md px-2 py-1 text-[11.5px] font-medium" style={{ color: R.ink, background: R.wash }}>
                        编辑
                      </button>
                      <button type="button" onClick={() => void copyRule(rule, setItems)} className="rounded-md px-2 py-1 text-[11.5px]" style={{ color: R.sub }}>
                        复制
                      </button>
                      <button type="button" aria-label="删除" onClick={() => void remove(rule)} className="ml-auto grid h-7 w-7 place-items-center rounded-md" style={{ color: R.dim }}>
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setPresetOpen(true)} className="h-10 flex-1 rounded-xl text-[12.5px] font-semibold" style={{ background: "#fff", color: R.ink, boxShadow: `inset 0 0 0 1px ${R.line}` }}>
                从预设添加
              </button>
              <button
                type="button"
                onClick={() => setEditing({ id: 0, name: "新规则", pattern: "", replacement: "", flags: "g", scope: "reply", enabled: true, createdAt: new Date().toISOString() })}
                className="h-10 flex-1 rounded-xl text-[12.5px] font-bold"
                style={{ background: R.yellow, color: "#14140F" }}
              >
                新建规则
              </button>
            </div>
          </>
        )}

        {/* 说明 */}
        <div className="mt-6 rounded-2xl p-4" style={{ background: R.wash }}>
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-[13px] font-bold">规则怎么生效</span>
            <span className="h-[3px] w-[3px] rotate-45" style={{ background: R.copper }} />
            <Mono>HOW IT WORKS</Mono>
          </div>
          <ul className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed" style={{ color: R.sub }}>
            <li>· 规则按列表顺序执行，上一条的结果会进入下一条。</li>
            <li>· 只处理对话文本，不会改动系统提示词或世界书。</li>
            <li>· 标记为「失效」的规则会自动跳过，不影响其他规则。</li>
            <li>· 改动从下一条消息开始生效，历史消息保持原样。</li>
          </ul>
          {broken.length > 0 && (
            <p className="mt-2 rounded-lg px-2 py-1.5 text-[11px]" style={{ background: "#FDECEC", color: R.alert }}>
              有 {broken.length} 条规则表达式无效，已自动跳过。
            </p>
          )}
        </div>
      </div>

      {editing && <Editor rule={editing} busy={busy} onClose={() => setEditing(null)} onSave={(r) => void save(r)} />}
      {presetOpen && <PresetSheet busy={busy} onClose={() => setPresetOpen(false)} onPick={(p) => void addPreset(p)} />}
    </div>
  );
}

async function copyRule(rule: RegexRule, setItems: (fn: (list: RegexRule[] | null) => RegexRule[] | null) => void) {
  try {
    const r = await apiSend<{ item: RegexRule }>("/api/regex", { action: "duplicate", id: rule.id });
    setItems((list) => [...(list ?? []), r.item]);
    toast("已复制规则");
  } catch {
    toast("复制失败");
  }
}

/* ───────────────────────── 编辑器 ───────────────────────── */

function Editor({ rule, busy, onClose, onSave }: { rule: RegexRule; busy: boolean; onClose: () => void; onSave: (r: RegexRule) => void }) {
  const [draft, setDraft] = useState<RegexRule>(rule);
  const err = ruleError(draft);
  const re = compileRule(draft);

  const preview = useMemo(() => {
    if (!re || !draft.pattern) return "";
    try {
      const src = DEMO[draft.scope === "input" ? "input" : "reply"];
      return src.replace(re, draft.replacement);
    } catch {
      return "";
    }
  }, [draft.replacement, draft.scope, re, draft.pattern]);

  const patch = (p: Partial<RegexRule>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <div className="absolute inset-0 z-50 flex flex-col" style={{ background: R.paper }}>
      <div className="flex h-12 shrink-0 items-center justify-between px-3" style={{ borderBottom: `1px solid ${R.line}` }}>
        <button type="button" onClick={onClose} className="px-2 py-2 text-[13.5px]" style={{ color: R.sub }}>
          取消
        </button>
        <span className="font-serif text-[15px] font-bold">{rule.id > 0 ? "编辑规则" : "新建规则"}</span>
        <button type="button" onClick={() => onSave(draft)} disabled={busy || Boolean(err)} className="px-2 py-2 text-[13.5px] font-bold disabled:opacity-40" style={{ color: R.copper }}>
          保存
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold tracking-[0.06em]" style={{ color: R.sub }}>
            规则名称
          </span>
          <input
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            maxLength={40}
            className="mt-1.5 h-11 w-full rounded-xl bg-white px-3 text-[14px] outline-none"
            style={{ boxShadow: `inset 0 0 0 1px ${R.line}` }}
          />
        </label>

        <label className="mt-4 block">
          <span className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold tracking-[0.06em]" style={{ color: R.sub }}>
              查找（正则表达式）
            </span>
            <span className="font-mono text-[9.5px]" style={{ color: R.dim }}>
              支持 （） 等全角字符
            </span>
          </span>
          <textarea
            value={draft.pattern}
            onChange={(e) => patch({ pattern: e.target.value })}
            rows={3}
            spellCheck={false}
            placeholder="例如：（[^）]*）"
            className="mt-1.5 w-full resize-none rounded-xl bg-white px-3 py-2.5 font-mono text-[12.5px] leading-[1.7] outline-none"
            style={{ boxShadow: `inset 0 0 0 1px ${err && draft.pattern ? R.alert : R.line}` }}
          />
        </label>

        <div className="mt-4">
          <span className="text-[11px] font-semibold tracking-[0.06em]" style={{ color: R.sub }}>
            修饰符
          </span>
          <div className="mt-1.5 flex gap-1.5">
            {["g", "i", "m", "s", "u"].map((f) => {
              const on = normalizeFlags(draft.flags).includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    const set = new Set(normalizeFlags(draft.flags).split(""));
                    if (on) set.delete(f);
                    else set.add(f);
                    patch({ flags: Array.from(set).join("") || "g" });
                  }}
                  className="h-9 w-9 rounded-lg font-mono text-[13px] font-bold transition"
                  style={on ? { background: R.ink, color: R.yellow } : { background: "#fff", color: R.sub, boxShadow: `inset 0 0 0 1px ${R.line}` }}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed" style={{ color: R.dim }}>
            g 全局替换 · i 忽略大小写 · m 多行 · s 点匹配换行 · u Unicode
          </p>
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold tracking-[0.06em]" style={{ color: R.sub }}>
            替换为
          </span>
          <textarea
            value={draft.replacement}
            onChange={(e) => patch({ replacement: e.target.value })}
            rows={3}
            spellCheck={false}
            placeholder="可留空表示删除；用 $1 $2 引用分组，\n 表示换行"
            className="mt-1.5 w-full resize-none rounded-xl bg-white px-3 py-2.5 font-mono text-[12.5px] leading-[1.7] outline-none"
            style={{ boxShadow: `inset 0 0 0 1px ${R.line}` }}
          />
        </label>

        <div className="mt-4">
          <span className="text-[11px] font-semibold tracking-[0.06em]" style={{ color: R.sub }}>
            作用范围
          </span>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {SCOPES.map((s) => {
              const on = draft.scope === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => patch({ scope: s.id })}
                  className="rounded-xl px-2 py-2.5 text-left transition"
                  style={on ? { background: R.ink, color: "#fff" } : { background: "#fff", boxShadow: `inset 0 0 0 1px ${R.line}` }}
                >
                  <span className="block text-[12px] font-bold" style={{ color: on ? "#fff" : R.ink }}>
                    {s.label}
                  </span>
                  <span className="mt-0.5 block text-[9.5px] leading-tight" style={{ color: on ? "rgba(255,255,255,.6)" : R.dim }}>
                    {s.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 实时预览 */}
        <div className="mt-5 overflow-hidden rounded-2xl bg-white" style={{ boxShadow: `inset 0 0 0 1px ${R.line}` }}>
          <div className="flex items-center justify-between px-3.5 py-2" style={{ borderBottom: `1px solid ${R.line}` }}>
            <span className="font-serif text-[12.5px] font-bold">实时预览</span>
            <span className="rounded-full px-1.5 py-[1px] font-mono text-[8.5px]" style={{ background: err ? "#FDECEC" : "#EAF7F0", color: err ? R.alert : R.ok }}>
              {err ? "表达式无效" : "可以匹配"}
            </span>
          </div>
          <div className="px-3.5 py-3">
            <div className="flex items-baseline gap-1.5">
              <Mono>原文</Mono>
            </div>
            <p className="mt-1 whitespace-pre-wrap font-mono text-[11px] leading-[1.8]" style={{ color: R.dim }}>
              {DEMO[draft.scope === "input" ? "input" : "reply"]}
            </p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <Mono>替换后</Mono>
            </div>
            <p className="mt-1 whitespace-pre-wrap rounded-lg px-2 py-1.5 font-mono text-[11px] leading-[1.8]" style={{ color: R.ink, background: R.wash }}>
              {err ? "—" : preview || "（预览为空）"}
            </p>
          </div>
        </div>
        {err && draft.pattern && (
          <p className="mt-2 text-[11px]" style={{ color: R.alert }}>
            {err}
          </p>
        )}
        <button type="button" onClick={() => onSave(draft)} disabled={busy || Boolean(err)} className="mt-5 h-12 w-full rounded-xl text-[14px] font-bold disabled:opacity-40" style={{ background: R.yellow, color: "#14140F" }}>
          {busy ? "正在保存…" : "保存规则"}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── 预设 ───────────────────────── */

function PresetSheet({ busy, onClose, onPick }: { busy: boolean; onClose: () => void; onPick: (p: (typeof REGEX_PRESETS)[number]) => void }) {
  return (
    <div className="absolute inset-0 z-50" onClick={onClose}>
      <div className="anim-fade absolute inset-0 bg-black/35" />
      <div onClick={(e) => e.stopPropagation()} className="anim-up absolute inset-x-0 bottom-0 max-h-[82%] overflow-y-auto rounded-t-[22px] bg-white pb-6">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 pb-2 pt-3" style={{ borderBottom: `1px solid ${R.line}` }}>
          <div>
            <h3 className="font-serif text-[16px] font-bold">预设规则</h3>
            <p className="mt-0.5 text-[10.5px]" style={{ color: R.sub }}>
              一键加入，之后可以再改
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-[12px]" style={{ color: R.sub }}>
            关闭
          </button>
        </div>
        <div className="space-y-2 px-4 pt-3">
          {REGEX_PRESETS.map((p) => (
            <button key={p.name} type="button" disabled={busy} onClick={() => onPick(p)} className="w-full rounded-xl px-3 py-2.5 text-left transition active:scale-[0.99] disabled:opacity-50" style={{ background: "#fff", boxShadow: `inset 0 0 0 1px ${R.line}` }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold">{p.name}</span>
                <span className="shrink-0 rounded-full px-1.5 py-[1px] font-mono text-[8.5px]" style={{ background: R.wash, color: R.copper }}>
                  {SCOPES.find((s) => s.id === p.scope)?.label}
                </span>
              </div>
              <div className="mt-1">{<Literal pattern={p.pattern} flags={p.flags} />}</div>
              <p className="mt-1 text-[10.5px] leading-relaxed" style={{ color: R.sub }}>
                {p.hint}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-4 px-5 text-center text-[10px] leading-relaxed" style={{ color: R.dim }}>
          需要更复杂的规则？点右上角 + 自己写一条。
        </p>
      </div>
    </div>
  );
}

