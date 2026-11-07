"use client";

import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode; pathname?: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  componentDidUpdate(prev: { pathname?: string }) {
    // 路由变化时只清除错误状态，不重建子树（避免页面状态被重置、重新加载）
    if (this.state.error && prev.pathname !== this.props.pathname) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[#0b0b0c] px-8 text-center text-white">
          <div className="text-[40px]">🐾</div>
          <h2 className="mt-3 text-[18px] font-bold">页面出了点小问题</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60">别担心，你的数据都还在。点下面的按钮重新加载这一页。</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-6 rounded-full bg-[#FFE500] px-7 py-2.5 text-[15px] font-semibold text-black"
          >
            重新加载
          </button>
          <button onClick={() => window.location.assign("/")} className="mt-3 text-[13px] text-white/50 underline">
            回到首页
          </button>
        </div>
      );
    }
    return <div className="h-full min-h-0">{this.props.children}</div>;
  }
}
