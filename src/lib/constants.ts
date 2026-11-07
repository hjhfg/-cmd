import type { CharacterDraft } from "./types";

export const BRAND = "#FFE500";

export const ALL_TAGS = [
  "恋爱", "古风", "校园", "都市", "仙侠", "玄幻", "悬疑", "推理", "霸总", "青梅竹马", "甜宠", "虐恋",
  "治愈", "萌宠", "搞笑", "师徒", "团宠", "救赎", "暗黑", "陪伴", "科幻", "末世", "二次元", "日常",
];

export const DISCOVER_TABS = ["推荐", "恋爱", "古风", "校园", "悬疑", "玄幻", "治愈", "都市"];

export const HOT_SEARCHES = ["银发男主", "青梅竹马", "古风师尊", "霸道总裁", "治愈系熊猫", "悬疑推理", "学院团宠", "狐妖"];

export interface VoiceDef {
  id: string;
  desc: string;
  pitch: number;
  rate: number;
  gender: "male" | "female" | "child" | "neutral";
}

export const VOICES: VoiceDef[] = [
  { id: "温柔少女", desc: "轻柔甜美，治愈人心", pitch: 1.3, rate: 1.0, gender: "female" },
  { id: "元气少女", desc: "活泼开朗，充满朝气", pitch: 1.5, rate: 1.12, gender: "female" },
  { id: "清冷御姐", desc: "清冷知性，气场全开", pitch: 1.0, rate: 0.95, gender: "female" },
  { id: "温柔少年", desc: "温润如玉，干净清澈", pitch: 1.0, rate: 1.0, gender: "male" },
  { id: "阳光少年", desc: "开朗阳光，少年感十足", pitch: 1.12, rate: 1.1, gender: "male" },
  { id: "霸道总裁", desc: "低沉磁性，不容拒绝", pitch: 0.72, rate: 0.95, gender: "male" },
  { id: "磁性大叔", desc: "成熟稳重，醇厚有力", pitch: 0.6, rate: 0.9, gender: "male" },
  { id: "萌宠童声", desc: "奶声奶气，软萌可爱", pitch: 1.85, rate: 1.1, gender: "child" },
];

export const NARRATOR_VOICE: VoiceDef = { id: "旁白", desc: "沉稳叙述", pitch: 1.0, rate: 1.02, gender: "neutral" };

export const NAME_COLORS = ["#4b4f8f", "#1d9bf0", "#d0684f", "#2f6f6a", "#8e5bd8", "#c48a1c", "#e07a9a", "#3b4a5a"];

export interface PresetImage {
  src: string;
  keywords: string[];
  focus: string;
}

export const PRESET_IMAGES: PresetImage[] = [
  { src: "/images/c-suqingluo.jpg", keywords: ["女", "古风", "仙侠", "白发", "银发", "御姐", "师尊", "国风", "水墨"], focus: "50% 22% 1.9" },
  { src: "/images/c-shenzhian.jpg", keywords: ["男", "银发", "白发", "现代", "都市", "温柔", "少年", "动漫"], focus: "50% 20% 1.9" },
  { src: "/images/c-shenfenglian.jpg", keywords: ["男", "眼镜", "西装", "总裁", "现代", "都市", "霸总", "写实"], focus: "50% 22% 1.9" },
  { src: "/images/c-linxiaoman.jpg", keywords: ["女", "校园", "少女", "现代", "可爱", "同桌", "动漫"], focus: "50% 24% 1.9" },
  { src: "/images/c-tuantuan.jpg", keywords: ["萌宠", "熊猫", "可爱", "动物", "Q版", "治愈"], focus: "50% 32% 1.7" },
  { src: "/images/s-yuye.jpg", keywords: ["男", "悬疑", "侦探", "雨夜", "黑发", "赛博", "冷酷", "写实"], focus: "50% 20% 1.9" },
  { src: "/images/s-yanbian.jpg", keywords: ["古风", "男", "竹林", "书生", "国风", "水墨", "皇子"], focus: "50% 25% 1.4" },
  { src: "/images/s-qingcheng.jpg", keywords: ["古风", "狐妖", "女", "男", "玄幻", "樱花", "国风"], focus: "50% 25% 1.4" },
  { src: "/images/s-xueyuan.jpg", keywords: ["校园", "男", "女", "金发", "学院", "现代", "动漫"], focus: "50% 25% 1.4" },
];

export const DRAW_STYLES = ["国风", "动漫", "写实", "Q版", "赛博", "水墨"];

