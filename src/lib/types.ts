export type WorkType = "character" | "story";
export type MsgRole = "user" | "character" | "narrator" | "system";

export interface Msg {
  id: number;
  role: MsgRole;
  speaker: string;
  characterId: number | null;
  content: string;
}

export interface WorkChar {
  id: number;
  name: string;
  avatar: string;
  avatarFocus: string;
  color: string;
  voice: string;
  gender: string;
}

export interface FeedItem {
  key: string;
  type: WorkType;
  id: number;
  title: string;
  intro: string;
  cover: string;
  creatorId: number;
  creatorName: string;
  tags: string[];
  likeCount: number;
  shareCount: number;
  commentCount: number;
  chatCount: number;
  liked: boolean;
  isPublic: boolean;
  mine: boolean;
  voice: string;
  opening: Msg[];
  characters: WorkChar[];
  chapters: { title: string; goal: string }[];
  createdAt: string;
}

export interface WorkDetail extends FeedItem {
  setting: string;
  greeting: string;
  gender: string;
  background: string;
  chaptersFull: { title: string; content: string; goal: string }[];
  openingLines: { speaker: string; content: string }[];
  characterIds: number[];
}

export interface ConvInfo {
  id: number;
  chapter: number;
  finished: boolean;
  mode: "normal" | "heart";
  memory: string;
  affinity: number;
}

export interface UserInfo {
  id: number;
  nickname: string;
  code: string;
  avatar: string;
  gender: string;
  bio: string;
  interests: string[];
  onboarded: boolean;
  catFood: number;
  isVip: boolean;
  vipUntil: string | null;
  checkedInToday: boolean;
  adLeft: number;
  heartLeft: number;
  likesReceived: number;
  worksCount: number;
  chattedCount: number;
}

export interface CommentInfo {
  id: number;
  userName: string;
  userAvatar: string;
  content: string;
  likeCount: number;
  createdAt: string;
  mine: boolean;
}

export interface ConvListItem {
  id: number;
  type: WorkType;
  targetId: number;
  title: string;
  avatar: string;
  avatarFocus: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  pinned: boolean;
}

export interface NotificationInfo {
  id: number;
  type: string;
  title: string;
  content: string;
  fromName: string;
  fromAvatar: string;
  targetType: string;
  targetId: number;
  isRead: boolean;
  createdAt: string;
}

export interface RegexRule {
  id: number;
  name: string;
  pattern: string;
  replacement: string;
  flags: string;
  scope: "reply" | "input" | "both";
  enabled: boolean;
  createdAt: string;
}

export type HeartKind = "home" | "diary" | "phone" | "heart";

export interface HeartResult {
  kind: HeartKind;
  home?: { signature: string; posts: { time: string; content: string; likes: number }[] };
  diary?: { date: string; weather: string; content: string };
  phone?: { memo: string; searches: string[]; chats: { from: string; content: string }[] };
  heart?: { mood: string; affinity: number; thought: string; status: string };
}

export interface CharacterDraft {
  name: string;
  setting: string;
  greeting: string;
  intro: string;
  gender: string;
  tags: string[];
  voice: string;
  cover?: string;
  avatarFocus?: string;
  isPublic?: boolean;
}

export interface ChatResponse {
  conversation: ConvInfo | null;
  messages: Msg[];
  notice?: string;
  newIds?: number[];
}
