// ============================================
// HUKUM - ICONS
// Chunky game-style glyphs: white or coloured fill with a dark outline.
// ============================================

import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const INK = '#17365c';

const glyph = {
    viewBox: '0 0 32 32',
    'aria-hidden': true,
    fill: '#fff',
    stroke: INK,
    strokeWidth: 2.4,
    strokeLinejoin: 'round' as const,
    strokeLinecap: 'round' as const,
    paintOrder: 'stroke',
};

export const CloseIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <path d="M8.5 5.5 16 13l7.5-7.5 3 3L19 16l7.5 7.5-3 3L16 19l-7.5 7.5-3-3L13 16 5.5 8.5z" />
    </svg>
);

export const HelpIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <path d="M11 11.5c0-3.2 2.4-5.3 5.5-5.3 3.2 0 5.5 2 5.5 4.8 0 2.4-1.5 3.6-3 4.6-1.1.7-1.6 1.2-1.6 2.4v.8h-4v-1.1c0-2.3 1.2-3.5 2.6-4.4 1.2-.8 1.9-1.3 1.9-2.2 0-1-.8-1.7-1.9-1.7-1.2 0-2 .8-2 2.1z" />
        <circle cx="15.4" cy="24.4" r="2.6" />
    </svg>
);

export const ChatIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <path d="M16 4.5c6.6 0 11.5 4.3 11.5 9.7S22.6 24 16 24c-1.2 0-2.3-.1-3.4-.4L6.5 27l1.3-5.4C5.7 19.8 4.5 17.2 4.5 14.2 4.5 8.8 9.4 4.5 16 4.5z" />
        <circle cx="10.8" cy="14.3" r="1.6" fill={INK} stroke="none" />
        <circle cx="16" cy="14.3" r="1.6" fill={INK} stroke="none" />
        <circle cx="21.2" cy="14.3" r="1.6" fill={INK} stroke="none" />
    </svg>
);

export const SmileIcon = (p: P) => (
    <svg viewBox="0 0 48 48" aria-hidden {...p}>
        <circle cx="24" cy="24" r="20" fill="#ffcb22" stroke={INK} strokeWidth="3" />
        <path d="M10 18a16 16 0 0 1 28 0" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="17.5" cy="21" rx="2.6" ry="3.4" fill={INK} />
        <ellipse cx="30.5" cy="21" rx="2.6" ry="3.4" fill={INK} />
        <path d="M14.5 28.5c2.4 4 5.7 6 9.5 6s7.1-2 9.5-6" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </svg>
);

export const GearIcon = (p: P) => (
    <svg viewBox="0 0 48 48" aria-hidden {...p}>
        <path
            d="M20.6 3.5h6.8l1.2 5.4c1.5.5 2.9 1.1 4.2 2l4.7-3 4.8 4.8-3 4.7c.9 1.3 1.5 2.7 2 4.2l5.4 1.2v6.8l-5.4 1.2c-.5 1.5-1.1 2.9-2 4.2l3 4.7-4.8 4.8-4.7-3c-1.3.9-2.7 1.5-4.2 2l-1.2 5.4h-6.8l-1.2-5.4c-1.5-.5-2.9-1.1-4.2-2l-4.7 3-4.8-4.8 3-4.7c-.9-1.3-1.5-2.7-2-4.2L3.5 27.4v-6.8l5.4-1.2c.5-1.5 1.1-2.9 2-4.2l-3-4.7 4.8-4.8 4.7 3c1.3-.9 2.7-1.5 4.2-2z"
            fill="#ffcb22" stroke={INK} strokeWidth="3" strokeLinejoin="round"
        />
        <path d="M12 16a14 14 0 0 1 18-6" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="24" cy="24" r="7" fill="#f28a18" stroke={INK} strokeWidth="3" />
    </svg>
);

export const BookIcon = (p: P) => (
    <svg viewBox="0 0 48 48" aria-hidden {...p}>
        <path d="M6 10c6-2 12-1.5 18 2 6-3.5 12-4 18-2v28c-6-2-12-1.5-18 2-6-3.5-12-4-18-2z" fill="#79d1f0" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M24 12v28" stroke={INK} strokeWidth="3" />
        <path d="M10 16c3.5-.8 7-.5 10 1M10 22c3.5-.8 7-.5 10 1M28 17c3-1.5 6.5-1.8 10-1M28 23c3-1.5 6.5-1.8 10-1" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
);

export const BackIcon = (p: P) => (
    <svg viewBox="0 0 48 48" aria-hidden {...p}>
        <path
            d="M20 6 4 22l16 16v-9.5c9.5 0 16.5 3 21.5 11 0-12.5-6.5-23-21.5-24.5z"
            fill="#ffcb22" stroke={INK} strokeWidth="3.4" strokeLinejoin="round"
        />
        <path d="M11 20 19 12" stroke="#fff" strokeOpacity=".75" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
);

export const CopyIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <rect x="5.5" y="4.5" width="15" height="17" rx="3" fill="#cfe9ff" />
        <rect x="11.5" y="10.5" width="15" height="17" rx="3" />
    </svg>
);

export const ShareIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <path d="M16 3.5 23 10.5h-4.5v8h-5v-8H9z" />
        <path d="M7 15v10.5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V15" fill="none" strokeWidth="3" />
    </svg>
);

export const CheckIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <path d="M4.5 16.5 8 13l5 5 11-11.5 3.5 3.5L13 25z" />
    </svg>
);

