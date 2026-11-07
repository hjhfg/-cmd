import type { RegexRule } from "./types";

/**
 * 「我的 · 正则」规则求值。
 *
 * 规则与 SillyTavern 的正则扩展同构：每条规则是一个 查找 → 替换 的表达式，
 * 只作用于对话文本，不改动系统提示词或世界书。所有正则都在 try/catch 内执行，
 * 单个规则写坏不会影响其他规则或整条消息。
 */

export type RegexScope = "reply" | "input" | "both";

const FLAG_MAP: Record<string, string> = { g: "g", i: "i", m: "m", s: "s", u: "u", y: "y" };

export function normalizeFlags(raw: string): string {
  const seen = new Set<string>();
  let out = "";
  for (const ch of (raw || "").replace(/[^gimsuyd]/g, "")) {
    if (ch === "d" || seen.has(ch)) continue;
    seen.add(ch);
    out += FLAG_MAP[ch] ?? "";
  }
  return out;
}

/** 编译一个规则；返回 null 表示正则本身无效。 */
export function compileRule(rule: Pick<RegexRule, "pattern" | "flags">): RegExp | null {
  if (!rule.pattern) return null;
  try {
    return new RegExp(rule.pattern, normalizeFlags(rule.flags));
  } catch {
    return null;
  }
}

/** 校验一条规则，返回中文错误提示（空字符串代表可用）。 */
export function ruleError(rule: Pick<RegexRule, "pattern" | "flags">): string {
  if (!rule.pattern.trim()) return "正则表达式不能为空";
  try {
    new RegExp(rule.pattern, normalizeFlags(rule.flags));
    return "";
  } catch (e) {
    return e instanceof Error ? e.message.replace(/^Invalid regular expression:\s*/i, "表达式无效：") : "表达式无效";
  }
}

function applyOne(text: string, rule: RegexRule): string {
  if (!rule.enabled || !rule.pattern) return text;
  const re = compileRule(rule);
  if (!re) return text;
  try {
    return text.replace(re, rule.replacement);
  } catch {
    return text;
  }
}

/** 按作用域应用规则；scope=reply 改写角色输出，input 改写用户输入。 */
export function applyRegex(rules: RegexRule[] | undefined, text: string, scope: "reply" | "input"): string {
  if (!rules?.length || !text) return text;
  return rules.reduce((acc, rule) => {
    if (!rule.enabled) return acc;
    if (rule.scope !== "both" && rule.scope !== scope) return acc;
    return applyOne(acc, rule);
  }, text);
}

export const REGEX_PRESETS: { name: string; pattern: string; replacement: string; flags: string; scope: RegexScope; hint: string }[] = [
  {
    name: "去掉旁白括号",
    pattern: "（[^）]*）|\\([^)]*\\)",
    replacement: "",
    flags: "g",
    scope: "reply",
    hint: "把（动作描写）整段抹掉，只留台词",
  },
  {
    name: "括号换字幕样式",
    pattern: "（([^）]*)）",
    replacement: "〔$1〕",
    flags: "g",
    scope: "reply",
    hint: "把全角括号换成〔〕，视觉上更安静",
  },
  {
    name: "抹掉内心 OS",
    pattern: "（内心OS：[^）]*）",
    replacement: "",
    flags: "g",
    scope: "reply",
    hint: "心动模式的内心独白不再显示",
  },
  {
    name: "清理重复空行",
    pattern: "\\n{3,}",
    replacement: "\\n\\n",
    flags: "g",
    scope: "both",
    hint: "把三行以上的空行压成一行",
  },
  {
    name: "屏蔽出戏词",
    pattern: "作为(一个)?AI|AI\\s*助手|语言模型",
    replacement: "……",
    flags: "gi",
    scope: "reply",
    hint: "角色偶尔出戏时自动换成省略号",
  },
  {
    name: "去掉 markdown 星号",
    pattern: "\\*{1,3}([^*\\n]+)\\*{1,3}",
    replacement: "$1",
    flags: "g",
    scope: "reply",
    hint: "模型爱用的 *强调* 一律降成纯文本",
  },
];
