import { Spinner } from "@/components/ui";

// 与页面自身的加载态完全一致，路由过渡时不会出现"两段不同的加载画面"。
export default function Loading() {
  return (
    <div className="grid h-full place-items-center bg-white text-[#c7c7cc]">
      <Spinner />
    </div>
  );
}