export const PlusIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <path d="M13 4.5h6v8.5h8.5v6H19v8.5h-6V19H4.5v-6H13z" />
    </svg>
);

export const SendIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <path d="M4 15.5 27.5 4.5 21 27.5l-5.5-8.8z" />
        <path d="m15.5 18.7 12-14.2" fill="none" />
    </svg>
);

export const SwapIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <path d="M10 4 3.5 10.5 10 17v-4h16V8H10z" />
        <path d="m22 15 6.5 6.5L22 28v-4H6v-5h16z" />
    </svg>
);

export const SoundIcon = ({ muted, ...p }: P & { muted?: boolean }) => (
    <svg {...glyph} {...p}>
        <path d="M4.5 12h5l7-6.5v21l-7-6.5h-5z" />
        {muted ? (
            <path d="m20.5 12 7 8m0-8-7 8" fill="none" strokeWidth="3.2" stroke="#fff" />
        ) : (
            <path d="M20.5 11.5c1.6 1.2 2.5 2.8 2.5 4.5s-.9 3.3-2.5 4.5M23.5 7.5c3 2.2 4.5 5.2 4.5 8.5s-1.5 6.3-4.5 8.5" fill="none" stroke="#fff" strokeWidth="2.8" />
        )}
    </svg>
);

export const MusicIcon = ({ muted, ...p }: P & { muted?: boolean }) => (
    <svg {...glyph} {...p}>
        <path d="M12 23.5V7.5l15-3v15" fill="none" strokeWidth="3" stroke={INK} />
        <path d="M12 23.5V7.5l15-3v15" fill="none" strokeWidth="1.2" stroke="#fff" />
        <ellipse cx="8.5" cy="23.5" rx="4.5" ry="3.6" />
        <ellipse cx="23.5" cy="19.5" rx="4.5" ry="3.6" />
        {muted && <path d="m4 4 24 24" fill="none" strokeWidth="3.4" stroke="#e94359" />}
    </svg>
);

export const VibrateIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <rect x="10" y="4.5" width="12" height="23" rx="2.5" />
        <path d="M6 10.5v11M3 13v6M26 10.5v11M29 13v6" fill="none" stroke={INK} strokeWidth="2.6" />
    </svg>
);

export const AlertIcon = (p: P) => (
    <svg viewBox="0 0 32 32" aria-hidden {...p}>
        <path d="M16 3 30 27H2z" fill="#ffcb22" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M16 11v7.5" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="16" cy="22.6" r="2" fill={INK} />
    </svg>
);

export const WifiOffIcon = (p: P) => (
    <svg viewBox="0 0 48 48" aria-hidden {...p}>
        <path d="M6 18c10-9 26-9 36 0M12 25c7-6 17-6 24 0M18 32c3.5-3 8.5-3 12 0" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />
        <path d="M6 18c10-9 26-9 36 0M12 25c7-6 17-6 24 0M18 32c3.5-3 8.5-3 12 0" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="24" cy="39" r="4" fill="#fff" stroke={INK} strokeWidth="3" />
        <path d="M8 8l32 34" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path d="M8 8l32 34" stroke="#e94359" strokeWidth="5" strokeLinecap="round" />
    </svg>
);

export const DiceIcon = (p: P) => (
    <svg {...glyph} {...p}>
        <rect x="4.5" y="4.5" width="23" height="23" rx="6" />
        <circle cx="11" cy="11" r="2.2" fill={INK} stroke="none" />
        <circle cx="21" cy="21" r="2.2" fill={INK} stroke="none" />
        <circle cx="16" cy="16" r="2.2" fill={INK} stroke="none" />
    </svg>
);

export const BoltIcon = (p: P) => (
    <svg viewBox="0 0 32 32" aria-hidden {...p}>
        <path d="M19 2 6 18h8l-2 12 14-17h-8.5z" fill="#ffcb22" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M16.5 6 10 14" stroke="#fff" strokeOpacity=".75" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export const TrophyIcon = (p: P) => (
    <svg viewBox="0 0 120 120" aria-hidden {...p}>
        <path d="M30 16h60v12h14c0 22-10 34-26 36-3 8-8 13-14 15v13h16v12H40V92h16V79c-6-2-11-7-14-15C26 62 16 50 16 28h14z" fill="#ffcb22" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M30 28H24c1 13 7 21 14 24M90 28h6c-1 13-7 21-14 24" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <path d="M42 24v18c0 10 6 17 12 20" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" />
        <path d="M60 30l4.5 9 10 1.5-7.2 7 1.7 10L60 52.8 51 57.5l1.7-10-7.2-7 10-1.5z" fill="#f28a18" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <rect x="34" y="102" width="52" height="10" rx="3" fill="#f28a18" stroke={INK} strokeWidth="4" />
    </svg>
);

export const CloudIcon = (p: P) => (
    <svg viewBox="0 0 120 120" aria-hidden {...p}>
        <path d="M30 78a18 18 0 0 1 2-36 26 26 0 0 1 50-6 20 20 0 0 1 8 42z" fill="#a9b6c6" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M44 88l-4 10M60 88l-4 12M76 88l-4 10" stroke="#79d1f0" strokeWidth="6" strokeLinecap="round" />
        <path d="M44 88l-4 10M60 88l-4 12M76 88l-4 10" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity=".4" />
        <circle cx="48" cy="58" r="4" fill={INK} />
        <circle cx="70" cy="58" r="4" fill={INK} />
        <path d="M50 70c5-4 13-4 18 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </svg>
);
