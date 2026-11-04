// ============================================
// HUKUM - DETERMINISTIC CARTOON AVATARS
// Every client derives the same character from the player's name,
// so no server or profile data is needed.
// ============================================

import { memo } from 'react';

const INK = '#17365c';

const BACKGROUNDS: [string, string][] = [
    ['#8be04e', '#3f9e1c'], // green
    ['#5fd3e6', '#1f8fb0'], // teal
    ['#ffd84a', '#e59a0f'], // yellow
    ['#ff7b8a', '#c42c47'], // red
    ['#b98cff', '#6a3fd0'], // purple
    ['#ffb057', '#e0670c'], // orange
    ['#6fb6ff', '#2a62c9'], // blue
    ['#5fe0b0', '#1f9c73'], // mint
];

const SKIN = ['#ffd9b8', '#f6c095', '#e2a36e', '#c27f4e', '#9a5c33', '#6e3f22'];
const HAIR = ['#2b1d16', '#5a3420', '#9b5a2a', '#f2c14e', '#d9472b', '#7b4bd6', '#2f6fd6', '#e8e8f0'];
const SHIRT = ['#e94359', '#317fc5', '#76e323', '#ffcb22', '#f28a18', '#8e5cf0', '#ffffff', '#1fb5a8'];

/** FNV-1a string hash → stable unsigned int */
function hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Pull successive small numbers out of one hash */
function picker(seed: number) {
    let s = seed || 1;
    return (n: number) => {
        // xorshift32
        s ^= s << 13; s >>>= 0;
        s ^= s >> 17;
        s ^= s << 5; s >>>= 0;
        return s % n;
    };
}

export interface AvatarProps {
    name: string;
    isBot?: boolean;
    size?: number | string;
    className?: string;
    title?: string;
}

export const Avatar = memo(function Avatar({ name, isBot = false, size = '100%', className = '', title }: AvatarProps) {
    const pick = picker(hash(name.trim().toLowerCase() || '?'));
    const bg = BACKGROUNDS[pick(BACKGROUNDS.length)];
    const id = `av-${hash(name)}-${isBot ? 'b' : 'h'}`;

    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className={`avatar-svg ${className}`}
            role="img"
            aria-label={title ?? (isBot ? `${name} (bot)` : name)}
        >
            <defs>
                <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={bg[0]} />
                    <stop offset="1" stopColor={bg[1]} />
                </linearGradient>
                <clipPath id={`${id}-clip`}>
                    <rect width="100" height="100" rx="16" />
                </clipPath>
            </defs>
            <g clipPath={`url(#${id}-clip)`}>
                <rect width="100" height="100" fill={`url(#${id}-bg)`} />
                <circle cx="22" cy="18" r="34" fill="#fff" opacity=".14" />
                {isBot ? <Robot pick={pick} /> : <Person pick={pick} />}
            </g>
        </svg>
    );
});

// ============================================
// HUMAN CHARACTER
// ============================================

