"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Empty, PageHeader, Spinner } from "@/components/ui";
import { BellIcon, ChatSmallIcon, FireIcon, HeartFill } from "@/components/icons";
import { apiGet, apiSend } from "@/lib/api";
import { relTime } from "@/lib/format";
import type { NotificationInfo } from "@/lib/types";

function TypeIcon({ type }: { type: string }) {
  if (type === "like")
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ffe3ea] text-[#ff2c55]">
        <HeartFill className="h-5 w-5" />
      </span>
    );
  if (type === "comment")
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e3f0ff] text-[#2b8cff]">
        <ChatSmallIcon className="h-5 w-5" />
      </span>
    );
  if (type === "activity")
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff0e0] text-[#ff7a1a]">
        <FireIcon className="h-5 w-5" />
      </span>
    );
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FFE500] text-black">
      <BellIcon className="h-5 w-5" />
    </span>
  );
}

export default function InteractionsPage() {
  const { refresh } = useApp();
  const [items, setItems] = useState<NotificationInfo[] | null>(null);

  useEffect(() => {
    apiGet<{ items: NotificationInfo[] }>("/api/notifications")
      .then((r) => {
        setItems(r.items);
        void apiSend("/api/notifications").then(() => refresh());
      })
      .catch(() => setItems([]));
  }, [refresh]);

  return (
    <div className="flex h-full flex-col bg-white">
      <PageHeader title="互动消息" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items === null ? (
          <div className="grid h-40 place-items-center text-[#c7c7cc]">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <Empty text="暂时没有新的互动消息" />
        ) : (
          items.map((n) => {
            const body = (
              <div className="flex gap-3 px-4 py-3.5">
                <TypeIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[15px]">
                    <span className="font-semibold text-[#161616]">{n.fromName}</span>
                    <span className="text-[#55555a]">{n.title}</span>
                    {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-[#ff2d55]" />}
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#8a8a8f]">{n.content}</p>
                  <div className="mt-1 text-[12px] text-[#b0b0b5]">{relTime(n.createdAt)}</div>
                </div>
              </div>
            );
            return n.targetId > 0 && n.targetType ? (
              <Link key={n.id} href={`/work/${n.targetType}/${n.targetId}`} className="block border-b border-[#f4f4f6]">
                {body}
              </Link>
            ) : (
              <div key={n.id} className="border-b border-[#f4f4f6]">
                {body}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
