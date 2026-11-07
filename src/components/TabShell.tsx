"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import BottomNav, { type TabPath } from "./BottomNav";
import { ErrorBoundary } from "./ErrorBoundary";
import HomeScreen from "./screens/HomeScreen";
import DiscoverScreen from "./screens/DiscoverScreen";
import CreateScreen from "./screens/CreateScreen";
import MessagesScreen from "./screens/MessagesScreen";
import MeScreen from "./screens/MeScreen";

const TAB_PATHS: TabPath[] = ["/", "/discover", "/create", "/messages", "/me"];

const SCREENS: Record<TabPath, ComponentType<{ visible: boolean }>> = {
  "/": HomeScreen,
  "/discover": DiscoverScreen,
  "/create": CreateScreen,
  "/messages": MessagesScreen,
  "/me": MeScreen,
};

/**
 * 原生 App 式标签页外壳。
 *
 * - 5 个标签页同时「保活」：切换只是显示/隐藏（visibility），不重建、不重新请求，
 *   所以不会再出现任何加载转圈或启动图；滚动位置、输入内容、信息流进度都会保留。
 * - 首屏之后在后台把其余标签页预热好，第一次切换也是即时的。
 * - 底部导航只渲染一份、常驻；点击用 history.pushState 同步地址栏，零网络请求。
 * - 非标签路由（聊天、设置、设定管理……）作为覆盖层显示，返回时标签页原样还在。
 */
export function TabShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const activeTab = (TAB_PATHS as string[]).includes(pathname) ? (pathname as TabPath) : null;

  // 记住访问过的标签页。采用 React 官方「渲染期依据 props 调整 state」的写法，
  // 而不是在 effect 里 setState，可以少一次提交、也不会闪一帧。
  const [visited, setVisited] = useState<TabPath[]>(() => (activeTab ? [activeTab] : []));
  const [prevActive, setPrevActive] = useState<TabPath | null>(activeTab);
  if (activeTab !== prevActive) {
    setPrevActive(activeTab);
    const next = activeTab;
    if (next) setVisited((v) => (v.includes(next) ? v : [...v, next]));
  }

  // 首屏后台预热其余标签页，保证第一次切换也没有加载
  const [prewarmed, setPrewarmed] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setPrewarmed(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const mounted = new Set<TabPath>(prewarmed ? TAB_PATHS : visited);
  if (activeTab) mounted.add(activeTab);

  // 记录 React 侧的路由值：pushState 后若路由器没有跟进，用它来发现并兜底
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  const selectTab = useCallback(
    (path: TabPath) => {
      if (path === pathRef.current) return;
      try {
        window.history.pushState(null, "", path);
      } catch {
        router.push(path);
        return;
      }
      // 保险：若地址栏同步没有生效（极少数环境），退回到路由跳转
      window.setTimeout(() => {
        if (pathRef.current !== path) router.push(path);
      }, 80);
    },
    [router],
  );

  // 页面内的任何按钮（如「我的」里的「我的聊天」）都可以通过 switchTab() 零网络切换标签
  useEffect(() => {
    const onSwitch = (e: Event) => selectTab((e as CustomEvent<TabPath>).detail);
    window.addEventListener("mx-tab", onSwitch);
    return () => window.removeEventListener("mx-tab", onSwitch);
  }, [selectTab]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        {TAB_PATHS.filter((p) => mounted.has(p)).map((p) => {
          const Screen = SCREENS[p];
          const on = activeTab === p;
          return (
            <div
              key={p}
              data-tab={p}
              inert={!on}
              aria-hidden={!on}
              className={`absolute inset-0 ${on ? "" : "pointer-events-none invisible"}`}
            >
              <ErrorBoundary>
                <Screen visible={on} />
              </ErrorBoundary>
            </div>
          );
        })}

        {!activeTab && (
          <div className="absolute inset-0 z-20 overflow-hidden">
            <ErrorBoundary pathname={pathname}>{children}</ErrorBoundary>
          </div>
        )}
      </div>

      {/* 首页与「我的」同为沉浸式深色舞台，导航随之变深，避免深浅断层 */}
      {activeTab && (
        <BottomNav active={activeTab} theme={activeTab === "/" || activeTab === "/me" ? "dark" : "light"} onSelect={selectTab} />
      )}
    </div>
  );
}
