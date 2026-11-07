import localFont from "next/font/local";

/**
 * 字体配置。
 *
 * 这里显式指定 @font-face 的 font-family，而不是让 next/font 自动生成
 * 带哈希的类名（`sans_xxxx__variable`），原因有三：
 *  1. Tailwind v4 的 --font-sans 需要在 CSS 里稳定引用一个名字；
 *  2. 预览环境偶发样式重建时，哈希类名与变量不同步会退化成系统字体；
 *  3. 显式声明后，`.stage-serif` 这类工具类可以直接写死字体名。
 */
export const sans = localFont({
  src: [
    { path: "../../public/fonts/noto-sans-sc-chinese-simplified-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/noto-sans-sc-chinese-simplified-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/noto-sans-sc-chinese-simplified-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../../public/fonts/noto-sans-sc-chinese-simplified-900-normal.woff2", weight: "900", style: "normal" },
  ],
  declarations: [
    { prop: "font-family", value: "Maoxiang Sans" },
    { prop: "font-display", value: "swap" },
  ],
  fallback: ["PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "system-ui", "sans-serif"],
  preload: false,
  adjustFontFallback: false,
});

/** 标题字体：思源宋体，用于「我的」这类需要书卷气的版式。 */
export const serif = localFont({
  src: [{ path: "../../public/fonts/noto-serif-sc-chinese-simplified-700-normal.woff2", weight: "700", style: "normal" }],
  declarations: [
    { prop: "font-family", value: "Maoxiang Serif" },
    { prop: "font-display", value: "swap" },
  ],
  fallback: ["Songti SC", "SimSun", "serif"],
  preload: false,
  adjustFontFallback: false,
});
