/**
 * Storage that NEVER throws and SURVIVES RELOADS even when the browser blocks
 * localStorage/sessionStorage (sandboxed or third-party preview iframes).
 *
 * Layers (read order): memory -> real Storage -> window.name snapshot.
 * window.name persists across reloads within the same tab/iframe and is not
 * subject to storage policies, so the device token & onboarding flag survive.
 */
const memLocal = new Map<string, string>();
const memSession = new Map<string, string>();

const WN_MARK = "mxstore:";
const WN_MAX = 12000;

function wnRead(): Record<string, string> {
  try {
    const n = window.name;
    if (n && n.startsWith(WN_MARK)) {
      const parsed = JSON.parse(n.slice(WN_MARK.length)) as unknown;
      if (parsed && typeof parsed === "object") return parsed as Record<string, string>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function wnWrite(data: Record<string, string>) {
  try {
    const s = WN_MARK + JSON.stringify(data);
    if (s.length <= WN_MAX) window.name = s;
  } catch {
    /* ignore */
  }
}

function make(kind: "local" | "session") {
  const mem = kind === "local" ? memLocal : memSession;
  const raw = (): Storage | null => {
    try {
      return kind === "local" ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };
  return {
    get(key: string): string | null {
      if (mem.has(key)) return mem.get(key) as string;
      const s = raw();
      if (s) {
        try {
          const v = s.getItem(key);
          if (v !== null) {
            mem.set(key, v);
            return v;
          }
        } catch {
          /* fall through */
        }
      }
      if (kind === "local") {
        const wn = wnRead();
        if (typeof wn[key] === "string") {
          mem.set(key, wn[key]);
          return wn[key];
        }
      }
      return null;
    },
    set(key: string, value: string) {
      mem.set(key, value);
      const s = raw();
      if (s) {
        try {
          s.setItem(key, value);
        } catch {
          /* memory + window.name only */
        }
      }
      if (kind === "local" && key.startsWith("mx_") && value.length < 2000) {
        const wn = wnRead();
        wn[key] = value;
        wnWrite(wn);
      }
    },
    remove(key: string) {
      mem.delete(key);
      const s = raw();
      if (s) {
        try {
          s.removeItem(key);
        } catch {
          /* ignore */
        }
      }
      if (kind === "local") {
        const wn = wnRead();
        if (key in wn) {
          delete wn[key];
          wnWrite(wn);
        }
      }
    },
    keys(): string[] {
      const all = new Set<string>(mem.keys());
      const s = raw();
      if (s) {
        try {
          Object.keys(s).forEach((k) => all.add(k));
        } catch {
          /* ignore */
        }
      }
      if (kind === "local") Object.keys(wnRead()).forEach((k) => all.add(k));
      return Array.from(all);
    },
    clear() {
      mem.clear();
      const s = raw();
      if (s) {
        try {
          s.clear();
        } catch {
          /* ignore */
        }
      }
      if (kind === "local") {
        try {
          if (window.name.startsWith(WN_MARK)) window.name = "";
        } catch {
          /* ignore */
        }
      }
    },
  };
}

export const local = make("local");
export const session = make("session");
