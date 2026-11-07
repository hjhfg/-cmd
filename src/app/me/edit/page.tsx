"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Avatar, PageHeader, toast } from "@/components/ui";
import { apiSend, ApiError } from "@/lib/api";
import { fileToDataUrl } from "@/lib/image";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, refresh } = useApp();
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setNickname(user.nickname);
    setBio(user.bio);
    setGender(user.gender);
    setAvatar(user.avatar);
  }, [user]);

  async function save() {
    if (!nickname.trim()) return toast("昵称不能为空");
    setSaving(true);
    try {
      await apiSend("/api/me", { nickname, bio, gender, avatar }, "PATCH");
      await refresh();
      toast("保存成功");
      router.back();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-[#f5f5f7]">
      <PageHeader
        title="编辑资料"
        right={
          <button disabled={saving} onClick={() => void save()} className="rounded-full bg-[#FFE500] px-3.5 py-1.5 text-[13px] font-semibold disabled:opacity-50">
            保存
          </button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        <div className="flex flex-col items-center py-6">
          <button onClick={() => fileRef.current?.click()} className="relative">
            <Avatar src={avatar || undefined} name={nickname} size={92} className="border-4 border-white shadow" />
            <span className="absolute inset-x-0 bottom-0 rounded-b-full bg-black/45 py-0.5 text-center text-[11px] text-white">更换</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setAvatar(await fileToDataUrl(f, 320));
              } catch {
                toast("图片读取失败");
              }
            }}
          />
        </div>
        <div className="overflow-hidden rounded-2xl bg-white">
          <label className="flex items-center gap-4 border-b border-[#f2f2f4] px-4 py-3.5">
            <span className="w-12 shrink-0 text-[15px] text-[#55555a]">昵称</span>
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="min-w-0 flex-1 text-[15px] outline-none" />
          </label>
          <div className="flex items-center gap-4 border-b border-[#f2f2f4] px-4 py-3">
            <span className="w-12 shrink-0 text-[15px] text-[#55555a]">性别</span>
            <div className="flex gap-2">
              {["男", "女", "保密"].map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g === "保密" ? "" : g)}
                  className={`rounded-full px-4 py-1 text-[14px] ${(gender || "保密") === g ? "bg-[#FFE500] font-semibold" : "bg-[#f4f4f6] text-[#55555a]"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <label className="flex gap-4 px-4 py-3.5">
            <span className="w-12 shrink-0 pt-0.5 text-[15px] text-[#55555a]">简介</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={80}
              rows={3}
              placeholder="介绍一下自己吧～"
              className="min-w-0 flex-1 resize-none text-[15px] leading-relaxed outline-none placeholder:text-[#b4b4b8]"
            />
          </label>
        </div>
        <p className="mt-3 px-1 text-[12px] text-[#a0a0a5]">猫箱号：{user?.code}</p>
      </div>
    </div>
  );
}