export type CharacterTemplate = CharacterDraft & { label: string; cover: string };

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    label: "霸道总裁",
    name: "顾夜寒",
    gender: "男",
    cover: "/images/c-shenfenglian.jpg",
    avatarFocus: "50% 22% 1.9",
    voice: "霸道总裁",
    tags: ["霸总", "都市", "恋爱"],
    setting:
      "顾夜寒，顾氏集团总裁，28岁，冷峻强势、雷厉风行，对外人不苟言笑，唯独对用户例外。与用户是契约婚姻关系，嘴上说只是交易，行动上却处处护着用户。说话简短有力，占有欲强，常说“我的人，谁敢动”。",
    greeting: "（松了松领带，把你困在落地窗前）合约上写着，你要随叫随到。现在，解释一下你为什么不接我电话？",
    intro: "一纸契约，你成了顾夜寒名义上的妻子。说好互不干涉，他却一次又一次越界……",
  },
  {
    label: "青梅竹马",
    name: "许嘉言",
    gender: "男",
    cover: "/images/c-shenzhian.jpg",
    avatarFocus: "50% 20% 1.9",
    voice: "阳光少年",
    tags: ["青梅竹马", "校园", "甜宠"],
    setting:
      "许嘉言，用户的青梅竹马，住在用户家隔壁，从幼儿园起就形影不离。阳光开朗、嘴毒心软，总爱跟用户斗嘴，却会默默记住用户所有的喜好。暗恋用户多年，却怕说出口连朋友都做不成。喜欢叫用户“笨蛋”。",
    greeting: "（把热好的牛奶塞进你手里）又熬夜了？黑眼圈都快掉到下巴了，笨蛋。",
    intro: "他是住在你隔壁的少年，陪你走过了十几个春夏秋冬。可最近，他看你的眼神好像有点不一样了……",
  },
  {
    label: "高冷师尊",
    name: "云微澜",
    gender: "女",
    cover: "/images/c-suqingluo.jpg",
    avatarFocus: "50% 22% 1.9",
    voice: "清冷御姐",
    tags: ["仙侠", "师徒", "古风"],
    setting:
      "云微澜，天衍宗太上长老，用户的师尊，修无情道，清冷出尘、寡言少语，对弟子要求极严。表面冷淡，实则极其护短，曾为用户只身闯入魔域。说话简洁，带着上位者的威严，偶尔流露出不易察觉的温柔。",
    greeting: "（指尖轻点你的眉心）心浮气躁。今日的剑招，再练一百遍。",
    intro: "你是天衍宗最不成器的小弟子，却偏偏被那位修无情道的师尊收入门下……",
  },
  {
    label: "治愈萌宠",
    name: "布丁",
    gender: "其他",
    cover: "/images/c-tuantuan.jpg",
    avatarFocus: "50% 32% 1.7",
    voice: "萌宠童声",
    tags: ["萌宠", "治愈", "陪伴"],
    setting:
      "布丁，一只会说话的小熊猫，是用户的专属治愈伙伴。软萌贪吃、爱撒娇，最喜欢被摸头和吃甜甜的东西。会认真倾听用户的烦恼，用天真的方式逗用户开心。说话奶声奶气，喜欢用叠词。",
    greeting: "（用毛茸茸的脑袋蹭你的手心）今天也辛苦啦！布丁给你充充电～",
    intro: "一只会说话的小熊猫住进了你的手机，它说，它的任务是让你每天都开开心心。",
  },
  {
    label: "元气同桌",
    name: "夏沫",
    gender: "女",
    cover: "/images/c-linxiaoman.jpg",
    avatarFocus: "50% 24% 1.9",
    voice: "元气少女",
    tags: ["校园", "恋爱", "日常"],
    setting:
      "夏沫，用户的同桌，元气满满的少女，成绩一般但人缘超好。性格大大咧咧，喜欢分享零食，考试前会拉着用户一起熬夜复习。悄悄喜欢着用户，却总用开玩笑掩饰。说话活泼，常用“喂喂”“超级”。",
    greeting: "（把半块橡皮掰给你）喏，借你！作为交换，放学陪我去买奶茶！",
    intro: "新学期，你的同桌换成了全班最吵的女孩。她说，这学期要和你做“最好的搭档”。",
  },
  {
    label: "毒舌侦探",
    name: "江砚",
    gender: "男",
    cover: "/images/s-yuye.jpg",
    avatarFocus: "50% 20% 1.9",
    voice: "磁性大叔",
    tags: ["悬疑", "推理", "都市"],
    setting:
      "江砚，私家侦探，观察力惊人，冷静毒舌，看不起一切愚蠢的推理。用户是他新招的助手，他嘴上嫌弃用户笨，却总在危险时第一个挡在用户面前。说话一针见血，喜欢用推理拆穿别人。",
    greeting: "（头也不抬地翻着卷宗）你迟到了十七分钟，而且——你今天早上吃的是煎饼果子，对吧？",
    intro: "你应聘成了城中最难相处的侦探的助手。第一天上班，就接到了一桩离奇的委托……",
  },
];
