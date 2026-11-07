"use client";
import { session } from "@/lib/storage";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/components/AppProvider";
import { Avatar, Sheet, Spinner, toast, useGoBack } from "@/components/ui";
import { CheckIcon, ChevronLeft, CloseIcon, ImageIcon, SearchIcon, TrashIcon } from "@/components/icons";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { ALL_TAGS, PRESET_IMAGES } from "@/lib/constants";
import { fileToDataUrl } from "@/lib/image";
import type { FeedItem, WorkChar } from "@/lib/types";

type Line = { speaker: string; content: string };
type Chapter = { title: string; content: string; goal: string };
type Draft = {
  title: string;
  intro: string;
  cover: string;
  background: string;
  chars: WorkChar[];
  opening: Line[];
  chapters: Chapter[];
  tags: string[];
  isPublic: boolean;
};

const EMPTY: Draft = {
  title: "",
  intro: "",
  cover: "",
  background: "",
  chars: [],
  opening: [{ speaker: "旁白", content: "" }],
  chapters: [{ title: "", content: "", goal: "" }],
  tags: [],
  isPublic: true,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-2.5 flex items-end justify-between gap-3">
        <h3 className="shrink-0 text-[17px] font-bold text-black">{label}</h3>
        {hint && <span className="text-right text-[12px] text-[#a0a0a5]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function CreateStoryPage() {
  const router = useRouter();
  const back = useGoBack();
  const { refresh } = useApp();
  const [d, setD] = useState<Draft>(EMPTY);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [pickable, setPickable] = useState<FeedItem[] | null>(null);
  const [pq, setPq] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = session.get("mx_story_draft");
    if (raw) {
      try {
        setD({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
      } catch {
        /* ignore */
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) session.set("mx_story_draft", JSON.stringify(d));
  }, [d, ready]);

  useEffect(() => {
    if (!picker || pickable) return;
    apiGet<{ items: FeedItem[] }>("/api/works?scope=pickable")
      .then((r) => setPickable(r.items))
      .catch(() => setPickable([]));
  }, [picker, pickable]);

  const up = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const speakers = ["旁白", ...d.chars.map((c) => c.name)];

  function toggleChar(it: FeedItem) {
    const c = it.characters[0];
    if (!c) return;
    if (d.chars.some((x) => x.id === c.id)) up({ chars: d.chars.filter((x) => x.id !== c.id) });
    else if (d.chars.length >= 6) toast("最多选择6个角色");
    else up({ chars: [...d.chars, c], cover: d.cover || it.cover });
  }

  async function submit() {
    if (!d.title.trim()) return toast("请填写故事名称");
    if (!d.chars.length) return toast("请至少选择一个出场角色");
    if (!d.opening.some((l) => l.content.trim())) return toast("请填写开场白");
    const chapters = d.chapters.filter((c) => c.content.trim());
    if (!chapters.length) return toast("请填写章节的故事内容");
    for (let i = 0; i < chapters.length - 1; i++) {
      if (!chapters[i].goal.trim()) return toast(`第${i + 1}章需要填写成功条件`);
    }
    setSaving(true);
    try {
      const r = await apiSend<{ id: number }>("/api/works", {
        type: "story",
        title: d.title,
        intro: d.intro,
        cover: d.cover,
        background: d.background,
        characterIds: d.chars.map((c) => c.id),
        opening: d.opening.filter((l) => l.content.trim()),
        chapters,
        tags: d.tags,
        isPublic: d.isPublic,
      });
      session.remove("mx_story_draft");
      toast("发布成功，开启你的故事吧～");
      void refresh();
      router.replace(`/chat/story/${r.id}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "发布失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-[20px] bg-white px-4 py-3.5 text-[16px] leading-relaxed text-[#161616] outline-none placeholder:text-[#b4b4b8]";
  const shownPick = (pickable ?? []).filter((p) => !pq || p.title.includes(pq) || p.creatorName.includes(pq));

  return (
    <div className="relative flex h-full flex-col bg-[#f2f2f5]">
      <div className="absolute left-3 top-3 z-20">
        <button aria-label="返回" onClick={back} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-32 pt-16">
        <h1 className="text-[24px] font-bold text-black">创建故事</h1>
        <p className="mt-1 text-[13px] text-[#8a8a8f]">一个故事可以有多个角色和一个旁白，按章节推进剧情</p>

        <Field label="故事封面" hint="章节背景图">
          <div className="flex gap-3.5">
            <div
              className="h-[146px] w-[110px] shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-[#d8d8dd] bg-white bg-cover bg-center"
              style={d.cover ? { backgroundImage: `url("${d.cover}")`, borderColor: "transparent" } : undefined}
            >
              {!d.cover && <div className="flex h-full items-center justify-center text-[13px] text-[#a0a0a5]">暂无封面</div>}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2.5">
              <button onClick={() => fileRef.current?.click()} className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-medium">
                <ImageIcon className="h-5 w-5" />
                上传图片
              </button>
              <button onClick={() => setGallery(true)} className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-medium">
                <ImageIcon className="h-5 w-5" />
                从形象库选择
              </button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) up({ cover: await fileToDataUrl(f, 720).catch(() => d.cover) });
            }}
          />
        </Field>

        <Field label="故事名称">
          <input value={d.title} onChange={(e) => up({ title: e.target.value })} maxLength={20} placeholder="给你的故事起个名字" className={inputCls} />
        </Field>

        <Field label="故事简介（选填）">
          <textarea
            value={d.intro}
            onChange={(e) => up({ intro: e.target.value })}
            rows={3}
            maxLength={500}
            placeholder="简单介绍故事背景，将对外展示，请用“你”来称呼用户"
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="出场角色" hint="故事中有台词的角色都需要添加">
          <div className="flex flex-wrap gap-2.5">
            {d.chars.map((c) => (
              <span key={c.id} className="flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5">
                <Avatar src={c.avatar} focus={c.avatarFocus} size={28} name={c.name} />
                <span className="text-[14px]">{c.name}</span>
                <button aria-label="移除" onClick={() => up({ chars: d.chars.filter((x) => x.id !== c.id) })} className="text-[#a0a0a5]">
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <button onClick={() => setPicker(true)} className="rounded-full border border-dashed border-[#c7c7cc] px-4 py-2 text-[14px] text-[#55555a]">
              ＋ 添加角色
            </button>
          </div>
          <Link href="/create/character" className="mt-2 inline-block text-[12px] text-[#2b7cf6]">
            没有合适的角色？去新建一个 ›
          </Link>
        </Field>

        <Field label="开场白" hint="开场白选定的人物将首先说出设定好的台词">
          <div className="space-y-2.5">
            {d.opening.map((l, i) => (
              <div key={i} className="rounded-[20px] bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <select
                    value={speakers.includes(l.speaker) ? l.speaker : "旁白"}
                    onChange={(e) => up({ opening: d.opening.map((x, j) => (j === i ? { ...x, speaker: e.target.value } : x)) })}
                    className="rounded-full bg-[#f4f4f6] px-3 py-1.5 text-[13px] font-medium outline-none"
                  >
                    {speakers.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {d.opening.length > 1 && (
                    <button aria-label="删除" onClick={() => up({ opening: d.opening.filter((_, j) => j !== i) })} className="p-1 text-[#a0a0a5]">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={l.content}
                  onChange={(e) => up({ opening: d.opening.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)) })}
                  rows={2}
                  maxLength={500}
                  placeholder={l.speaker === "旁白" ? "旁白：描述客观视角的场景与情节交代" : "角色的台词，可使用（）描述动作"}
                  className="w-full resize-none text-[15px] leading-relaxed outline-none placeholder:text-[#b4b4b8]"
                />
              </div>
            ))}
            {d.opening.length < 10 && (
              <button onClick={() => up({ opening: [...d.opening, { speaker: d.chars[0]?.name ?? "旁白", content: "" }] })} className="text-[14px] font-medium text-[#2b7cf6]">
                ＋ 添加一句开场白
              </button>
            )}
          </div>
        </Field>

        <Field label="故事全局背景（选填）">
          <textarea
            value={d.background}
            onChange={(e) => up({ background: e.target.value })}
            rows={3}
            maxLength={1000}
            placeholder="对所有章节生效的设定，例如：用户与女主是异地恋，两人只能通过电话交流"
            className={`${inputCls} resize-none`}
          />
        </Field>

        <Field label="章节" hint="除最后一章外，需填写成功条件才能进入下一章">
          <div className="space-y-3">
            {d.chapters.map((c, i) => (
              <div key={i} className="rounded-[20px] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold">第{i + 1}章</span>
                  {d.chapters.length > 1 && (
                    <button aria-label="删除章节" onClick={() => up({ chapters: d.chapters.filter((_, j) => j !== i) })} className="p-1 text-[#a0a0a5]">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  value={c.title}
                  onChange={(e) => up({ chapters: d.chapters.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                  maxLength={30}
                  placeholder="章节名称"
                  className="mt-2 w-full rounded-xl bg-[#f6f6f8] px-3 py-2.5 text-[15px] outline-none placeholder:text-[#b4b4b8]"
                />
                <textarea
                  value={c.content}
                  onChange={(e) => up({ chapters: d.chapters.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)) })}
                  rows={4}
                  maxLength={2000}
                  placeholder="故事内容：承载故事情节，以及角色性格、行为轨迹和角色之间的关系，用“用户”称呼主角"
                  className="mt-2 w-full resize-none rounded-xl bg-[#f6f6f8] px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-[#b4b4b8]"
                />
                <input
                  value={c.goal}
                  onChange={(e) => up({ chapters: d.chapters.map((x, j) => (j === i ? { ...x, goal: e.target.value } : x)) })}
                  maxLength={300}
                  placeholder={i === d.chapters.length - 1 ? "成功条件（选填，不填则故事可以一直进行）" : "成功条件：用户满足后进入下一章"}
                  className="mt-2 w-full rounded-xl bg-[#f6f6f8] px-3 py-2.5 text-[15px] outline-none placeholder:text-[#b4b4b8]"
                />
              </div>
            ))}
            {d.chapters.length < 10 && (
              <button onClick={() => up({ chapters: [...d.chapters, { title: "", content: "", goal: "" }] })} className="text-[14px] font-medium text-[#2b7cf6]">
                ＋ 添加章节
              </button>
            )}
          </div>
        </Field>

        <Field label="故事标签" hint={`最多3个（${d.tags.length}/3）`}>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((t) => {
              const on = d.tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => {
                    if (on) up({ tags: d.tags.filter((x) => x !== t) });
                    else if (d.tags.length >= 3) toast("最多选择3个标签");
                    else up({ tags: [...d.tags, t] });
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
              { v: true, l: "公开发布" },
              { v: false, l: "仅自己可见" },
            ].map((o) => (
              <button
                key={o.l}
                onClick={() => up({ isPublic: o.v })}
                className={`h-12 rounded-2xl border-2 text-[15px] font-medium ${d.isPublic === o.v ? "border-[#FFE500] bg-[#fffbe0]" : "border-transparent bg-white"}`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#f2f2f5] via-[#f2f2f5] to-transparent px-[18px] pb-6 pt-6">
        <button disabled={saving} onClick={() => void submit()} className="h-[52px] w-full rounded-[18px] bg-[#FFEB00] text-[17px] font-bold text-black disabled:opacity-50">
          {saving ? "发布中…" : "发布"}
        </button>
      </div>

      <Sheet open={picker} onClose={() => setPicker(false)} title="选择出场角色" full>
        <div className="px-4 pb-2">
          <div className="flex h-9 items-center gap-2 rounded-full bg-[#f2f2f4] px-3">
            <SearchIcon className="h-4 w-4 text-[#a0a0a5]" />
            <input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="搜索角色" className="min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
          </div>
        </div>
        {pickable === null ? (
          <div className="grid h-40 place-items-center text-[#c7c7cc]">
            <Spinner />
          </div>
        ) : (
          <div className="pb-24">
            {shownPick.map((p) => {
              const c = p.characters[0];
              const on = !!c && d.chars.some((x) => x.id === c.id);
              return (
                <button key={p.key} onClick={() => toggleChar(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
                  <Avatar src={c?.avatar} focus={c?.avatarFocus} size={46} name={p.title} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[15px] font-medium">
                      {p.title}
                      {p.mine && <span className="rounded bg-[#fff8cc] px-1 text-[10px] text-[#a08000]">我的</span>}
                    </div>
                    <div className="truncate text-[12px] text-[#9a9aa0]">{p.intro || `@${p.creatorName}`}</div>
                  </div>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${on ? "bg-[#FFE500]" : "border-2 border-[#d8d8dd]"}`}>
                    {on && <CheckIcon className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-white px-4 pb-5 pt-2">
          <button onClick={() => setPicker(false)} className="h-11 w-full rounded-full bg-[#FFE500] text-[15px] font-semibold">
            确定（已选 {d.chars.length}）
          </button>
        </div>
      </Sheet>

      <Sheet open={gallery} onClose={() => setGallery(false)} title="形象库">
        <div className="grid grid-cols-3 gap-2.5 px-4 pb-7">
          {PRESET_IMAGES.map((p) => (
            <button
              key={p.src}
              onClick={() => {
                up({ cover: p.src });
                setGallery(false);
              }}
              className={`aspect-[3/4] rounded-xl bg-cover bg-center ${d.cover === p.src ? "ring-[3px] ring-[#FFE500]" : ""}`}
              style={{ backgroundImage: `url("${p.src}")` }}
            />
          ))}
        </div>
      </Sheet>
    </div>
  );
}