function Person({ pick }: { pick: (n: number) => number }) {
    const skin = SKIN[pick(SKIN.length)];
    const hair = HAIR[pick(HAIR.length)];
    const shirt = SHIRT[pick(SHIRT.length)];
    const hairStyle = pick(7);
    const accessory = pick(6); // 0-2 none, 3 glasses, 4 headphones, 5 sunglasses
    const mouth = pick(3);
    const brows = pick(2);

    return (
        <g stroke={INK} strokeLinejoin="round" strokeLinecap="round">
            {/* Long hair behind the head */}
            {hairStyle === 3 && <path d="M22 46c-2 22 2 40 10 52h36c8-12 12-30 10-52z" fill={hair} strokeWidth="3" />}

            {/* Shoulders */}
            <path d="M14 104c2-18 16-26 36-26s34 8 36 26z" fill={shirt} strokeWidth="3" />
            <path d="M40 79c3 6 17 6 20 0" fill="none" strokeWidth="3" />

            {/* Neck */}
            <path d="M42 66h16v14c-5 3-11 3-16 0z" fill={skin} strokeWidth="3" />

            {/* Ears */}
            <ellipse cx="25" cy="49" rx="5.5" ry="7" fill={skin} strokeWidth="3" />
            <ellipse cx="75" cy="49" rx="5.5" ry="7" fill={skin} strokeWidth="3" />

            {/* Head */}
            <path d="M50 18c15 0 25 11 25 28 0 17-10 28-25 28S25 63 25 46c0-17 10-28 25-28z" fill={skin} strokeWidth="3" />

            {/* Hair on top */}
            <Hair style={hairStyle} color={hair} />

            {/* Cheeks */}
            <ellipse cx="34" cy="56" rx="5" ry="3" fill="#ff7b8a" opacity=".45" stroke="none" />
            <ellipse cx="66" cy="56" rx="5" ry="3" fill="#ff7b8a" opacity=".45" stroke="none" />

            {/* Eyes */}
            {accessory === 5 ? (
                <g>
                    <path d="M28 42h19l-2 10c-1 3-4 4-8 4s-7-1-8-4zM53 42h19l-1 10c-1 3-4 4-8 4s-7-1-8-4z" fill="#1c2433" strokeWidth="2.6" />
                    <path d="M47 44h6" strokeWidth="2.6" />
                    <path d="M32 45l5 0" stroke="#fff" strokeWidth="2" opacity=".6" />
                </g>
            ) : (
                <g>
                    <ellipse cx="40" cy="47" rx="5.2" ry="6.4" fill="#fff" strokeWidth="2.4" />
                    <ellipse cx="60" cy="47" rx="5.2" ry="6.4" fill="#fff" strokeWidth="2.4" />
                    <circle cx="41" cy="48" r="3.2" fill={INK} stroke="none" />
                    <circle cx="61" cy="48" r="3.2" fill={INK} stroke="none" />
                    <circle cx="42.2" cy="46.4" r="1.2" fill="#fff" stroke="none" />
                    <circle cx="62.2" cy="46.4" r="1.2" fill="#fff" stroke="none" />
                </g>
            )}

            {/* Brows */}
            {accessory !== 5 && (brows === 0
                ? <path d="M34 38c3-2 7-2 10 0M56 38c3-2 7-2 10 0" fill="none" strokeWidth="3" />
                : <path d="M34 37.5l10 1.5M56 39l10-1.5" fill="none" strokeWidth="3" />)}

            {/* Glasses */}
            {accessory === 3 && (
                <g fill="none" strokeWidth="2.6">
                    <circle cx="40" cy="47" r="8" />
                    <circle cx="60" cy="47" r="8" />
                    <path d="M48 47h4M32 46l-6-2M68 46l6-2" />
                </g>
            )}

            {/* Nose */}
            <path d="M50 51c-1.5 3-2 5 1 5.5" fill="none" strokeWidth="2.4" />

            {/* Mouth */}
            {mouth === 0 && <path d="M42 61c4 5 12 5 16 0" fill="none" strokeWidth="3" />}
            {mouth === 1 && <path d="M41 60c2 7 16 7 18 0z" fill="#fff" strokeWidth="2.6" />}
            {mouth === 2 && <path d="M44 62c3 2 9 2 12-1" fill="none" strokeWidth="3" />}

            {/* Headphones */}
            {accessory === 4 && (
                <g strokeWidth="3">
                    <path d="M22 46c0-20 12-31 28-31s28 11 28 31" fill="none" stroke={INK} strokeWidth="7" />
                    <path d="M22 46c0-20 12-31 28-31s28 11 28 31" fill="none" stroke="#e94359" strokeWidth="3.5" />
                    <rect x="16" y="40" width="11" height="18" rx="5" fill="#e94359" />
                    <rect x="73" y="40" width="11" height="18" rx="5" fill="#e94359" />
                </g>
            )}
        </g>
    );
}

