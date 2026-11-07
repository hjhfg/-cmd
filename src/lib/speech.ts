"use client";

import { NARRATOR_VOICE, VOICES, type VoiceDef } from "./constants";

/* ----------------------------- TTS ----------------------------- */

function voiceDef(id: string): VoiceDef {
  return VOICES.find((v) => v.id === id) ?? (id === "旁白" ? NARRATOR_VOICE : VOICES[0]);
}

function chooseSystemVoice(def: VoiceDef): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const all = window.speechSynthesis.getVoices().filter((v) => /zh|cmn/i.test(v.lang));
  if (!all.length) return null;
  const male = all.find((v) => /male|yunxi|yunjian|yunyang|kangkang|男|liang|zhiwei/i.test(v.name) && !/female/i.test(v.name));
  const female = all.find((v) => /female|xiaoxiao|xiaoyi|tingting|huihui|meijia|yaoyao|女|sinji/i.test(v.name));
  if (def.gender === "male") return male ?? all[0];
  if (def.gender === "female" || def.gender === "child") return female ?? all[0];
  return all[0];
}

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function cancelSpeech() {
  if (speechSupported()) window.speechSynthesis.cancel();
}

export function speakLines(lines: { text: string; voice: string }[], onDone?: () => void) {
  if (!speechSupported()) {
    onDone?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const items = lines.map((l) => ({ ...l, text: l.text.replace(/（[^）]*）|\([^)]*\)/g, "").trim() })).filter((l) => l.text);
  if (!items.length) {
    onDone?.();
    return;
  }
  items.forEach((l, i) => {
    const u = new SpeechSynthesisUtterance(l.text);
    const def = voiceDef(l.voice);
    u.lang = "zh-CN";
    u.pitch = Math.min(2, Math.max(0, def.pitch));
    u.rate = def.rate;
    const v = chooseSystemVoice(def);
    if (v) u.voice = v;
    if (i === items.length - 1) {
      u.onend = () => onDone?.();
      u.onerror = () => onDone?.();
    }
    synth.speak(u);
  });
}

/* ----------------------------- STT ----------------------------- */

interface RecResultItem {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecEvent {
  results: ArrayLike<RecResultItem>;
}

export interface Recognizer {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

export function createRecognizer(continuous = true): Recognizer | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognizer; webkitSpeechRecognition?: new () => Recognizer };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "zh-CN";
  r.interimResults = true;
  r.continuous = continuous;
  return r;
}

export function transcriptOf(e: RecEvent): { text: string; final: boolean } {
  let text = "";
  let final = true;
  for (let i = 0; i < e.results.length; i++) {
    const r = e.results[i];
    text += r[0].transcript;
    if (!r.isFinal) final = false;
  }
  return { text, final };
}
