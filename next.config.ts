import type { NextConfig } from "next";

/**
 * 预览环境说明：
 * 应用跑在 e2b 沙箱的 3000 端口，用户通过 `3000-<sandboxId>.e2b.app` 反向代理访问。
 * Next 的开发服务器默认只信任同源请求，会把代理域名的 /_next/* 资源当作跨域拒绝，
 * 表现为热更新握手失败、偶尔样式与脚本加载异常。这里把预览域名放开，
 * 仅作用于开发环境，生产构建不受影响。
 */
const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev", "localhost", "127.0.0.1"],
  // 预览环境不需要 Next 的开发指示器，它会盖住底部导航
  devIndicators: false,
};

export default nextConfig;
