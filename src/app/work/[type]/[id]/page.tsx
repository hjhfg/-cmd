"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Avatar, PageHeader, Sheet, Spinner, confirmDialog, toast, useGoBack } from "@/components/ui";
import { RichText } from "@/components/chat/MessageList";
import { ChevronLeft, EditIcon, HeartFill, LockIcon, MoreIcon, PlayIcon, TrashIcon } from "@/components/icons";
import { apiGet, apiSend, ApiError } from "@/lib/api";
import { formatCount, relTime } from "@/lib/format";
import type { CommentInfo, WorkDetail } from "@/lib/types";

export default function WorkPage() {
  const params = useParams<{ type: string; id: string }>();
  const router = useRouter();
  const back = useGoBack();
  const { refresh } = useApp();
  const [item, setItem] = useState<WorkDetail | null>(null);
  const [err, setErr] = useState("");
  const [comments, setComments] = useState<CommentInfo[]>([]);
  const [menu, setMenu] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    apiGet<{ item: WorkDetail }>(`/api/works/${params.type}/${params.id}`)
      .then((r) => {
        setItem(r.item);
        setLiked(r.item.liked);
        setLikeCount(r.item.likeCount);
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "加载失败"));
    apiGet<{ comments: CommentInfo[] }>(`/api/interact?type=${params.type}&id=${params.id}`)
      .then((r) => setComments(r.comments))
      .catch(() => undefined);
  }, [params.type, params.id]);

  if (err) {
    return (
      <div className="flex h-full flex-col bg-white">
        <PageHeader />
        <div className="grid flex-1 place-items-center text-[14px] text-[#9a9aa0]">{err}</div>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="grid h-full place-items-center bg-white text-[#c7c7cc]">
        <Spinner />
      </div>
    );
  }

  const isStory = item.type === "story";

  async function toggleLike() {
    if (!item) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    try {
      const r = await apiSend<{ liked: boolean; likeCount: number }>("/api/interact", { action: "like", type: item.type, id: item.id });
      setLiked(r.liked);
      setLikeCount(r.likeCount);
    } catch (e) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast(e instanceof ApiError ? e.message : "点赞失败");
    }
  }

  async function setVisibility() {
    if (!item) return;
    setMenu(false);
    try {
      await apiSend(`/api/works/${item.type}/${item.id}`, { isPublic: !item.isPublic }, "PATCH");
      setItem({ ...item, isPublic: !item.isPublic });
      toast(item.isPublic ? "已设为仅自己可见" : "已公开发布");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "操作失败");
    }
  }

  async function remove() {
    if (!item) return;
    setMenu(false);
    const ok = await confirmDialog({ title: "删除作品", content: "删除后无法恢复，相关聊天记录也会被清空", okText: "删除", danger: true });
    if (!ok) return;
    try {
      await apiSend(`/api/works/${item.type}/${item.id}`, undefined, "DELETE");
      toast("已删除");
      void refresh();
      router.replace("/me");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "删除失败");
    }
  }

  return (
    <div className="relative flex h-full flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative h-[56vh] min-h-[340px] bg-neutral-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.cover} alt={item.title} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-3">
            <button aria-label="返回" onClick={back} className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur">
              <ChevronLeft className="h-5 w-5" />
            </button>
            {item.mine && (
              <button aria-label="管理" onClick={() => setMenu(true)} className="grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur">
                <MoreIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[26px] font-bold text-white text-shadow">{item.title}</h1>
              {isStory && <span className="shrink-0 rounded bg-white/25 px-1.5 py-0.5 text-[11px] text-white backdrop-blur">故事</span>}
              {!item.isPublic && (
                <span className="flex shrink-0 items-center gap-0.5 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white">
                  <LockIcon className="h-3 w-3" />
                  私密
                </span>
              )}
            </div>
            <div className="mt-1 text-[13px] text-white/85">@{item.creatorName}</div>
          </div>
        </div>

        <div className="px-5 pb-28 pt-4">
          <div className="grid grid-cols-4 text-center">
            {[
              { n: likeCount, l: "获赞" },
              { n: item.chatCount, l: "聊过" },
              { n: item.commentCount, l: "评论" },
              { n: item.shareCount, l: "分享" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-[18px] font-bold text-[#161616]">{formatCount(s.n)}</div>
                <div className="text-[12px] text-[#9a9aa0]">{s.l}</div>
              </div>
            ))}
          </div>

          {item.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((t) => (
                <span key={t} className="rounded-full bg-[#f4f4f6] px-3 py-1 text-[12px] text-[#55555a]">
                  #{t}
                </span>
              ))}
            </div>
          )}

          <section className="mt-5">
            <h3 className="text-[16px] font-semibold text-[#161616]">{isStory ? "故事简介" : "角色简介"}</h3>
            <p className="mt-2 whitespace-pre-wrap text-[14.5px] leading-[1.8] text-[#3a3a3c]">{item.intro || "暂无简介"}</p>
          </section>

          {item.mine && item.setting && (
            <section className="mt-5">
              <h3 className="flex items-center gap-1.5 text-[16px] font-semibold text-[#161616]">
                角色设定<span className="text-[11px] font-normal text-[#a0a0a5]">仅自己可见</span>
              </h3>
              <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-[#f6f6f8] p-3.5 text-[14px] leading-[1.75] text-[#3a3a3c]">{item.setting}</p>
            </section>
          )}

          {!isStory && item.greeting && (
            <section className="mt-5">
              <h3 className="text-[16px] font-semibold text-[#161616]">开场白</h3>
              <div className="mt-2 rounded-2xl bg-[#f6f6f8] p-3.5 text-[14.5px] leading-[1.75] text-[#1c1c1e]">
                <RichText text={item.greeting} dim="text-[#9a9aa0]" />
              </div>
            </section>
          )}

          {isStory && item.characters.length > 0 && (
            <section className="mt-5">
              <h3 className="text-[16px] font-semibold text-[#161616]">出场角色</h3>
              <div className="no-scrollbar mt-3 flex gap-5 overflow-x-auto">
                {item.characters.map((c) => (
                  <div key={c.id} className="flex shrink-0 flex-col items-center gap-1.5">
                    <Avatar src={c.avatar} focus={c.avatarFocus} size={56} name={c.name} />
                    <span className="text-[13px] text-[#3a3a3c]">{c.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isStory && item.chaptersFull.length > 0 && (
            <section className="mt-5">
              <h3 className="text-[16px] font-semibold text-[#161616]">章节（{item.chaptersFull.length}）</h3>
              <div className="mt-2 space-y-2">
                {item.chaptersFull.map((c, i) => (
                  <div key={i} className="rounded-2xl bg-[#f6f6f8] p-3.5">
                    <div className="text-[14.5px] font-semibold text-[#1c1c1e]">
                      第{i + 1}章 · {c.title}
                    </div>
                    <div className="mt-1 text-[12.5px] text-[#8a8a8f]">{c.goal ? `章节目标：${c.goal.replace(/用户/g, "你")}` : "自由剧情，没有结局限制"}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h3 className="text-[16px] font-semibold text-[#161616]">评论 {formatCount(item.commentCount)}</h3>
            {comments.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#a0a0a5]">还没有评论，开始聊天后来说说感受吧～</p>
            ) : (
              comments.slice(0, 6).map((c) => (
                <div key={c.id} className="flex gap-3 py-3">
                  <Avatar src={c.userAvatar || undefined} name={c.userName} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-[#8a8a8f]">{c.userName}</div>
                    <div className="mt-0.5 text-[14.5px] leading-relaxed text-[#1c1c1e]">{c.content}</div>
                    <div className="mt-1 text-[12px] text-[#b0b0b5]">{relTime(c.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 border-t border-[#f0f0f2] bg-white/95 px-4 py-3 backdrop-blur">
        <button onClick={() => void toggleLike()} className="flex w-12 flex-col items-center text-[11px] text-[#8a8a8f]">
          <HeartFill className={`h-6 w-6 ${liked ? "like-pop text-[#ff2c55]" : "text-[#c7c7cc]"}`} />
          {formatCount(likeCount)}
        </button>
        {isStory && item.chaptersFull.length > 0 && (
          <Link href={`/theater/${item.id}`} className="flex h-12 items-center gap-1 rounded-full border border-[#e5e5ea] px-4 text-[14px] font-medium text-[#161616]">
            <PlayIcon className="h-4 w-4" />
            AI剧场
          </Link>
        )}
        <Link href={`/chat/${item.type}/${item.id}`} className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#FFE500] text-[16px] font-semibold text-black">
          开始聊天
        </Link>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="作品管理">
        <div className="px-4 pb-7">
          {!isStory && (
            <Link href={`/create/character?edit=${item.id}`} className="flex h-14 items-center gap-3 border-b border-[#f2f2f4] text-[15px]">
              <EditIcon className="h-5 w-5" />
              编辑角色
            </Link>
          )}
          <button onClick={() => void setVisibility()} className="flex h-14 w-full items-center gap-3 border-b border-[#f2f2f4] text-[15px]">
            <LockIcon className="h-5 w-5" />
            {item.isPublic ? "设为仅自己可见" : "公开发布"}
          </button>
          <button onClick={() => void remove()} className="flex h-14 w-full items-center gap-3 text-[15px] text-[#ff3b30]">
            <TrashIcon className="h-5 w-5" />
            删除作品
          </button>
        </div>
      </Sheet>
    </div>
  );
}