function Hair({ style, color }: { style: number; color: string }) {
    const p = { fill: color, strokeWidth: 3 };
    switch (style) {
        case 0: // short crop
            return <path d="M25 44c-2-17 9-29 25-29s27 12 25 29c-4-7-9-11-14-12-6 4-17 6-26 4-4 2-7 5-10 8z" {...p} />;
        case 1: // spiky
            return <path d="M24 44c-3-12 0-22 7-27l2 6 5-11 5 9 6-12 5 11 6-9 3 12 7-5c4 7 6 16 4 26-4-6-10-10-17-11-8 3-18 3-26 1-3 3-5 6-7 10z" {...p} />;
        case 2: // top bun
            return (
                <g>
                    <circle cx="50" cy="13" r="9" {...p} />
                    <path d="M25 44c-2-17 9-27 25-27s27 10 25 27c-6-9-14-14-25-14s-19 5-25 14z" {...p} />
                </g>
            );
        case 3: // long (front fringe)
            return <path d="M24 50c-3-21 8-34 26-34s29 13 26 34c-5-10-9-15-14-17-6 5-18 8-28 6-4 3-7 6-10 11z" {...p} />;
        case 4: // curly
            return (
                <g>
                    {[[28, 34], [34, 24], [44, 18], [56, 18], [66, 24], [72, 34], [24, 44], [76, 44]].map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="9" {...p} />
                    ))}
                </g>
            );
        case 5: // side part
            return <path d="M25 45c-3-19 8-30 25-30 15 0 27 9 26 29-3-6-8-10-13-12-10 1-22-2-29-8-4 6-7 12-9 21z" {...p} />;
        default: // cap
            return (
                <g>
                    <path d="M24 40c0-15 11-24 26-24s26 9 26 24z" fill="#317fc5" strokeWidth="3" />
                    <path d="M50 40h32c0 4-3 6-8 6H50z" fill="#206ab5" strokeWidth="3" />
                    <circle cx="50" cy="17" r="3" fill="#ffcb22" strokeWidth="2" />
                </g>
            );
    }
}

// ============================================
// ROBOT CHARACTER (bots)
// ============================================

const ROBOT_BODY = ['#cfe3f5', '#ffd84a', '#9be36a', '#ffb3be', '#c6b3ff', '#8fe0ea'];
const ROBOT_EYE = ['#5fd3e6', '#ffcb22', '#76e323', '#ff7b8a'];

function Robot({ pick }: { pick: (n: number) => number }) {
    const body = ROBOT_BODY[pick(ROBOT_BODY.length)];
    const eye = ROBOT_EYE[pick(ROBOT_EYE.length)];
    const shape = pick(2);

    return (
        <g stroke={INK} strokeLinejoin="round" strokeLinecap="round">
            {/* Body */}
            <path d="M18 104c0-16 12-24 32-24s32 8 32 24z" fill={body} strokeWidth="3" />
            <rect x="40" y="86" width="20" height="10" rx="3" fill="#fff" strokeWidth="2.4" />
            <circle cx="45" cy="91" r="2" fill="#e94359" stroke="none" />
            <circle cx="55" cy="91" r="2" fill="#76e323" stroke="none" />

            {/* Neck */}
            <rect x="43" y="70" width="14" height="12" fill="#9fb3c8" strokeWidth="3" />

            {/* Antenna */}
            <path d="M50 22V10" strokeWidth="3" />
            <circle cx="50" cy="9" r="5" fill="#e94359" strokeWidth="3" />

            {/* Ears */}
            <rect x="14" y="40" width="10" height="18" rx="4" fill="#9fb3c8" strokeWidth="3" />
            <rect x="76" y="40" width="10" height="18" rx="4" fill="#9fb3c8" strokeWidth="3" />

            {/* Head */}
            {shape === 0
                ? <rect x="22" y="22" width="56" height="50" rx="14" fill={body} strokeWidth="3" />
                : <path d="M50 21c17 0 28 10 28 26S67 73 50 73 22 63 22 47s11-26 28-26z" fill={body} strokeWidth="3" />}
            <path d="M30 30c6-4 14-5 22-4" fill="none" stroke="#fff" strokeWidth="3" opacity=".7" />

            {/* Visor */}
            <rect x="29" y="37" width="42" height="20" rx="10" fill="#17365c" strokeWidth="2.6" />
            <ellipse cx="40" cy="47" rx="5" ry="5.5" fill={eye} stroke="none" />
            <ellipse cx="60" cy="47" rx="5" ry="5.5" fill={eye} stroke="none" />
            <circle cx="41.5" cy="45.5" r="1.6" fill="#fff" stroke="none" />
            <circle cx="61.5" cy="45.5" r="1.6" fill="#fff" stroke="none" />

            {/* Mouth grille */}
            <path d="M40 64h20" strokeWidth="3" />
            <path d="M45 61.5v5M50 61.5v5M55 61.5v5" strokeWidth="2" />
        </g>
    );
}
