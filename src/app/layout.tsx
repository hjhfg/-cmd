import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { TabShell } from "@/components/TabShell";
import { sans, serif } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "猫箱 - 和心动 AI 探索剧情宇宙",
  description: "打开「猫箱」，和心动 AI 探索剧情宇宙。身临其境地与个性鲜明、背景各异的虚拟 AI 角色聊天互动，开启专属于你们的故事！",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${sans.className} ${serif.className}`}>
      <body>
        <AppProvider>
          <TabShell>{children}</TabShell>
        </AppProvider>
      </body>
    </html>
  );
}
