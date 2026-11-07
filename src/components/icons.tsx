import type { ReactNode, SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

function S({ children, ...p }: P & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...p}>
      {children}
    </svg>
  );
}

/* ---------------------------- Brand ---------------------------- */

export function CatLogo(p: P) {
  return (
    <svg viewBox="0 0 120 104" fill="none" {...p}>
      <path d="M18 48c0-14 8-24 18-24l5-14 10 14h18c18 0 30 10 32 24z" fill="#111" />
      <rect x="16" y="46" width="88" height="48" rx="10" fill="#fff" stroke="#111" strokeWidth="8" />
      <circle cx="38" cy="37" r="8" fill="#fff" />
      <circle cx="56" cy="37" r="8" fill="#fff" />
      <circle cx="41" cy="37" r="4" fill="#111" />
      <circle cx="59" cy="37" r="4" fill="#111" />
      <path d="M96 58c12 2 12 18-2 18" stroke="#111" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------- Bottom nav -------------------------- */

export function HomeTabIcon({ active, eye = "#000", ...p }: P & { active?: boolean; eye?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" {...p}>
      {active ? (
        <>
          <rect x="3.5" y="5" width="21" height="18.5" rx="7.5" fill="currentColor" />
          <rect x="9.4" y="11.2" width="2.8" height="5.4" rx="1.4" fill={eye} />
          <rect x="15.8" y="11.2" width="2.8" height="5.4" rx="1.4" fill={eye} />
        </>
      ) : (
        <>
          <rect x="4.5" y="6" width="19" height="16.5" rx="7" stroke="currentColor" strokeWidth="2.1" />
          <rect x="9.8" y="11.6" width="2.4" height="4.6" rx="1.2" fill="currentColor" />
          <rect x="15.8" y="11.6" width="2.4" height="4.6" rx="1.2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function CompassTabIcon({ active, eye = "#000", ...p }: P & { active?: boolean; eye?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" {...p}>
      {active ? (
        <>
          <circle cx="14" cy="14" r="10.5" fill="currentColor" />
          <path d="M18.4 9.6l-2.7 6.1-6.1 2.7 2.7-6.1z" fill={eye} />
        </>
      ) : (
        <>
          <circle cx="14" cy="14" r="9.8" stroke="currentColor" strokeWidth="2.1" />
          <path d="M18 10l-2.5 5.5L10 18l2.5-5.5z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

export function CreateTabIcon({ bg = "#000", ...p }: P & { bg?: string }) {
  return (
    <svg viewBox="0 0 46 30" fill="none" {...p}>
      <rect x="3" y="7" width="31" height="20" rx="6.5" stroke="currentColor" strokeWidth="2.3" />
      <path d="M18.5 12v10M13.5 17h10" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <rect x="27" y="1" width="18" height="12" fill={bg} />
      <text x="28.5" y="11.5" fontSize="11.5" fontWeight="900" fontStyle="italic" fill="currentColor" fontFamily="Arial, Helvetica, sans-serif">
        AI
      </text>
    </svg>
  );
}

export function MessageTabIcon({ active, eye = "#000", ...p }: P & { active?: boolean; eye?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" {...p}>
      <path
        d="M14 4.6c5.8 0 10 3.9 10 8.8s-4.2 8.8-10 8.8c-1.2 0-2.3-.2-3.4-.5L6 23.5l.9-4.1C5.1 17.8 4 15.8 4 13.4 4 8.5 8.2 4.6 14 4.6z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
        fill={active ? "currentColor" : "none"}
      />
      <path d="M10.3 14c1 1.5 2.3 2.2 3.7 2.2s2.7-.7 3.7-2.2" stroke={active ? eye : "currentColor"} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MeTabIcon({ active, ...p }: P & { active?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" {...p}>
      <circle cx="14" cy="9.6" r="4.6" stroke="currentColor" strokeWidth="2.1" fill={active ? "currentColor" : "none"} />
      <path d="M5.6 23.4c.9-4.4 4.3-7.1 8.4-7.1s7.5 2.7 8.4 7.1" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" fill={active ? "currentColor" : "none"} />
    </svg>
  );
}

/* ------------------------ Feed action icons ------------------------ */

export function HeartFill(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 21.2l-1.45-1.3C5.4 15.3 2 12.2 2 8.4 2 5.4 4.4 3 7.4 3c1.7 0 3.4.8 4.6 2.1C13.2 3.8 14.9 3 16.6 3 19.6 3 22 5.4 22 8.4c0 3.8-3.4 6.9-8.55 11.5z" />
    </svg>
  );
}

export function ShareFill(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M13.6 4.2c0-.7.8-1 1.3-.6l7.2 6.9c.4.4.4 1 0 1.4l-7.2 6.9c-.5.5-1.3.1-1.3-.6v-3.6c-5.2-.1-8.5 1.5-11.1 5.3-.3.4-.9.2-.8-.3.9-6.1 4.4-10.5 11.9-11.3z" />
    </svg>
  );
}

export function CommentFill(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3C6.5 3 2 6.9 2 11.7c0 2.4 1.1 4.6 2.9 6.2l-.8 3.3c-.1.4.3.7.7.5l3.6-1.8c1.1.4 2.4.6 3.6.6 5.5 0 10-3.9 10-8.8S17.5 3 12 3z" fill="currentColor" />
      <circle cx="7.6" cy="11.8" r="1.45" fill="rgba(0,0,0,.5)" />
      <circle cx="12" cy="11.8" r="1.45" fill="rgba(0,0,0,.5)" />
      <circle cx="16.4" cy="11.8" r="1.45" fill="rgba(0,0,0,.5)" />
    </svg>
  );
}

export function ClockFill(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 6.6V12l3.6 2.3" stroke="rgba(0,0,0,.55)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------------- Top bar ---------------------------- */

export function HeartBadgeIcon(p: P) {
  return (
    <S strokeWidth={2} {...p}>
      <path d="M12 20.3S3.5 15.3 3.5 9.1C3.5 6.3 5.6 4.2 8.3 4.2c1.6 0 2.9.8 3.7 1.9.8-1.1 2.1-1.9 3.7-1.9 2.7 0 4.8 2.1 4.8 4.9 0 6.2-8.5 11.2-8.5 11.2z" />
      <path d="M8.8 10.2l3.2 3 3.2-3" />
    </S>
  );
}

export const SearchIcon = (p: P) => (
  <S strokeWidth={2.1} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20.5 20.5l-4.2-4.2" />
  </S>
);

export const SpeakerIcon = (p: P) => (
  <S strokeWidth={2} {...p}>
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
    <path d="M15.5 9c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3" />
    <path d="M18 6.5c1.8 1.4 2.8 3.4 2.8 5.5s-1 4.1-2.8 5.5" />
  </S>
);

export const SpeakerOffIcon = (p: P) => (
  <S strokeWidth={2} {...p}>
    <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </S>
);

/* ---------------------------- Input bar ---------------------------- */

export const PhoneIcon = (p: P) => (
  <S strokeWidth={1.9} {...p}>
    <path d="M6.6 3.8l2.3-.4c.5-.1 1 .2 1.2.7l1.1 3c.2.5 0 1-.4 1.3L9.3 9.6c.9 2 2.6 3.7 4.6 4.6l1.2-1.5c.3-.4.9-.6 1.3-.4l3 1.1c.5.2.8.7.7 1.2l-.4 2.3c-.1.6-.6 1-1.2 1-7.5-.3-13.5-6.3-13.8-13.8 0-.6.4-1.1 1-1.2z" />
  </S>
);

export const KeyboardIcon = (p: P) => (
  <S strokeWidth={1.8} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="8.2" cy="9.6" r=".55" fill="currentColor" />
    <circle cx="12" cy="9.6" r=".55" fill="currentColor" />
    <circle cx="15.8" cy="9.6" r=".55" fill="currentColor" />
    <circle cx="8.2" cy="12.6" r=".55" fill="currentColor" />
    <circle cx="12" cy="12.6" r=".55" fill="currentColor" />
    <circle cx="15.8" cy="12.6" r=".55" fill="currentColor" />
    <path d="M9 15.8h6" />
  </S>
);

export const PlusCircleIcon = (p: P) => (
  <S strokeWidth={1.8} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7.8v8.4M7.8 12h8.4" />
  </S>
);

export const MicIcon = (p: P) => (
  <S strokeWidth={1.8} {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <rect x="10" y="6.8" width="4" height="7" rx="2" />
    <path d="M8.3 12.2a3.7 3.7 0 007.4 0M12 15.9v1.6" />
  </S>
);

export const SendIcon = (p: P) => (
  <S strokeWidth={2.4} {...p}>
    <path d="M12 19V5.5M6.5 11L12 5.5l5.5 5.5" />
  </S>
);

/* ---------------------------- General ---------------------------- */

export const ChevronRight = (p: P) => (
  <S strokeWidth={2.2} {...p}>
    <path d="M9.5 5.5l6.5 6.5-6.5 6.5" />
  </S>
);
export const ChevronLeft = (p: P) => (
  <S strokeWidth={2.3} {...p}>
    <path d="M15 4.5L7.5 12l7.5 7.5" />
  </S>
);
export const ChevronDown = (p: P) => (
  <S strokeWidth={2.2} {...p}>
    <path d="M5.5 9.5l6.5 6.5 6.5-6.5" />
  </S>
);
export const CloseIcon = (p: P) => (
  <S strokeWidth={2.1} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);
export const MoreIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <circle cx="5.5" cy="12" r="1.9" />
    <circle cx="12" cy="12" r="1.9" />
    <circle cx="18.5" cy="12" r="1.9" />
  </svg>
);
export const DocIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="4.5" y="3" width="15" height="18" rx="3.5" fill="currentColor" />
    <path d="M8.5 9h7M8.5 13h4.5" stroke="#222" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);
export const ExpandIcon = (p: P) => (
  <S strokeWidth={2} {...p}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5" />
  </S>
);
export const BulbIcon = (p: P) => (
  <S {...p}>
    <path d="M9 17.5h6M10 21h4M12 3a6 6 0 00-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.6h5v-.6c0-.8.4-1.6 1.1-2.1A6 6 0 0012 3z" />
  </S>
);
export const HeartSparkIcon = (p: P) => (
  <S {...p}>
    <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.6-7.5 10-7.5 10z" />
    <path d="M19 2.5v3M17.5 4h3" />
  </S>
);
export const RefreshIcon = (p: P) => (
  <S {...p}>
    <path d="M20 11.5A8 8 0 006.3 6.3L4 8.5M4 4v4.5h4.5M4 12.5a8 8 0 0013.7 5.2l2.3-2.2M20 20v-4.5h-4.5" />
  </S>
);
export const SparkleIcon = (p: P) => (
  <S {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </S>
);
export const BrainIcon = (p: P) => (
  <S {...p}>
    <path d="M9.5 4.5A2.5 2.5 0 007 7a2.8 2.8 0 00-2 4.6A3 3 0 006.5 17 2.6 2.6 0 009.5 19.5h.5V4.5zM14.5 4.5A2.5 2.5 0 0117 7a2.8 2.8 0 012 4.6 3 3 0 01-1.5 5.4 2.6 2.6 0 01-3 2.5H14V4.5z" />
  </S>
);
export const RestartIcon = (p: P) => (
  <S {...p}>
    <path d="M4 12a8 8 0 108-8 8.2 8.2 0 00-5.7 2.3L4 8.5" />
    <path d="M4 3.5v5h5" />
  </S>
);
export const UserCardIcon = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <circle cx="9" cy="11" r="2.2" />
    <path d="M5.8 16c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h3.5M14.5 13.5h2.5" />
  </S>
);
export const FlagIcon = (p: P) => (
  <S {...p}>
    <path d="M5 21V4M5 4.5c4-2 6.5 2 11 0v8c-4.5 2-7-2-11 0" />
  </S>
);
export const ShareOutline = (p: P) => (
  <S {...p}>
    <path d="M13.5 5l7 6.5-7 6.5v-3.6c-4.8 0-7.9 1.4-10 4.6.7-5 3.6-9 10-9.7z" />
  </S>
);
export const GearIcon = (p: P) => (
  <S strokeWidth={1.9} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </S>
);
export const BellIcon = (p: P) => (
  <S {...p}>
    <path d="M18 8.5a6 6 0 10-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5M13.7 20.5a2 2 0 01-3.4 0" />
  </S>
);
export const FishIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M2.5 12c2.6-4 6-6 9.8-6 3.4 0 6.3 1.9 8.2 4.4l1.8-2v7.2l-1.8-2C18.6 16.1 15.7 18 12.3 18 8.5 18 5.1 16 2.5 12z" />
    <circle cx="8" cy="11" r="1.2" fill="#fff" />
  </svg>
);
export const CrownIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M3 7.5l4.5 3.5L12 4.5l4.5 6.5L21 7.5l-2 10H5zM5 19h14v2H5z" />
  </svg>
);
export const EditIcon = (p: P) => (
  <S {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </S>
);
export const TrashIcon = (p: P) => (
  <S {...p}>
    <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />
  </S>
);
export const PinIcon = (p: P) => (
  <S {...p}>
    <path d="M9 4h6l-1 5 3.5 3.5v1.5h-11v-1.5L10 9zM12 14v6.5" />
  </S>
);
export const CheckIcon = (p: P) => (
  <S strokeWidth={2.6} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </S>
);
export const LockIcon = (p: P) => (
  <S {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
  </S>
);
export const ImageIcon = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="9.5" r="1.8" />
    <path d="M21 15.5l-5-5-9 9.5" />
  </S>
);
export const BrushIcon = (p: P) => (
  <S {...p}>
    <path d="M19.5 3.5c-3.5 1.5-8 6-9.6 9.4l1.7 1.7c3.4-1.6 7.9-6.1 9.4-9.6zM9 14.5c-2.3 0-4 1.6-4 3.8 0 .9-.6 1.7-1.5 2.2 3.8.6 7.5-.6 7.5-4z" />
  </S>
);
export const BookIcon = (p: P) => (
  <S {...p}>
    <path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2zM12 6.5v14" />
  </S>
);
export const RoleIcon = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="8.5" r="4.2" />
    <path d="M4.5 20.5c1-4 4-6.2 7.5-6.2s6.5 2.2 7.5 6.2" />
  </S>
);
export const DownloadIcon = (p: P) => (
  <S strokeWidth={2.1} {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </S>
);
export const PlayIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M7 4.8v14.4c0 .8.9 1.3 1.6.8l11-7.2c.6-.4.6-1.2 0-1.6l-11-7.2C7.9 3.5 7 4 7 4.8z" />
  </svg>
);
export const PauseIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <rect x="6" y="4.5" width="4" height="15" rx="1.3" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.3" />
  </svg>
);
export const MicOffIcon = (p: P) => (
  <S strokeWidth={2} {...p}>
    <path d="M9 9v2.5a3 3 0 005 2.2M15 10V6a3 3 0 00-5.8-1M6 11.5a6 6 0 009.5 4.8M18 11.5c0 .7-.1 1.3-.3 1.9M12 18v3M3.5 3.5l17 17" />
  </S>
);
export const MicLineIcon = (p: P) => (
  <S strokeWidth={2} {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M6 11.5a6 6 0 0012 0M12 17.5V21" />
  </S>
);
export const HangupIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12 9c-3.2 0-6.1.9-8.5 2.6-.6.4-.8 1.2-.5 1.9l1 2.1c.3.6 1 .9 1.6.7l2.6-.9c.5-.2.9-.7.9-1.3v-1.7c1-.3 2-.4 2.9-.4s1.9.1 2.9.4v1.7c0 .6.4 1.1.9 1.3l2.6.9c.6.2 1.3-.1 1.6-.7l1-2.1c.3-.7.1-1.5-.5-1.9C18.1 9.9 15.2 9 12 9z" />
  </svg>
);
export const ChatSmallIcon = (p: P) => (
  <S strokeWidth={2} {...p}>
    <path d="M12 4c4.7 0 8 3 8 7s-3.3 7-8 7c-1 0-1.9-.1-2.8-.4L5 19.5l.8-3.4C4.6 14.8 4 13 4 11c0-4 3.3-7 8-7z" />
  </S>
);
export const FaceSmallIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="3" y="4" width="18" height="16" rx="6" fill="currentColor" />
    <rect x="8" y="9.5" width="2.2" height="4.2" rx="1.1" fill="#222" />
    <rect x="13.8" y="9.5" width="2.2" height="4.2" rx="1.1" fill="#222" />
  </svg>
);
export const FireIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M12.5 2.5c.5 3.2-1.4 4.8-2.9 6.4C8.1 10.5 7 12.1 7 14.5a5 5 0 0010 0c0-1.6-.6-3-1.4-4.1-.2 1.3-.9 2.2-1.8 2.6.6-3.5-.2-7.4-1.3-10.5z" />
  </svg>
);
export const ChipIcon = (p: P) => (
  <S {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2.5" />
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </S>
);
export const WandIcon = (p: P) => (
  <S {...p}>
    <path d="M6.5 17.5L15 9l2 2-8.5 8.5a1.6 1.6 0 01-2.3-.3l-.5-.7a1.6 1.6 0 01.8-1z" />
    <path d="M15 4.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    <path d="M19.5 12l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" />
    <path d="M5.3 4.3l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z" />
  </S>
);
export const PuzzleIcon = (p: P) => (
  <S {...p}>
    <path d="M4.5 9.2V7a2.5 2.5 0 012.5-2.5h1.2c.3-1.3 1-2.4 2.3-2.4s2 1.1 2.3 2.4h1.2A2.5 2.5 0 0116.5 7v1.1c1.3.3 2.5 1.1 2.5 2.4s-1.2 2.1-2.5 2.4v2.1a2.5 2.5 0 01-2.5 2.5h-1.3c-.3 1.3-1 2.5-2.2 2.5s-1.9-1.2-2.2-2.5H6.5A2.5 2.5 0 014 15v-2.2C2.7 12.5 1.5 11.7 1.5 10.5s1.2-1.7 3-1.3z" transform="translate(1,1)" />
  </S>
);
export const HomeIcon = (p: P) => (
  <S {...p}>
    <path d="M4 10.5L12 3.5l8 7V20a1.5 1.5 0 01-1.5 1.5h-5V16h-3v5.5H5.5A1.5 1.5 0 014 20z" />
  </S>
);
export const CalendarIcon = (p: P) => (
  <S {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
  </S>
);
export const CopyIcon = (p: P) => (
  <S {...p}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
    <path d="M15.5 8.5V6a2.5 2.5 0 00-2.5-2.5H6A2.5 2.5 0 003.5 6v7A2.5 2.5 0 006 15.5h2.5" />
  </S>
);
export const ThumbDownIcon = (p: P) => (
  <S {...p}>
    <path d="M10 15v4.5a2.5 2.5 0 002.5 2.5l3.5-8V3H6.8a2 2 0 00-2 1.7L3.4 12.6A2 2 0 005.4 15zM16 3h2.7A2.3 2.3 0 0121 5.3v6.4a2.3 2.3 0 01-2.3 2.3H16" />
  </S>
);
