import type { TabPath } from "@/components/BottomNav";

/** 在任意位置切换到某个保活的标签页（由 TabShell 监听），不产生任何网络请求。 */
export function switchTab(path: TabPath) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<TabPath>("mx-tab", { detail: path }));
}
