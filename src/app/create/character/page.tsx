"use client";
import { session } from "@/lib/storage";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { Sheet, Spinner, toast, useGoBack } from "@/components/ui";
import { BrushIcon, CheckIcon, ChevronLeft, ChevronRight, ImageIcon, PlayIcon } from "@/components/icons";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { ALL_TAGS, PRESET_IMAGES, VOICES } from "@/lib/constants";
import { fileToDataUrl } from "@/lib/image";
import { speakLines } from "@/lib/speech";
import type { CharacterDraft, WorkDetail } from "@/lib/types";

type Form = Required<Pick<CharacterDraft, "name" | "setting" | "greeting" | "intro" | "gender" | "tags" | "voice">> & {
  cover: string;
  avatarFocus: string;
  isPublic: boolean;
};

const EMPTY: Form = { name: "", setting: "", greeting: "", intro: "", gender: "女", tags: [], voice: "", cover: "", avatarFocus: "", isPublic: true };

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="mt-6">
      <div className="mb-2.5 flex items-end justify-between">
        <h3 className="text-[17px] font-bold text-black">{label}</h3>
        {hint && <span className="text-[12px] text-[#a0a0a5]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function CreateCharacterPage() {
  const router = useRouter();
  const back = useGoBack();
  const { refresh } = useApp();
  const [form, setForm] = useState<Form>(EMPTY);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const edit = Number(new URLSearchParams(window.location.search).get("edit"));
    if (edit > 0) {
      setEditId(edit);
      setLoading(true);
      apiGet<{ item: WorkDetail }>(`/api/works/character/${edit}`)
        .then(({ item }) =>
          setForm({
            name: item.title,
            setting: item.setting,
            greeting: item.greeting,
            intro: item.intro,
            gender: item.gender || "女",
            tags: item.tags,
            voice: item.voice,
            cover: item.cover,
            avatarFocus: item.characters[0]?.avatarFocus ?? "",
            isPublic: item.isPublic,
          }),
        )
        .catch(() => toast("加载角色失败"))
        .finally(() => setLoading(false));
      return;
    }
    const raw = session.get("mx_draft");
    if (raw) {
      try {
        const d = JSON.parse(raw) as Partial<Form>;
        setForm((f) => ({ ...f, ...d, tags: Array.isArray(d.tags) ? d.tags : f.tags }));
      } catch {
        /* ignore */
      }
    }
  }, []);

  async function onFile(file?: File) {
    if (!file) return;
    try {
      const url = await fileToDataUrl(file, 720);
      setForm((f) => ({ ...f, cover: url, avatarFocus: "cover" }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "图片读取失败");
    }
  }

  function toDraw() {
    session.set("mx_draft", JSON.stringify(form));
    router.push("/create/draw?from=character");
  }

  async function submit() {
    if (!form.name.trim()) return toast("请填写角色名称");
    if (!form.setting.trim()) return toast("请填写角色设定");
    if (!form.greeting.trim()) return toast("请填写开场白");
    setSaving(true);
    const payload = { ...form, voice: form.voice || (form.gender === "男" ? "温柔少年" : form.gender === "其他" ? "萌宠童声" : "温柔少女") };
    try {
      if (editId) {
        await apiSend(`/api/works/character/${editId}`, payload, "PATCH");
        toast("保存成功");
        router.replace(`/work/character/${editId}`);
      } else {
        const r = await apiSend<{ id: number }>("/api/works", { type: "character", ...payload });
        session.remove("mx_draft");
        toast("发布成功，快和Ta聊聊吧～");
        void refresh();
        router.replace(`/chat/character/${r.id}`);
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "发布失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-[20px] bg-white px-4 py-3.5 text-[16px] leading-relaxed text-[#161616] outline-none placeholder:text-[#b4b4b8]";

  return (
    <div className="relative flex h-full flex-col bg-[#f2f2f5]">
      <div className="absolute left-3 top-3 z-20">
        <button aria-label="返回" onClick={back} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-32 pt-16">
        {loading ? (
          <div className="grid h-40 place-items-center text-[#c7c7cc]">
            <Spinner />
          </div>
        ) : (
          <>
            <h1 className="text-[24px] font-bold text-black">{editId ? "编辑角色" : "创建角色"}</h1>

            <Field label="角色形象" hint="将作为聊天背景与头像">
              <div className="flex gap-3.5">
                <button
                  onClick={() => setGalleryOpen(true)}
                  className="relative h-[146px] w-[110px] shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-[#d8d8dd] bg-white bg-cover bg-center"
                  style={form.cover ? { backgroundImage: `url("${form.cover}")`, borderStyle: "solid", borderColor: "transparent" } : undefined}
                >
                  {!form.cover && (
                    <span className="flex h-full flex-col items-center justify-center gap-1 text-[13px] text-[#a0a0a5]">
                      <span className="text-[28px] leading-none">＋</span>添加形象
                    </span>
                  )}
                  {form.cover && <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-[12px] text-white">更换</span>}
                </button>
                <div className="flex flex-1 flex-col justify-center gap-2.5">
                  <button onClick={() => fileRef.current?.click()} className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-medium text-[#161616]">
                    <ImageIcon className="h-5 w-5" />
                    上传图片
                  </button>
                  <button onClick={() => setGalleryOpen(true)} className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-medium text-[#161616]">
                    <PlayIcon className="h-4 w-4" />
                    形象库
                  </button>
                  <button onClick={toDraw} className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#fff3a0] to-[#FFE500] px-4 text-[14px] font-semibold text-black">
                    <BrushIcon className="h-5 w-5" />
                    AI 一键绘图
                  </button>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            </Field>

            <Field label="角色名">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={12} placeholder="请填写角色名称" className={inputCls} />
            </Field>

            <Field label="角色设定" hint={`${form.setting.length}/2000`}>
              <textarea
                value={form.setting}
                onChange={(e) => set("setting", e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder={"角色的性格、身份、说话风格、跟用户的关系等\n请用\"用户\"来称呼与角色对话的人"}
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label="开场白">
              <textarea
                value={form.greeting}
                onChange={(e) => set("greeting", e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="作为角色说的第一句话。可使用（）描述动作或场景"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label="角色简介（选填）">
              <textarea
                value={form.intro}
                onChange={(e) => set("intro", e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="描述角色与用户的相遇场景及背景。将对外展示，请用“你”来称呼用户"
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label="角色音色">
              <button onClick={() => setVoiceOpen(true)} className="flex w-full items-center justify-between rounded-[20px] bg-white px-4 py-4 text-left text-[16px]">
                <span className={form.voice ? "text-[#161616]" : "text-[#b4b4b8]"}>{form.voice || "请选择角色音色"}</span>
                <ChevronRight className="h-5 w-5 text-[#a0a0a5]" />
              </button>
            </Field>

            <Field label="角色性别">
              <div className="grid grid-cols-3 gap-2.5">
                {["男", "女", "其他"].map((g) => (
                  <button
                    key={g}
                    onClick={() => set("gender", g)}
                    className={`h-11 rounded-2xl text-[15px] ${form.gender === g ? "bg-[#FFE500] font-semibold text-black" : "bg-white text-[#3a3a3c]"}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="角色标签" hint={`最多3个（${form.tags.length}/3）`}>
              <div className="flex flex-wrap gap-2">
                {ALL_TAGS.map((t) => {
                  const on = form.tags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        if (on) set("tags", form.tags.filter((x) => x !== t));
                        else if (form.tags.length >= 3) toast("最多选择3个标签");
                        else set("tags", [...form.tags, t]);
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] ${on ? "bg-[#161616] text-white" : "bg-white text-[#55555a]"}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="可见范围">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { v: true, l: "公开发布", d: "所有人可见、可聊天" },
                  { v: false, l: "仅自己可见", d: "只有你能和Ta聊天" },
                ].map((o) => (
                  <button
                    key={o.l}
                    onClick={() => set("isPublic", o.v)}
                    className={`rounded-2xl border-2 p-3 text-left ${form.isPublic === o.v ? "border-[#FFE500] bg-[#fffbe0]" : "border-transparent bg-white"}`}
                  >
                    <div className="text-[15px] font-semibold">{o.l}</div>
                    <div className="mt-0.5 text-[12px] text-[#8a8a8f]">{o.d}</div>
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f2f2f5] via-[#f2f2f5] to-transparent px-[18px] pb-6 pt-6">
        <button disabled={saving || loading} onClick={() => void submit()} className="h-[52px] w-full rounded-[18px] bg-[#FFEB00] text-[17px] font-bold text-black disabled:opacity-50">
          {saving ? "发布中…" : editId ? "保存" : "发布"}
        </button>
      </div>

      <Sheet open={voiceOpen} onClose={() => setVoiceOpen(false)} title="选择角色音色">
        <div className="px-4 pb-7">
          {VOICES.map((v) => (
            <div key={v.id} className="flex items-center gap-3 border-b border-[#f2f2f4] py-3.5">
              <button
                aria-label="试听"
                onClick={() => speakLines([{ text: `你好呀，我是${form.name || "你的专属角色"}，很高兴认识你。`, voice: v.id }])}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f4f6] text-[#3a3a3c]"
              >
                <PlayIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  set("voice", v.id);
                  setVoiceOpen(false);
                }}
                className="flex min-w-0 flex-1 items-center justify-between text-left"
              >
                <span>
                  <span className="block text-[15px] font-medium text-[#161616]">{v.id}</span>
                  <span className="block text-[12px] text-[#9a9aa0]">{v.desc}</span>
                </span>
                {form.voice === v.id && <CheckIcon className="h-5 w-5 text-[#161616]" />}
              </button>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={galleryOpen} onClose={() => setGalleryOpen(false)} title="形象库">
        <div className="grid grid-cols-3 gap-2.5 px-4 pb-7">
          {PRESET_IMAGES.map((p) => (
            <button
              key={p.src}
              onClick={() => {
                setForm((f) => ({ ...f, cover: p.src, avatarFocus: p.focus }));
                setGalleryOpen(false);
              }}
              className={`relative aspect-[3/4] overflow-hidden rounded-xl bg-cover bg-center ${form.cover === p.src ? "ring-[3px] ring-[#FFE500]" : ""}`}
              style={{ backgroundImage: `url("${p.src}")` }}
            >
              {form.cover === p.src && (
                <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#FFE500]">
                  <CheckIcon className="h-3 w-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
