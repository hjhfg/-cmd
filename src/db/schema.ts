import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

export type OpeningLine = { speaker: string; content: string };
export type ChapterDef = { title: string; content: string; goal: string };

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull(),
    nickname: text("nickname").notNull(),
    code: text("code").notNull().default(""),
    avatar: text("avatar").notNull().default(""),
    gender: text("gender").notNull().default(""),
    bio: text("bio").notNull().default(""),
    interests: jsonb("interests").$type<string[]>().notNull().default([]),
    // Retained only for backward compatibility. The local app has no first-run
    // gender or interest onboarding flow, so every account is ready immediately.
    onboarded: boolean("onboarded").notNull().default(true),
    catFood: integer("cat_food").notNull().default(60),
    vipUntil: timestamp("vip_until", { withTimezone: true }),
    checkinDate: text("checkin_date").notNull().default(""),
    adDate: text("ad_date").notNull().default(""),
    adCount: integer("ad_count").notNull().default(0),
    heartDate: text("heart_date").notNull().default(""),
    heartCount: integer("heart_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_token_idx").on(t.token), uniqueIndex("users_token_uniq").on(t.token)],
);

export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull().default(""),
  avatarFocus: text("avatar_focus").notNull().default("50% 20% 1.6"),
  cover: text("cover").notNull().default(""),
  gender: text("gender").notNull().default("女"),
  setting: text("setting").notNull().default(""),
  greeting: text("greeting").notNull().default(""),
  intro: text("intro").notNull().default(""),
  voice: text("voice").notNull().default("温柔少女"),
  color: text("color").notNull().default("#4b4f8f"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  creatorId: integer("creator_id").notNull().default(0),
  creatorName: text("creator_name").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(true),
  standalone: boolean("standalone").notNull().default(true),
  likeCount: integer("like_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  chatCount: integer("chat_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  intro: text("intro").notNull().default(""),
  cover: text("cover").notNull().default(""),
  background: text("background").notNull().default(""),
  opening: jsonb("opening").$type<OpeningLine[]>().notNull().default([]),
  chapters: jsonb("chapters").$type<ChapterDef[]>().notNull().default([]),
  characterIds: jsonb("character_ids").$type<number[]>().notNull().default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  creatorId: integer("creator_id").notNull().default(0),
  creatorName: text("creator_name").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(true),
  likeCount: integer("like_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  chatCount: integer("chat_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    chapter: integer("chapter").notNull().default(0),
    finished: boolean("finished").notNull().default(false),
    mode: text("mode").notNull().default("normal"),
    memory: text("memory").notNull().default(""),
    personaId: integer("persona_id"),
    affinity: integer("affinity").notNull().default(10),
    lastMessage: text("last_message").notNull().default(""),
    lastAt: timestamp("last_at", { withTimezone: true }).notNull().defaultNow(),
    unread: integer("unread").notNull().default(0),
    pinned: boolean("pinned").notNull().default(false),
    proactiveAt: timestamp("proactive_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conversations_user_idx").on(t.userId)],
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull(),
    role: text("role").notNull(),
    speaker: text("speaker").notNull().default(""),
    characterId: integer("character_id"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId)],
);

export const likes = pgTable(
  "likes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("likes_user_idx").on(t.userId)],
);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  userId: integer("user_id").notNull().default(0),
  userName: text("user_name").notNull().default(""),
  userAvatar: text("user_avatar").notNull().default(""),
  content: text("content").notNull(),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull().default("system"),
  title: text("title").notNull().default(""),
  content: text("content").notNull().default(""),
  fromName: text("from_name").notNull().default(""),
  fromAvatar: text("from_avatar").notNull().default(""),
  targetType: text("target_type").notNull().default(""),
  targetId: integer("target_id").notNull().default(0),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const personas = pgTable("personas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  notes: text("notes").notNull().default(""),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promptPresets = pgTable("prompt_presets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  systemPrompt: text("system_prompt").notNull().default(""),
  postHistory: text("post_history").notNull().default(""),
  temperature: integer("temperature").notNull().default(90),
  maxTokens: integer("max_tokens").notNull().default(600),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lorebooks = pgTable("lorebooks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loreEntries = pgTable("lore_entries", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  keywords: text("keywords").notNull().default(""),
  content: text("content").notNull().default(""),
  constant: boolean("constant").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const regexRules = pgTable(
  "regex_rules",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    name: text("name").notNull().default("新规则"),
    pattern: text("pattern").notNull().default(""),
    replacement: text("replacement").notNull().default(""),
    flags: text("flags").notNull().default("g"),
    // reply: 只改写角色输出；input: 只改写你发出的文字；both: 两者都改写
    scope: text("scope").notNull().default("reply"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("regex_rules_user_idx").on(t.userId)],
);

export const userAiSettings = pgTable("user_ai_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  provider: text("provider").notNull().default("built-in"),
  baseUrl: text("base_url").notNull().default(""),
  model: text("model").notNull().default(""),
  encryptedKey: text("encrypted_key").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userExtensions = pgTable("user_extensions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  autoVoice: boolean("auto_voice").notNull().default(true),
  actionText: boolean("action_text").notNull().default(true),
  longMemory: boolean("long_memory").notNull().default(true),
  worldInfo: boolean("world_info").notNull().default(true),
  typingEffect: boolean("typing_effect").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type CharacterRow = typeof characters.$inferSelect;
export type StoryRow = typeof stories.$inferSelect;
export type ConversationRow = typeof conversations.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
