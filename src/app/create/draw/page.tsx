"use client";
import { session } from "@/lib/storage";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageHeader, toast } from "@/components/ui";
import { DownloadIcon, EditIcon } from "@/components/icons";
import { DRAW_STYLES, PRESET_IMAGES, type PresetImage } from "@/lib/constants";

const EXAMPLE = "古风男性，深色长发，发丝凌乱，柔和浅琥珀眼眸，冷白皮细腻通透，锋利柔和剑眉，精致立体五官，身着青色长衫";

function pickImages(desc: string, style: string): PresetImage[] {
  const words = `${desc} ${style}`;
  const scored = PRESET_IMAGES.map((p) => ({
    p,
    s: p.keywords.reduce((acc, k) => acc + (words.includes(k) ? 3 : 0), 0) + Math.random() * 2,
  }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, 4).map((x) => x.p);
}

export default function DrawPage() {
  const router = useRouter();
  const [desc, setDesc] = useState(EXAMPLE);
  const [style, setStyle] = useState("国风");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PresetImage[]>([]);
  const [sel, setSel] = useState(0);
  const [from, setFrom] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setFrom(new URLSearchParams(window.location.search).get("from") ?? "");
  }, []);

  function generate() {
    if (!desc.trim()) return toast("请描述你想要的角色形象");
    setLoading(true);
    setResults([]);
    window.setTimeout(() => {
      setResults(pickImages(desc, style));
      setSel(0);
      setLoading(false);
    }, 1800);
  }

  function applyImage() {
    const img = results[sel];
    if (!img) return;
    let draft: Record<string, unknown> = {};
    try {
      draft = JSON.parse(session.get("mx_draft") || "{}") as Record<string, unknown>;
    } catch {
      draft = {};
    }
    session.set("mx_draft", JSON.stringify({ ...draft, cover: img.src, avatarFocus: img.focus }));
    if (from === "character") router.back();
    else router.push("/create/character");
  }

  const main = results[sel];

  return (
    <div className="flex h-full flex-col bg-[#101012] text-white">
      <PageHeader title="一键绘图" dark />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {loading || main ? (
          <div className="relative mx-auto mt-2 w-full max-w-[340px]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] border-[3px] border-white/90 bg-white/5">
              {loading ? (
                <div className="shimmer flex h-full w-full flex-col items-center justify-center">
                  <span className="text-[15px] font-medium text-white/80">AI 正在绘制中…</span>
                  <span className="mt-1 text-[12px] text-white/50">话中有画，塑造个性角色</span>
                </div>
              ) : (
                main && <div className="anim-fade h-full w-full bg-cover bg-center" style={{ backgroundImage: `url("${main.src}")` }} />
              )}
            </div>
            {!loading && results.length > 0 && (
              <div className="-mt-20 grid grid-cols-4 gap-2 px-1">
                {results.map((r, i) => (
                  <button
                    key={r.src}
                    onClick={() => setSel(i)}
                    className={`aspect-[3/4] overflow-hidden rounded-xl border-2 bg-cover bg-center shadow-lg ${i === sel ? "border-[#FFE500]" : "border-white/70"}`}
                    style={{ backgroundImage: `url("${r.src}")` }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {!loading && main && (
          <div className="mx-auto mt-4 max-w-[340px]">
            <div className="flex items-start gap-3">
              <p className="line-clamp-2 flex-1 text-[14px] leading-relaxed text-white/85">{desc}</p>
              <button aria-label="编辑描述" onClick={() => taRef.current?.focus()} className="p-1 text-white/90">
                <EditIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex gap-3">
              <a href={main.src} download className="grid h-[52px] w-[60px] shrink-0 place-items-center rounded-2xl bg-white/15 text-white">
                <DownloadIcon className="h-6 w-6" />
              </a>
              <button onClick={applyImage} className="h-[52px] flex-1 rounded-2xl bg-[#FFE500] text-[16px] font-bold text-black">
                {from === "character" ? "使用此形象" : "创建角色"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-[16px] font-semibold">形象描述</h3>
          <textarea
            ref={taRef}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            maxLength={300}
            placeholder="描述角色的外貌、发型、服饰、气质……"
            className="mt-2.5 w-full resize-none rounded-2xl bg-white/10 p-3.5 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/40"
          />
          <h3 className="mt-5 text-[16px] font-semibold">画面风格</h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DRAW_STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-full px-4 py-1.5 text-[14px] ${s === style ? "bg-[#FFE500] font-semibold text-black" : "bg-white/10 text-white/80"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <button disabled={loading} onClick={generate} className="mt-6 h-[52px] w-full rounded-2xl bg-[#FFE500] text-[16px] font-bold text-black disabled:opacity-50">
            {loading ? "绘制中…" : results.length ? "重新生成" : "立即生成"}
          </button>
          <p className="mt-3 text-center text-[12px] text-white/40">内容由 AI 生成，仅供角色创作使用</p>
        </div>
      </div>
    </div>
  );
}
