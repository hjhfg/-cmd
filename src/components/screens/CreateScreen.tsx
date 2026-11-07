"use client";
import { session } from "@/lib/storage";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookIcon, BrushIcon, CatLogo, ChevronRight, RoleIcon, SparkleIcon } from "@/components/icons";
import { CHARACTER_TEMPLATES } from "@/lib/constants";

export default function CreateScreen({ visible }: { visible: boolean }) {
  const router = useRouter();

  function applyTemplate(i: number) {
    const t = CHARACTER_TEMPLATES[i];
    session.set(
      "mx_draft",
      JSON.stringify({ name: t.name, gender: t.gender, setting: t.setting, greeting: t.greeting, intro: t.intro, tags: t.tags, voice: t.voice, cover: t.cover, avatarFocus: t.avatarFocus }),
    );
    router.push("/create/character");
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f5f5f7]">
      <header className="flex h-12 shrink-0 items-center justify-center text-[17px] font-semibold text-[#161616]">创作</header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        <Link href="/create/assistant" className="relative block overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFE500] to-[#fff59a] p-4">
          <div className="flex items-center gap-1.5 text-[18px] font-bold text-black">
            <SparkleIcon className="h-5 w-5" />
            AI 创作助手
          </div>
          <div className="mt-1 text-[13px] text-black/60">一问一答，帮你轻松捏出专属角色</div>
          <span className="mt-3 inline-flex items-center rounded-full bg-black px-3.5 py-1.5 text-[12px] font-medium text-[#FFE500]">开始创作 →</span>
          <CatLogo className="absolute -bottom-2 right-3 h-24 w-28" />
        </Link>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link href="/create/character" className="flex h-36 flex-col justify-between rounded-2xl bg-[#fff6e9] p-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ffb340] text-white">
              <RoleIcon className="h-6 w-6" />
            </span>
            <div>
              <div className="text-[16px] font-semibold text-[#f29a1f]">创建角色</div>
              <div className="mt-0.5 text-[12px] text-[#b58a52]">设定人设，开启专属对话</div>
            </div>
          </Link>
          <Link href="/create/story" className="flex h-36 flex-col justify-between rounded-2xl bg-[#eaf3ff] p-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#3d8bff] text-white">
              <BookIcon className="h-6 w-6" />
            </span>
            <div>
              <div className="text-[16px] font-semibold text-[#2b7cf6]">创建故事</div>
              <div className="mt-0.5 text-[12px] text-[#6b8fc4]">多角色共演，编排章节剧情</div>
            </div>
          </Link>
        </div>

        <Link href="/create/draw" className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#ff8fa3] to-[#ffc4d6] text-white">
            <BrushIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-[#161616]">一键绘图</div>
            <div className="text-[12px] text-[#8a8a8f]">话中有画，塑造个性角色形象</div>
          </div>
          <ChevronRight className="h-4 w-4 text-[#c7c7cc]" />
        </Link>

        <div className="mt-5 flex items-end justify-between">
          <h3 className="text-[16px] font-semibold text-[#161616]">从模板创作</h3>
          <span className="text-[12px] text-[#9a9aa0]">选择模板，一键套用</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          {CHARACTER_TEMPLATES.map((t, i) => (
            <button key={t.label} onClick={() => applyTemplate(i)} className="overflow-hidden rounded-xl bg-white text-left">
              <div className="relative aspect-[3/4] bg-neutral-200 bg-cover bg-center" style={{ backgroundImage: `url("${t.cover}")` }}>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-8">
                  <div className="text-[14px] font-semibold text-white">{t.label}</div>
                  <div className="truncate text-[11px] text-white/75">{t.name}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <Link href="/discover" className="mt-5 flex items-center justify-between rounded-2xl bg-white p-4">
          <span className="text-[15px] font-medium text-[#161616]">发现广场</span>
          <ChevronRight className="h-4 w-4 text-[#c7c7cc]" />
        </Link>
      </div>
    </div>
  );
}
