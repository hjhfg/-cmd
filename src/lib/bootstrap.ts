import { pool } from "@/db";
import { seedDatabase } from "./seed";

const DDL = `
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "token" text NOT NULL,
  "nickname" text NOT NULL,
  "code" text DEFAULT '' NOT NULL,
  "avatar" text DEFAULT '' NOT NULL,
  "gender" text DEFAULT '' NOT NULL,
  "bio" text DEFAULT '' NOT NULL,
  "interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "onboarded" boolean DEFAULT true NOT NULL,
  "cat_food" integer DEFAULT 60 NOT NULL,
  "vip_until" timestamp with time zone,
  "checkin_date" text DEFAULT '' NOT NULL,
  "ad_date" text DEFAULT '' NOT NULL,
  "ad_count" integer DEFAULT 0 NOT NULL,
  "heart_date" text DEFAULT '' NOT NULL,
  "heart_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "users_token_idx" ON "users" USING btree ("token");
ALTER TABLE "users" ALTER COLUMN "onboarded" SET DEFAULT true;
UPDATE "users" SET "onboarded" = true WHERE "onboarded" = false;
DELETE FROM "users" a USING "users" b WHERE a."token" = b."token" AND a."id" > b."id";
CREATE UNIQUE INDEX IF NOT EXISTS "users_token_uniq" ON "users" USING btree ("token");
CREATE TABLE IF NOT EXISTS "characters" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "avatar" text DEFAULT '' NOT NULL,
  "avatar_focus" text DEFAULT '50% 20% 1.6' NOT NULL,
  "cover" text DEFAULT '' NOT NULL,
  "gender" text DEFAULT '女' NOT NULL,
  "setting" text DEFAULT '' NOT NULL,
  "greeting" text DEFAULT '' NOT NULL,
  "intro" text DEFAULT '' NOT NULL,
  "voice" text DEFAULT '温柔少女' NOT NULL,
  "color" text DEFAULT '#4b4f8f' NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "creator_id" integer DEFAULT 0 NOT NULL,
  "creator_name" text DEFAULT '' NOT NULL,
  "is_public" boolean DEFAULT true NOT NULL,
  "standalone" boolean DEFAULT true NOT NULL,
  "like_count" integer DEFAULT 0 NOT NULL,
  "share_count" integer DEFAULT 0 NOT NULL,
  "comment_count" integer DEFAULT 0 NOT NULL,
  "chat_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "stories" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "intro" text DEFAULT '' NOT NULL,
  "cover" text DEFAULT '' NOT NULL,
  "background" text DEFAULT '' NOT NULL,
  "opening" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "chapters" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "character_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "creator_id" integer DEFAULT 0 NOT NULL,
  "creator_name" text DEFAULT '' NOT NULL,
  "is_public" boolean DEFAULT true NOT NULL,
  "like_count" integer DEFAULT 0 NOT NULL,
  "share_count" integer DEFAULT 0 NOT NULL,
  "comment_count" integer DEFAULT 0 NOT NULL,
  "chat_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "target_type" text NOT NULL,
  "target_id" integer NOT NULL,
  "chapter" integer DEFAULT 0 NOT NULL,
  "finished" boolean DEFAULT false NOT NULL,
  "mode" text DEFAULT 'normal' NOT NULL,
  "memory" text DEFAULT '' NOT NULL,
  "persona_id" integer,
  "affinity" integer DEFAULT 10 NOT NULL,
  "last_message" text DEFAULT '' NOT NULL,
  "last_at" timestamp with time zone DEFAULT now() NOT NULL,
  "unread" integer DEFAULT 0 NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "proactive_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "conversations_user_idx" ON "conversations" USING btree ("user_id");
CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversation_id" integer NOT NULL,
  "role" text NOT NULL,
  "speaker" text DEFAULT '' NOT NULL,
  "character_id" integer,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages" USING btree ("conversation_id");
CREATE TABLE IF NOT EXISTS "likes" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "target_type" text NOT NULL,
  "target_id" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "likes_user_idx" ON "likes" USING btree ("user_id");
CREATE TABLE IF NOT EXISTS "comments" (
  "id" serial PRIMARY KEY NOT NULL,
  "target_type" text NOT NULL,
  "target_id" integer NOT NULL,
  "user_id" integer DEFAULT 0 NOT NULL,
  "user_name" text DEFAULT '' NOT NULL,
  "user_avatar" text DEFAULT '' NOT NULL,
  "content" text NOT NULL,
  "like_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "type" text DEFAULT 'system' NOT NULL,
  "title" text DEFAULT '' NOT NULL,
  "content" text DEFAULT '' NOT NULL,
  "from_name" text DEFAULT '' NOT NULL,
  "from_avatar" text DEFAULT '' NOT NULL,
  "target_type" text DEFAULT '' NOT NULL,
  "target_id" integer DEFAULT 0 NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "personas" (
  "id" serial PRIMARY KEY, "user_id" integer NOT NULL, "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL, "avatar" text DEFAULT '' NOT NULL,
  "notes" text DEFAULT '' NOT NULL, "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "personas_user_idx" ON "personas" ("user_id");
CREATE TABLE IF NOT EXISTS "prompt_presets" (
  "id" serial PRIMARY KEY, "user_id" integer NOT NULL, "name" text NOT NULL,
  "system_prompt" text DEFAULT '' NOT NULL, "post_history" text DEFAULT '' NOT NULL,
  "temperature" integer DEFAULT 90 NOT NULL, "max_tokens" integer DEFAULT 600 NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "lorebooks" (
  "id" serial PRIMARY KEY, "user_id" integer NOT NULL, "name" text NOT NULL,
  "description" text DEFAULT '' NOT NULL, "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "lore_entries" (
  "id" serial PRIMARY KEY, "book_id" integer NOT NULL, "user_id" integer NOT NULL,
  "title" text NOT NULL, "keywords" text DEFAULT '' NOT NULL,
  "content" text DEFAULT '' NOT NULL, "constant" boolean DEFAULT false NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL, "priority" integer DEFAULT 100 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "user_ai_settings" (
  "id" serial PRIMARY KEY, "user_id" integer NOT NULL UNIQUE,
  "provider" text DEFAULT 'built-in' NOT NULL, "base_url" text DEFAULT '' NOT NULL,
  "model" text DEFAULT '' NOT NULL, "encrypted_key" text DEFAULT '' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "user_extensions" (
  "id" serial PRIMARY KEY, "user_id" integer NOT NULL UNIQUE,
  "auto_voice" boolean DEFAULT true NOT NULL, "action_text" boolean DEFAULT true NOT NULL,
  "long_memory" boolean DEFAULT true NOT NULL, "world_info" boolean DEFAULT true NOT NULL,
  "typing_effect" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "persona_id" integer;
CREATE TABLE IF NOT EXISTS "regex_rules" (
  "id" serial PRIMARY KEY, "user_id" integer NOT NULL, "name" text DEFAULT '新规则' NOT NULL,
  "pattern" text DEFAULT '' NOT NULL, "replacement" text DEFAULT '' NOT NULL,
  "flags" text DEFAULT 'g' NOT NULL, "scope" text DEFAULT 'reply' NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "regex_rules_user_idx" ON "regex_rules" ("user_id");
`;

const g = globalThis as typeof globalThis & { __maoxiangReady?: Promise<void> };

async function init() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(7310421)");
    await client.query(DDL);
    const r = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM "characters"');
    if ((r.rows[0]?.n ?? 0) === 0) {
      await seedDatabase();
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(7310421)").catch(() => undefined);
    client.release();
  }
}

/** Creates tables (idempotent) and seeds demo content on first use. */
export function ensureDb(): Promise<void> {
  if (!g.__maoxiangReady) {
    g.__maoxiangReady = init().catch((err) => {
      g.__maoxiangReady = undefined;
      throw err;
    });
  }
  return g.__maoxiangReady;
}
