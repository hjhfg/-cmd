"use client";

import { useEffect, useState } from "react";
import { PageHeader, toast } from "@/components/ui";
import { CheckIcon, LockIcon } from "@/components/icons";
import { apiGet, apiSend, ApiError } from "@/lib/api";

const providers = [
  { id: "built-in", name: "内置模式", base: "", model: "", desc: "无需配置，使用内置引擎或管理员提供的模型" },
  { id: "openai", name: "OpenAI", base: "https://api.openai.com/v1", model: "gpt-4o-mini", desc: "支持 OpenAI 聊天模型" },
  { id: "deepseek", name: "DeepSeek", base: "https://api.deepseek.com/v1", model: "deepseek-chat", desc: "DeepSeek 官方接口" },
  { id: "ark", name: "豆包 / 火山方舟", base: "https://ark.cn-beijing.volces.com/api/v3", model: "", desc: "填写在火山方舟开通的模型 ID" },
  { id: "custom", name: "自定义兼容接口", base: "", model: "", desc: "任何支持 OpenAI Chat Completions 的 HTTPS 服务" },
];
type Config = { provider: string; baseUrl: string; model: string; hasKey: boolean };

export default function ApiSettingsPage() {
  const [cfg, setCfg] = useState<Config>({ provider: "built-in", baseUrl: "", model: "", hasKey: false });
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  useEffect(() => { apiGet<Config>("/api/studio?scope=api").then(setCfg).catch(() => toast("加载 API 设置失败")); }, []);
  const changeProvider = (provider: string) => {
    const p = providers.find((x) => x.id === provider)!;
    setCfg((old) => ({ ...old, provider, baseUrl: p.base, model: p.model }));
  };
  const save = async () => {
    setBusy(true);
    try { const result = await apiSend<Config>("/api/studio", { scope: "api", action: "save", ...cfg, apiKey, clearKey }); setCfg(result); setApiKey(""); setClearKey(false); toast("连接设置已保存，下一条消息开始生效"); }
    catch (e) { toast(e instanceof ApiError ? e.message : "保存失败"); }
    finally { setBusy(false); }
  };
  const test = async () => {
    setTesting(true);
    try { await apiSend("/api/studio", { scope: "api", action: "test", ...cfg, apiKey }); toast("连接成功，模型可以正常回复"); }
    catch (e) { toast(e instanceof ApiError ? e.message : "连接失败"); }
    finally { setTesting(false); }
  };
  return <div className="flex h-full flex-col bg-[#f6f6f8] text-[#1c1c1e]"><PageHeader title="AIP 设置" /><div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
    <div className="rounded-2xl bg-[#fff7d2] p-4 text-[13px] leading-relaxed text-[#655522]">连接你自己的 AI 模型。设置仅影响你的对话，密钥加密保存在服务端，不会发送给其他用户。</div>
    <h2 className="mt-6 text-[16px] font-bold">选择模型服务</h2>
    <div className="mt-3 space-y-2">{providers.map((p) => <button key={p.id} onClick={() => changeProvider(p.id)} className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-3.5 text-left ${cfg.provider === p.id ? "border-[#ffe500]" : "border-transparent"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold ${cfg.provider === p.id ? "bg-[#ffe500]" : "bg-[#f2f2f4]"}`}>{p.name[0]}</span><span className="min-w-0 flex-1"><b className="text-[14px]">{p.name}</b><span className="block text-[12px] text-[#999]">{p.desc}</span></span>{cfg.provider === p.id && <CheckIcon className="h-5 w-5" />}</button>)}</div>
    {cfg.provider !== "built-in" && <div className="mt-6 space-y-4"><label className="block text-sm font-semibold">API 地址<input value={cfg.baseUrl} onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })} placeholder="https://api.example.com/v1" className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label><p className="-mt-2 text-[11px] text-[#999]">填写基础地址，不要加 /chat/completions；仅支持 HTTPS 公网服务</p>
      <label className="block text-sm font-semibold">模型名称 / ID<input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder="例如 deepseek-chat" className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label>
      <label className="block text-sm font-semibold">API Key {cfg.hasKey && <span className="text-xs font-normal text-[#999]">（已保存；留空则沿用原密钥）</span>}<input value={apiKey} onChange={(e) => { setApiKey(e.target.value); setClearKey(false); }} type="password" autoComplete="new-password" placeholder={cfg.hasKey ? "已保存 · 输入新密钥可替换" : "输入 API Key"} className="mt-2 w-full rounded-xl bg-white p-3.5 font-normal outline-none" /></label>
      {cfg.hasKey && <button onClick={() => { setClearKey(true); setApiKey(""); }} className="text-sm text-[#f05a61]">{clearKey ? "保存后将移除密钥" : "移除已保存密钥"}</button>}
      <button onClick={() => void test()} disabled={testing} className="h-11 w-full rounded-full border border-[#dedee1] bg-white font-medium disabled:opacity-50">{testing ? "正在测试…" : "测试连接"}</button></div>}
    <button onClick={() => void save()} disabled={busy} className="mt-6 h-12 w-full rounded-full bg-[#ffe500] font-bold disabled:opacity-50">{busy ? "正在保存…" : "保存设置"}</button>
    <p className="mt-5 flex items-start gap-2 text-[12px] leading-relaxed text-[#999]"><LockIcon className="h-4 w-4 shrink-0" />若你在环境变量中配置了全局模型密钥，内置模式会自动使用它；否则使用本地角色扮演引擎。</p>
  </div></div>;
}
