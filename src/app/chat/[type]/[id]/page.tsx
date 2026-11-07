"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ChatStage from "@/components/chat/ChatStage";
import { PageHeader, Spinner } from "@/components/ui";
import { apiGet, ApiError } from "@/lib/api";
import type { FeedItem } from "@/lib/types";

export default function ChatPage() {
  const params = useParams<{ type: string; id: string }>();
  const [item, setItem] = useState<FeedItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setItem(null);
    setError("");
    apiGet<{ item: FeedItem }>(`/api/works/${params.type}/${params.id}`)
      .then((r) => setItem(r.item))
      .catch((e) => setError(e instanceof ApiError ? e.message : "加载失败"));
  }, [params.type, params.id]);

  if (error) {
    return (
      <div className="flex h-full flex-col bg-black text-white">
        <PageHeader dark />
        <div className="grid flex-1 place-items-center text-[14px] text-white/60">{error}</div>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="grid h-full place-items-center bg-black text-white/60">
        <Spinner />
      </div>
    );
  }
  return (
    <div className="relative h-full">
      <ChatStage key={item.key} item={item} active variant="page" />
    </div>
  );
}
