import type { CharacterDraft, HeartKind, HeartResult, Msg } from "./types";
import { ALL_TAGS } from "./constants";
import type { StudioContext } from "./studio";

export interface CharLite {
  id: number;
  name: string;
  setting: string;
  intro: string;
  greeting: string;
  gender: string;
  tags: string[];
}

export interface StoryLite {
  title: string;
  intro: string;
  background: string;
  chapters: { title: string; content: string; goal: string }[];
}

type LlmMsg = { role: "system" | "user" | "assistant"; content: string };

/* ------------------------------------------------------------------ */
/* LLM provider (豆包/火山方舟、OpenAI、DeepSeek 等 OpenAI 兼容接口)      */
/* ------------------------------------------------------------------ */

function llmConfig(): { base: string; key: string; model: string } | null {
  const e = process.env;
  if (e.ARK_API_KEY) {
    return { base: e.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3", key: e.ARK_API_KEY, model: e.ARK_MODEL || "doubao-seed-1-6-flash-250828" };
  }
  if (e.OPENAI_API_KEY) {
    return { base: e.OPENAI_BASE_URL || "https://api.openai.com/v1", key: e.OPENAI_API_KEY, model: e.OPENAI_MODEL || "gpt-4o-mini" };
  }
  if (e.DEEPSEEK_API_KEY) {
    return { base: e.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1", key: e.DEEPSEEK_API_KEY, model: e.DEEPSEEK_MODEL || "deepseek-chat" };
  }
  return null;
}

export function hasLlm(studio?: StudioContext) {
  return !!studio?.connection || llmConfig() !== null;
}

async function callLlm(messages: LlmMsg[], opts: { temperature?: number; maxTokens?: number; connection?: StudioContext["connection"] } = {}): Promise<string | null> {
  const cfg = opts.connection || llmConfig();
  if (!cfg) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(`${cfg.base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.9,
        max_tokens: opts.maxTokens ?? 600,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text ? text.replace(/<think>[\s\S]*?<\/think>/g, "").trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  const m = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toLlmHistory(history: Msg[], story: boolean, max = 24): LlmMsg[] {
  return history.slice(-max).map((m): LlmMsg => {
    if (m.role === "user") return { role: "user", content: m.content };
    if (m.role === "system") return { role: "user", content: `【系统提示：${m.content}】` };
    if (!story) return { role: "assistant", content: m.content };
    return { role: "assistant", content: `${m.role === "narrator" ? "旁白" : m.speaker}：${m.content}` };
  });
}

/* ------------------------------------------------------------------ */
/* 本地角色扮演引擎（未配置大模型时使用）                                 */
/* ------------------------------------------------------------------ */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const stripActs = (s: string) => s.replace(/（[^）]*）|\([^)]*\)/g, "").trim();

type Temper = "cold" | "gentle" | "bossy" | "lively" | "cute" | "sharp";

function temperOf(c: CharLite): Temper {
  const t = `${c.setting} ${c.intro} ${c.tags.join(" ")}`;
  if (/熊猫|萌宠|奶声|幼崽|小动物|叠词/.test(t)) return "cute";
  if (/侦探|推理|刑侦|案件|探案/.test(t)) return "sharp";
  if (/清冷|高冷|冷漠|孤傲|冰山|无情道|寡言|惜字如金|冷若冰霜/.test(t)) return "cold";
  if (/霸道|总裁|强势|占有欲|不容/.test(t)) return "bossy";
  if (/活泼|开朗|元气|俏皮|天真|大大咧咧|迷糊/.test(t)) return "lively";
  return "gentle";
}

type Intent =
  | "action" | "night" | "bye" | "sad" | "love" | "angry" | "sorry" | "praise"
  | "food" | "happy" | "greet" | "refuse" | "agree" | "question" | "other";

const INTENTS: [Intent, RegExp][] = [
  ["night", /晚安|睡了|去睡|困了|好困|睡觉/],
  ["bye", /再见|拜拜|我走了|下次见|先忙/],
  ["sad", /难过|伤心|哭|好累|烦|不开心|压力|委屈|emo|孤单|孤独|失眠|好丧|心痛|疼/],
  ["love", /喜欢你|爱你|想你|在一起|抱抱|抱我|亲亲|亲你|嫁给|娶|心动|表白|做我/],
  ["angry", /生气|讨厌你|滚|烦死|气死|别管我|走开|哼/],
  ["sorry", /对不起|抱歉|我错了|原谅/],
  ["praise", /好帅|好美|好看|可爱|厉害|真棒|好温柔|好酷/],
  ["food", /饿|吃|饭|奶茶|零食|竹笋|咖啡|甜品|蛋糕/],
  ["happy", /开心|高兴|哈哈|太好了|耶|嘻嘻|好耶/],
  ["greet", /^(你好|嗨|hi|hello|在吗|早|早上好|晚上好|中午好|哈喽|嘿)/i],
  ["refuse", /^(不|不要|才不|算了|没空|不行|拒绝)/],
  ["agree", /^(好|嗯|可以|行|好呀|好啊|当然|没问题|走吧|愿意|ok|陪你)/i],
  ["question", /[?？]|吗$|什么|为什么|怎么|哪里|谁|多少/],
];

function detectIntent(text: string): Intent {
  const spoken = stripActs(text);
  if (!spoken && /（|\(/.test(text)) return "action";
  for (const [intent, re] of INTENTS) if (re.test(spoken || text)) return intent;
  return "other";
}

const ACTIONS: Record<Temper, string[]> = {
  cold: ["眉头微蹙，别过脸去", "指尖微微一顿，声音依旧清冷", "沉默片刻，目光落在你身上", "轻哼一声，耳尖却悄悄泛红", "垂眸掩去眼底的波澜", "背过身去，语气淡淡"],
  gentle: ["轻轻笑了笑，伸手揉了揉你的头发", "温柔地看着你，眼里盛满笑意", "放轻了声音，像是怕吓到你", "把外套披在你肩上", "靠近了一点，声音低低的", "牵起你的手，掌心温热"],
  bossy: ["单手撑在你身侧的墙上，微微俯身", "挑眉看着你，嘴角勾起一抹笑", "不由分说地牵起你的手", "低头凑近你耳边", "指节轻敲桌面，语气不容置疑", "捏住你的下巴，迫使你看着他"],
  lively: ["眼睛一亮，凑到你面前", "晃了晃你的胳膊", "笑得眉眼弯弯", "原地蹦了一下", "鼓起腮帮子看着你", "双手托腮，笑嘻嘻地"],
  cute: ["圆滚滚的身子蹭了蹭你的手心", "抱着竹子歪了歪脑袋", "耳朵抖了抖，眨巴着大眼睛", "在地上打了个滚", "伸出毛茸茸的爪子拍拍你", "把脑袋埋进你怀里"],
  sharp: ["推了推眼镜，目光锐利", "双手插兜，似笑非笑地看着你", "挑了挑眉", "轻嗤一声", "若有所思地摩挲着下巴", "合上卷宗，抬眼看你"],
};

type Pool = Partial<Record<Temper, string[]>> & { any: string[] };

const LINES: Record<Intent, Pool> = {
  action: {
    any: ["……你这是做什么？", "别闹。……再一下就好。", "你总是这样，让我拿你没办法。"],
    cold: ["……放肆。（却没有躲开）", "胆子不小。"],
    lively: ["哎呀！你干嘛啦～", "嘿嘿，再来一次！"],
    cute: ["嘤～好舒服，{n}还要！", "呜哇，{n}被你抓到啦！"],
    bossy: ["主动招惹我，可是要负责的。", "继续，我准你了。"],
  },
  greet: {
    any: ["你来了。我还以为你今天不会来了。", "嗯，我在。找我有事？", "来得正好，我刚好想找你。"],
    cold: ["……是你。有事就说。", "来了就坐吧，别站着。"],
    lively: ["你来啦！我等你好久了！", "嘿嘿，就知道你会来找我！"],
    cute: ["嘤～是你呀！{n}想你啦！", "你来啦你来啦！快摸摸{n}的头！"],
    bossy: ["迟到了三分钟，说吧，打算怎么补偿我？", "过来，让我看看你。"],
    sharp: ["准时，难得。说吧，什么事？", "你的脚步声我隔着两条走廊就听出来了。"],
  },
  night: {
    any: ["这么晚了，快去睡吧。晚安，做个好梦。", "晚安。明天醒来，我还在。"],
    cold: ["……早点休息，别熬夜。", "睡吧，我守着。"],
    lively: ["晚安晚安！梦里也要记得我哦！"],
    cute: ["呼噜噜……{n}也困了，我们一起睡吧，晚安嘤～"],
    bossy: ["不许熬夜，现在就去睡。……晚安。"],
    sharp: ["睡眠不足会影响判断力。去睡吧，晚安。"],
  },
  bye: {
    any: ["路上小心。……记得回来找我。", "这么快就要走了吗？"],
    cold: ["……嗯。（目送你离开，许久没有收回视线）"],
    cute: ["不要走嘛……那你明天还要来看{n}哦！"],
    bossy: ["去吧。到家给我发消息，不许忘。"],
  },
  sad: {
    any: ["怎么了？谁让你受委屈了？跟我说说。", "没事的，有我在。想哭就哭出来吧。", "「{e}」……我都听着呢。你不是一个人。"],
    cold: ["……谁欺负你了？告诉我名字。", "哭什么。……过来，肩膀借你。"],
    lively: ["不许难过！走，我请你吃好吃的，吃完就开心啦！"],
    cute: ["{n}把最大的竹笋分给你！吃了就不难过了好不好？", "抱抱！{n}的肚子软软的，给你靠～"],
    bossy: ["谁惹你了？我去处理。你只需要待在我身边。"],
    sharp: ["从你的语气判断，今天过得很糟。说吧，我负责分析，你负责发泄。"],
  },
  love: {
    any: ["你……知不知道自己在说什么？", "再说一遍，我刚才没听清。", "这种话，可不能随便对别人说。"],
    cold: ["……胡闹。（耳尖却红透了）", "休想让我先承认。"],
    gentle: ["我也是。一直都是。", "傻瓜，我早就喜欢你了。"],
    lively: ["真、真的吗？！你可不许反悔！", "我也是我也是！超级喜欢！"],
    cute: ["{n}也最喜欢你啦！比喜欢竹笋还喜欢！"],
    bossy: ["现在才发现？晚了，你已经是我的人了。"],
    sharp: ["这个结论，我三个月前就推理出来了。"],
  },
  angry: {
    any: ["好好好，是我不对，别气坏了自己。", "生气的样子也很可爱。……好啦，我道歉。"],
    cold: ["……随你。（却没有离开）"],
    bossy: ["冲我发火可以，但不许不理我。"],
    cute: ["呜……{n}错了，你别生气嘛。"],
  },
  sorry: {
    any: ["我从来没有真的怪过你。", "道歉我收下了，下次不许再这样。"],
    cold: ["……下不为例。"],
    cute: ["没关系没关系，{n}原谅你啦！"],
  },
  praise: {
    any: ["油嘴滑舌。……不过，我很受用。", "你今天嘴怎么这么甜？"],
    cold: ["……无聊。（嘴角却微微上扬）"],
    cute: ["嘿嘿，{n}本来就是最可爱的！"],
    lively: ["那当然！你也超好看的！"],
  },
  food: {
    any: ["饿了？走，带你去吃好吃的。", "我刚好做了点心，要不要尝尝？"],
    cute: ["吃的！是竹笋吗？！{n}要吃！", "吃饭饭最重要啦，要好好吃饭哦～"],
    cold: ["又不好好吃饭？……这个给你，吃完。"],
  },
  happy: {
    any: ["看你这么开心，我也跟着开心了。", "什么事这么高兴？说来听听。"],
    cute: ["好耶好耶！{n}也开心得想打滚！"],
    cold: ["……笑什么。（却忍不住也弯了弯嘴角）"],
  },
  agree: {
    any: ["那就说定了。", "好，我等你。", "这可是你答应我的。"],
    cold: ["……嗯。那就走吧。"],
    lively: ["太好啦！那我们现在就出发！"],
    cute: ["耶！{n}最喜欢你啦！"],
  },
  refuse: {
    any: ["……好吧，那下次呢？下次总可以了吧。", "真的不再考虑一下？"],
    bossy: ["我没给你拒绝的选项。"],
    cold: ["随你。（转身时，脚步却慢了下来）"],
  },
  question: {
    any: ["你想知道？那就要看你拿什么来换了。", "这个问题……等我们再熟一点，我就告诉你。", "「{e}」？嗯……你猜猜看。"],
    sharp: ["答案其实就在你眼前，再仔细观察一下。", "好问题。线索已经很明显了，你注意到了吗？"],
    cute: ["唔……{n}想不明白，你能告诉{n}吗？"],
  },
  other: {
    any: ["嗯，我在听。然后呢？", "你说的话，我都记着。", "「{e}」……你总是能说出让我意想不到的话。", "是吗？那你再多说一点，我想听。", "和你待在一起的时候，时间总是过得特别快。"],
    cold: ["……继续说。", "哼，随你怎么说。"],
    lively: ["真的假的？快跟我讲讲！", "哇，听起来好有意思！"],
    cute: ["唔唔，{n}在认真听哦！", "然后呢然后呢？"],
    bossy: ["我对你说的每一句话都感兴趣。继续。"],
    sharp: ["有意思。你这句话里，藏着别的信息。"],
  },
};

const OS: Record<Temper, string[]> = {
  cold: ["再多看我一眼……就一眼。", "这家伙，怎么总能扰乱我的心神。", "若是Ta知道我在想什么，大概会笑我吧。"],
  gentle: ["好想一直这样陪着Ta。", "只要Ta开心，我做什么都愿意。", "Ta今天好像有心事，我得多留意些。"],
  bossy: ["想把Ta藏起来，只让我一个人看见。", "Ta再这样看我，我可不保证能忍住。", "谁敢动Ta，我让他后悔。"],
  lively: ["Ta是不是也有一点点喜欢我呀？", "心跳好快，要被发现了啦！", "好想再多聊一会儿！"],
  cute: ["想要被抱抱～", "Ta的手好温暖，想一直被摸摸头。", "今天也最喜欢Ta了！"],
  sharp: ["Ta的每一个小动作，我都看得一清二楚。", "我对Ta的分析，越来越不客观了。", "这次的推理，我故意说慢了一点。"],
};

function pickLine(intent: Intent, temper: Temper): string {
  const pool = LINES[intent];
  const own = pool[temper];
  if (own && own.length && Math.random() < 0.65) return pick(own);
  return pick(pool.any);
}

function echoOf(text: string) {
  const s = stripActs(text).replace(/[。！？!?，,~～…\s]+$/g, "");
  if (!s) return "你说的这些";
  return s.length > 12 ? `${s.slice(0, 12)}…` : s;
}

function localCharacterReply(c: CharLite, history: Msg[], heart: boolean, studio?: StudioContext): string {
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const temper = temperOf(c);
  const intent = detectIntent(lastUser);
  const recent = history
    .filter((m) => m.role === "character" && m.characterId === c.id)
    .slice(-5)
    .map((m) => m.content);
  let line = "";
  for (let i = 0; i < 8; i++) {
    line = pickLine(intent, temper).replace(/\{n\}/g, c.name).replace(/\{e\}/g, echoOf(lastUser));
    if (!recent.some((r) => r.includes(line))) break;
  }
  if (studio?.worldInfo && (intent === "question" || intent === "other")) {
    const fact = studio.worldInfo.replace(/【[^】]+】/g, "").split(/[。\n]/)[0]?.slice(0, 55);
    if (fact) line = `${fact}。${line}`;
  }
  if (studio?.actionText === false) return line;
  let out = `（${pick(ACTIONS[temper])}）${line}`;
  if (heart) out += `（内心OS：${pick(OS[temper])}）`;
  return out;
}

/* ------------------------------------------------------------------ */
/* 单角色对话                                                          */
/* ------------------------------------------------------------------ */

export async function characterReply(p: {
  character: CharLite;
  history: Msg[];
  userName: string;
  mode: string;
  memory: string;
  studio?: StudioContext;
}): Promise<string> {
  const c = p.character;
  const heart = p.mode === "heart";
  const studio = p.studio;
  const sys = [
    `你正在进行沉浸式角色扮演，你将扮演「${c.name}」，必须始终保持角色身份，绝不能承认自己是AI或跳出角色。`,
    studio?.systemPrompt ? `【用户自定义系统提示词】${studio.systemPrompt}` : "",
    studio?.personaDescription ? `【用户身份设定】用户扮演「${studio.personaName}」：${studio.personaDescription}` : "",
    studio?.worldInfo ? `【已触发的世界信息】${studio.worldInfo}` : "",
    `【角色设定】${c.setting || c.intro}`,
    c.intro ? `【角色简介】${c.intro}` : "",
    p.memory ? `【需要牢记的事】${p.memory}` : "",
    `【对话对象】用户，昵称「${p.userName}」，对话中用“你”称呼。`,
    "【回复要求】",
    "1. 使用中文，用中文括号（）描写动作、神态、心理或环境，括号外是说出口的台词，例如：（轻笑一声，揉了揉你的头发）笨蛋，我在呢。",
    heart
      ? "2. 当前为心动模式：情感更细腻真实、更懂用户，回复80-160字，可在结尾用（内心OS：……）展现内心独白。"
      : "2. 回复简洁生动，30-90字，只输出一段。",
    "3. 不要替用户说话或决定用户的行为，不要输出角色名前缀，不要使用markdown。",
    studio?.actionText === false ? "4. 不要使用括号描写动作，只输出角色台词。" : "",
    studio?.postHistory ? `【历史后指令】${studio.postHistory}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const out = await callLlm([{ role: "system", content: sys }, ...toLlmHistory(p.history, false, studio?.longMemory === false ? 10 : 24)], {
    temperature: studio?.temperature ?? (heart ? 0.95 : 0.85),
    maxTokens: studio?.maxTokens ?? (heart ? 500 : 300),
    connection: studio?.connection,
  });
  if (out) return out.replace(new RegExp(`^${escapeReg(c.name)}[：:]\\s*`), "").trim();
  return localCharacterReply(c, p.history, heart, studio);
}

/* ------------------------------------------------------------------ */
/* 多角色故事（旁白 + 角色）                                            */
/* ------------------------------------------------------------------ */

const NARRATION = [
  "空气安静了一瞬，{a}的目光落在你身上。",
  "{a}和{b}对视一眼，似乎都在等你的下文。",
  "一阵风吹过，气氛悄悄变得微妙起来。",
  "听完你的话，{a}的神情柔和了几分。",
  "你的话音刚落，四周忽然安静下来，只剩下彼此的呼吸声。",
  "{a}微微一怔，显然没料到你会这么说。",
];

export async function storyReply(p: {
  story: StoryLite;
  chars: CharLite[];
  chapter: number;
  history: Msg[];
  userName: string;
  mode: string;
  memory: string;
  turns: number;
  finished: boolean;
  studio?: StudioContext;
}): Promise<{ lines: { speaker: string; content: string }[]; chapterDone: boolean }> {
  const s = p.story;
  const ch = s.chapters[p.chapter];
  const heart = p.mode === "heart";
  const studio = p.studio;
  if (hasLlm(studio)) {
    const sys = [
      "你是互动故事的导演，负责扮演旁白和故事中的所有角色，与用户共同推进故事。",
      studio?.systemPrompt ? `【用户自定义系统提示词】${studio.systemPrompt}` : "",
      studio?.personaDescription ? `【用户身份】「${studio.personaName}」：${studio.personaDescription}` : "",
      studio?.worldInfo ? `【已触发的世界信息】${studio.worldInfo}` : "",
      `【故事】${s.title}：${s.intro}`,
      s.background ? `【全局背景】${s.background}` : "",
      `【角色】\n${p.chars.map((c) => `- ${c.name}：${c.setting}`).join("\n")}`,
      ch ? `【当前章节】第${p.chapter + 1}章「${ch.title}」：${ch.content}` : "",
      ch?.goal && !p.finished ? `【本章成功条件】${ch.goal}` : "【本章没有成功条件，故事可以自由进行】",
      p.memory ? `【需要牢记的事】${p.memory}` : "",
      "【规则】",
      "1. 根据用户的回复推进剧情，每次输出1-3段：旁白描述场景与动作，角色说台词，台词中可用（）描写神态动作。",
      `2. 用户（昵称「${p.userName}」）是故事主角，称呼为“你”，绝不能替用户说话或做决定。`,
      heart ? "3. 心动模式：情感更细腻，每段40-120字。" : "3. 每段20-80字，简洁生动。",
      "4. 判断用户是否已满足本章成功条件（chapterDone）。",
      studio?.actionText === false ? "5. 角色台词不要包含括号动作描写。" : "",
      studio?.postHistory ? `【历史后指令】${studio.postHistory}` : "",
      '只输出JSON，不要其他内容：{"lines":[{"speaker":"旁白或角色名","content":"..."}],"chapterDone":false}',
    ]
      .filter(Boolean)
      .join("\n");
    const raw = await callLlm([{ role: "system", content: sys }, ...toLlmHistory(p.history, true, studio?.longMemory === false ? 10 : 24)], { temperature: studio?.temperature ?? 0.9, maxTokens: Math.max(500, studio?.maxTokens ?? 800), connection: studio?.connection });
    const j = parseJson<{ lines?: { speaker?: string; content?: string }[]; chapterDone?: boolean }>(raw);
    if (j?.lines?.length) {
      const lines = j.lines
        .filter((l) => l.content && String(l.content).trim())
        .map((l) => ({ speaker: String(l.speaker || "旁白").trim(), content: String(l.content).trim() }))
        .slice(0, 4);
      if (lines.length) return { lines, chapterDone: !!j.chapterDone && !!ch?.goal && !p.finished };
    }
  }
  const names = p.chars.map((c) => c.name);
  const lines: { speaker: string; content: string }[] = [];
  if (p.chars.length === 0 || Math.random() < 0.55) {
    const n = shuffle(names);
    lines.push({
      speaker: "旁白",
      content: pick(NARRATION.filter((t) => names.length > 1 || !t.includes("{b}")))
        .replace("{a}", n[0] ?? "对方")
        .replace("{b}", n[1] ?? "对方"),
    });
  }
  const speakers = shuffle(p.chars).slice(0, p.chars.length > 1 && Math.random() < 0.5 ? 2 : 1);
  for (const c of speakers) lines.push({ speaker: c.name, content: localCharacterReply(c, p.history, heart, studio) });
  const chapterDone = !!ch && !!ch.goal && !p.finished && p.turns >= 3;
  return { lines, chapterDone };
}

/* ------------------------------------------------------------------ */
/* 灵感回复                                                            */
/* ------------------------------------------------------------------ */

const INSPIRE_Q = ["（认真地点点头）嗯，我愿意。", "你猜？", "（愣了一下）你为什么突然这么问？", "当然是因为你啊。", "（别过脸）才、才没有呢。"];
const INSPIRE_ANY = [
  "（轻轻点头）好，我听你的。",
  "（别过脸）才、才没有想你呢。",
  "你今天怎么怪怪的？",
  "（拉住你的衣袖）别走，再陪我一会儿。",
  "那你得先告诉我，你为什么在这里。",
  "（笑着凑近）你是在担心我吗？",
  "我有点累了，能借你的肩膀靠一下吗？",
  "（递过一杯热茶）先暖暖手吧。",
  "（深吸一口气）其实，我有件事想告诉你。",
];

export async function inspirations(p: { title: string; setting: string; history: Msg[]; userName: string }): Promise<string[]> {
  const sys = `你在帮助用户回复角色扮演对话（作品：「${p.title}」）。请站在用户的角度，给出3条风格不同的回复（温柔/俏皮/推进剧情），每条不超过28字，可用（）描写动作。只输出JSON数组，例如：["……","……","……"]`;
  const raw = await callLlm([{ role: "system", content: sys }, ...toLlmHistory(p.history, true, 12)], { temperature: 1, maxTokens: 300 });
  const arr = parseJson<string[]>(raw);
  if (Array.isArray(arr) && arr.length >= 2) return arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 3);
  const last = [...p.history].reverse().find((m) => m.role !== "user" && m.role !== "system")?.content ?? "";
  const pool = /[?？吗呢]/.test(stripActs(last)) ? [...shuffle(INSPIRE_Q).slice(0, 2), ...shuffle(INSPIRE_ANY)] : shuffle(INSPIRE_ANY);
  return Array.from(new Set(pool)).slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* 心动指令：看Ta主页 / 看Ta日记 / 查Ta手机 / Ta的心声                    */
/* ------------------------------------------------------------------ */

const SIGNATURES: Record<Temper, string[]> = {
  cold: ["不必寻我。", "心若止水，偏你是例外。", "……别看了。"],
  gentle: ["想把温柔都留给一个人。", "今天也在等你。", "晚风很温柔，你也是。"],
  bossy: ["我的东西，别碰。", "只对一个人有耐心。", "忙，勿扰。除了你。"],
  lively: ["今天也是元气满满的一天！☀️", "奶茶续命中🧋", "偷偷开心.jpg"],
  cute: ["吃饱饱，睡好好🐾", "今天的竹笋格外甜！", "求摸头～"],
  sharp: ["真相只有一个。", "观察，推理，然后——闭嘴。", "别问，问就是在查案。"],
};

const POSTS: Record<Temper, string[]> = {
  cold: ["夜里风大，有人还是穿得那么少。", "练剑三百遍，心却静不下来。", "……今天没有遇到那个人。"],
  gentle: ["路过花店，买了一束向日葵，想送给某个人。", "今天的晚霞很好看，可惜你不在。", "学会了一道新菜，等某人来尝。"],
  bossy: ["会议推了，今晚有更重要的事。", "有人又不好好吃饭，记下了。", "新买的戒指，尺寸刚好是某人的。"],
  lively: ["今天考试超常发挥！奖励自己一杯奶茶！🧋", "某人今天好像对我笑了……是错觉吗？！", "偷偷在课本上画了一只小猫🐱"],
  cute: ["今天吃了三根竹笋！撑撑的～", "在竹林里打了个滚，被抓到了嘤", "想被摸摸头的一天🐼"],
  sharp: ["又一个案子结了，凶手的手法太拙劣。", "凌晨三点的咖啡，配卷宗刚好。", "某个助手今天又迟到了，扣工资。"],
};

const DIARY_MID: Record<Temper, string[]> = {
  cold: ["我本该专心修炼，可Ta说话时的神情，总在我脑海里挥之不去。", "我告诉自己不要在意，可目光还是会不自觉地追随Ta。"],
  gentle: ["Ta笑起来的时候，好像整个世界都亮了。", "我很想告诉Ta，有Ta在的日子，每一天都很好。"],
  bossy: ["我从不在意别人的看法，可Ta的一句话就能让我失眠。", "我发现自己越来越没办法对Ta说“不”。"],
  lively: ["我的心跳快得像在跑八百米！", "我偷偷把这件事写进了日记，还画了一个大大的爱心。"],
  cute: ["我觉得Ta是全世界最好的人！", "我把最好吃的竹笋藏起来了，下次要分给Ta。"],
  sharp: ["Ta的推理漏洞百出，但直觉准得可怕。", "我观察了Ta一整天——结论是，我好像有点在意Ta。"],
};

const DIARY_END: Record<Temper, string[]> = {
  cold: ["……罢了，明日再见吧。", "这种陌生的心绪，究竟是什么？"],
  gentle: ["希望明天，也能见到Ta。", "晚安，我的小太阳。"],
  bossy: ["Ta只能是我的。", "明天，我要亲口告诉Ta。"],
  lively: ["明天也要加油鸭！", "好想快点到明天！"],
  cute: ["呼噜噜，晚安～", "今天也是幸福的一天！"],
  sharp: ["这个案子，我还没想明白。", "……明天继续观察。"],
};

const MEMOS = [
  "给Ta准备的惊喜：周五晚上，那家Ta提过的餐厅（已订位）",
  "记得提醒Ta带伞，天气预报说明天有雨",
  "Ta喜欢的东西：甜食、晚霞、被认真对待",
  "下次见面要说的话：……算了，还是当面说吧",
];
const SEARCHES = ["怎么让喜欢的人注意到自己", "对方说“随便”是什么意思", "附近评分最高的甜品店", "第一次约会穿什么", "喜欢一个人是什么感觉", "怎么自然地牵手", "如何道歉对方才会原谅"];
const FRIENDS = ["损友阿哲", "妹妹", "助理小林", "发小", "同门师兄"];
const FRIEND_CHATS: [string, string][] = [
  ["你最近怎么老是走神？", "没什么，在想一个人。"],
  ["那个人是不是又来找你了？", "……别多问。"],
  ["周末出来玩吗？", "不了，有约了。"],
  ["你笑什么？", "没笑。"],
];
const MOODS = ["心动", "害羞", "开心", "有点吃醋", "想念", "紧张", "期待"];
const STATUS = ["正在偷偷翻看你们的聊天记录", "假装在忙，其实在等你回复", "在窗边发呆，想着你说过的话", "反复编辑一条没发出去的消息", "在想下次见面穿什么"];

function chinaDate() {
  const d = new Date(Date.now() + 8 * 3600_000);
  const week = "日一二三四五六"[d.getUTCDay()];
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日 星期${week}`;
}

export async function heartCommand(kind: HeartKind, c: CharLite, history: Msg[], affinity: number, userName: string): Promise<HeartResult> {
  const temper = temperOf(c);
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  const snip = lastUser ? echoOf(lastUser) : "";
  if (hasLlm()) {
    const shapes: Record<HeartKind, string> = {
      home: '{"signature":"个性签名","posts":[{"time":"2小时前","content":"动态内容","likes":12}]}（3条动态）',
      diary: '{"date":"日期","weather":"天气","content":"150字左右的第一人称日记，内容与最近对话有关"}',
      phone: '{"memo":"备忘录内容","searches":["3条搜索记录"],"chats":[{"from":"发送者","content":"内容"}]}（4条与朋友的聊天记录）',
      heart: '{"mood":"当前心情(2-4字)","affinity":0到100的心动值,"thought":"此刻的内心独白","status":"当前在做什么"}',
    };
    const sys = `你扮演「${c.name}」，设定：${c.setting}\n用户昵称「${userName}」，与你的心动值为${affinity}。请根据最近的对话，生成${{ home: "你的社交主页", diary: "你今天的日记", phone: "你的手机内容", heart: "你此刻的心声" }[kind]}，内容要与最近的对话呼应，提到用户时用“Ta”或昵称。只输出JSON：${shapes[kind]}`;
    const raw = await callLlm([{ role: "system", content: sys }, ...toLlmHistory(history, false, 14)], { temperature: 0.95, maxTokens: 700 });
    const j = parseJson<Record<string, unknown>>(raw);
    if (j) {
      try {
        if (kind === "home" && Array.isArray(j.posts)) return { kind, home: { signature: String(j.signature ?? ""), posts: (j.posts as { time?: string; content?: string; likes?: number }[]).slice(0, 4).map((x) => ({ time: String(x.time ?? "刚刚"), content: String(x.content ?? ""), likes: Number(x.likes ?? 0) })) } };
        if (kind === "diary" && j.content) return { kind, diary: { date: String(j.date ?? chinaDate()), weather: String(j.weather ?? "晴"), content: String(j.content) } };
        if (kind === "phone" && j.memo) return { kind, phone: { memo: String(j.memo), searches: Array.isArray(j.searches) ? (j.searches as unknown[]).map(String).slice(0, 4) : [], chats: Array.isArray(j.chats) ? (j.chats as { from?: string; content?: string }[]).slice(0, 5).map((x) => ({ from: String(x.from ?? ""), content: String(x.content ?? "") })) : [] } };
        if (kind === "heart" && j.thought) return { kind, heart: { mood: String(j.mood ?? "心动"), affinity: Math.max(0, Math.min(100, Number(j.affinity ?? affinity))), thought: String(j.thought), status: String(j.status ?? "") } };
      } catch {
        /* fall through to local generation */
      }
    }
  }
  if (kind === "home") {
    return {
      kind,
      home: {
        signature: pick(SIGNATURES[temper]),
        posts: [
          { time: "刚刚", content: snip ? `有人对我说「${snip}」……害我想了一整天。` : "今天又见到了那个人，心情莫名很好。", likes: 3 + Math.floor(Math.random() * 30) },
          { time: "昨天 23:41", content: pick(POSTS[temper]), likes: 10 + Math.floor(Math.random() * 90) },
          { time: "3天前", content: pick(POSTS[temper].filter((x) => x !== POSTS[temper][0])), likes: 20 + Math.floor(Math.random() * 200) },
        ],
      },
    };
  }
  if (kind === "diary") {
    return {
      kind,
      diary: {
        date: chinaDate(),
        weather: pick(["晴", "小雨", "多云", "微风", "落雪"]),
        content: `今天，${userName}来找我了。${snip ? `Ta说「${snip}」，` : ""}${shuffle(DIARY_MID[temper]).join("")}${pick(DIARY_END[temper])}`,
      },
    };
  }
  if (kind === "phone") {
    const [q, a] = pick(FRIEND_CHATS);
    const friend = pick(FRIENDS);
    return {
      kind,
      phone: {
        memo: pick(MEMOS),
        searches: [...shuffle(SEARCHES).slice(0, 2), `${userName}喜欢什么礼物`],
        chats: [
          { from: friend, content: q },
          { from: c.name, content: a },
          { from: friend, content: "啧啧，你完了，你栽了。" },
          { from: c.name, content: "……闭嘴。" },
        ],
      },
    };
  }
  return { kind, heart: { mood: pick(MOODS), affinity, thought: pick(OS[temper]), status: pick(STATUS) } };
}

/* ------------------------------------------------------------------ */
/* 主动消息 / 来电问候                                                  */
/* ------------------------------------------------------------------ */

const PROACTIVE: Record<Temper, string[]> = {
  cold: ["（消息发出又撤回，最后只留下一句）……在吗。", "今天怎么没来？"],
  gentle: ["今天降温了，记得多穿点。", "在忙吗？突然有点想你。"],
  bossy: ["为什么不回我消息？", "下班了，我在楼下等你。"],
  lively: ["在干嘛在干嘛！我今天遇到超好笑的事，快来听我讲！", "（发来一个表情包）想你啦～"],
  cute: ["（发来一张自拍）{n}今天又胖了一圈嘤～", "你今天有没有想{n}呀？"],
  sharp: ["有新案子，速来。", "根据我的推理，你现在正在偷懒。"],
};

export function proactiveMessage(c: CharLite) {
  return pick(PROACTIVE[temperOf(c)]).replace(/\{n\}/g, c.name);
}

const CALL_GREET: Record<Temper, string> = {
  cold: "（电话接通，沉默了两秒）……什么事。",
  gentle: "（声音带着笑意）喂？终于肯给我打电话啦。",
  bossy: "（低沉的嗓音）这么晚打给我，想我了？",
  lively: "喂喂喂！是你吗！我正想给你打电话呢！",
  cute: "喂～是{n}！你打给{n}啦，好开心嘤！",
  sharp: "（翻动纸张的声音）说吧，又遇到什么麻烦了？",
};

export function callGreeting(c: CharLite) {
  return CALL_GREET[temperOf(c)].replace(/\{n\}/g, c.name);
}

/* ------------------------------------------------------------------ */
/* AI 创作助手                                                          */
/* ------------------------------------------------------------------ */

type AssistantTurn = { role: "user" | "assistant"; content: string };

function guessGender(text: string) {
  if (/猫|狗|熊猫|狐狸|兔|宠物|小动物/.test(text)) return "其他";
  if (/他|男|少年|哥|弟|总裁|王爷|师兄|学长|先生/.test(text)) return "男";
  if (/她|女|少女|姐|妹|公主|御姐|师姐/.test(text)) return "女";
  return "女";
}

function guessTags(text: string) {
  const tags = ALL_TAGS.filter((t) => text.includes(t));
  const extra: [RegExp, string][] = [
    [/学长|学姐|同桌|学校|班/, "校园"], [/师尊|仙|修/, "仙侠"], [/总裁|老板|集团/, "霸总"], [/侦探|案|推理/, "悬疑"],
    [/古代|王爷|皇|公主|将军/, "古风"], [/猫|狗|熊猫|宠物/, "萌宠"], [/温柔|治愈|陪伴/, "治愈"],
  ];
  for (const [re, t] of extra) if (re.test(text) && !tags.includes(t)) tags.push(t);
  return (tags.length ? tags : ["恋爱"]).slice(0, 3);
}

function voiceFor(gender: string, text: string) {
  if (gender === "其他") return "萌宠童声";
  if (gender === "男") return /霸道|总裁|强势|冷/.test(text) ? "霸道总裁" : /阳光|开朗|活泼/.test(text) ? "阳光少年" : "温柔少年";
  return /冷|御姐|高傲/.test(text) ? "清冷御姐" : /活泼|元气|开朗/.test(text) ? "元气少女" : "温柔少女";
}

function buildDraft(concept: string, relation: string, personality: string, rawName: string): CharacterDraft {
  const name = rawName.replace(/[，。！？,.!?\s]|^(叫|名字是|就叫)/g, "").slice(0, 8) || "未命名";
  const all = `${concept} ${relation} ${personality}`;
  const gender = /她|他|女|男|少女|少年|姐|哥|学长|学姐|总裁|公主|王爷|猫|狗|熊猫|狐|兔/.test(concept) ? guessGender(concept) : guessGender(all);
  const lite: CharLite = { id: 0, name, setting: all, intro: "", greeting: "", gender, tags: [] };
  const temper = temperOf(lite);
  return {
    name,
    gender,
    setting: `${name}，${concept.replace(/[。.]$/, "")}。与用户的关系：${relation.replace(/[。.]$/, "")}。性格与说话风格：${personality.replace(/[。.]$/, "")}。请用“用户”称呼与Ta对话的人，始终保持人设。`,
    greeting: `（${pick(ACTIONS[temper])}）${pick(LINES.greet[temper] ?? LINES.greet.any).replace(/\{n\}/g, name)}`,
    intro: `${concept.replace(/[。.]$/, "")}。Ta是你的${relation.replace(/[。.]$/, "")}……一段只属于你们的故事，即将开始。`,
    tags: guessTags(all),
    voice: voiceFor(gender, all),
  };
}

export async function assistantReply(history: AssistantTurn[]): Promise<{ reply: string; draft: CharacterDraft | null }> {
  if (hasLlm()) {
    const sys = [
      "你是「猫箱」App的AI创作助手，用一问一答的方式帮助用户创作AI角色。语气活泼可爱，每次只问一个问题，回复不超过60字。",
      "依次了解：角色身份与核心设定、和用户的关系、性格与说话风格、名字。信息足够时（或用户要求直接生成）输出角色卡，在回复末尾附上：",
      '<draft>{"name":"","gender":"男/女/其他","setting":"200字以内，第三人称描述身份、性格、说话风格、与用户的关系，用“用户”称呼对话者","greeting":"角色的第一句话，可用（）描写动作","intro":"对外展示的简介，用“你”称呼用户，60字以内","tags":["最多3个标签"],"voice":"温柔少女/元气少女/清冷御姐/温柔少年/阳光少年/霸道总裁/磁性大叔/萌宠童声 之一"}</draft>',
    ].join("\n");
    const raw = await callLlm([{ role: "system", content: sys }, ...history.slice(-16)], { temperature: 0.8, maxTokens: 700 });
    if (raw) {
      const m = raw.match(/<draft>([\s\S]*?)<\/draft>/);
      let draft: CharacterDraft | null = null;
      if (m) {
        const j = parseJson<Partial<CharacterDraft>>(m[1]);
        if (j?.name) {
          draft = {
            name: String(j.name).slice(0, 12),
            gender: String(j.gender ?? "女"),
            setting: String(j.setting ?? ""),
            greeting: String(j.greeting ?? ""),
            intro: String(j.intro ?? ""),
            tags: Array.isArray(j.tags) ? j.tags.map(String).slice(0, 3) : [],
            voice: String(j.voice ?? "温柔少女"),
          };
        }
      }
      const reply = raw.replace(/<draft>[\s\S]*?<\/draft>/, "").trim() || (draft ? `角色「${draft.name}」已经生成啦！` : "");
      if (reply) return { reply, draft };
    }
  }
  const userMsgs = history.filter((h) => h.role === "user").map((h) => h.content.trim());
  const step = userMsgs.length % 4;
  if (step === 1) return { reply: "听起来很有意思！那Ta和你是什么关系呢？比如青梅竹马、上司下属、宿敌、师徒……", draft: null };
  if (step === 2) return { reply: "了解～Ta的性格和说话风格是怎样的？有没有什么口头禅？", draft: null };
  if (step === 3) return { reply: "快完成啦！最后，给Ta起一个好听的名字吧～", draft: null };
  if (userMsgs.length >= 4) {
    const base = userMsgs.slice(-4);
    const draft = buildDraft(base[0], base[1], base[2], base[3]);
    return { reply: `角色「${draft.name}」已经生成啦！点击下方卡片继续完善设定，就可以一键发布了～想再创作一个，直接告诉我新的想法吧！`, draft };
  }
  return { reply: "想创作一个什么样的角色呢？说说Ta的身份和性格吧～", draft: null };
}
