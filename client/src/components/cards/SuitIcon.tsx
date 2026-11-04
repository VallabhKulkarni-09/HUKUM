// ============================================
// HUKUM - SUIT GLYPHS (SVG, renders the same on every device)
// ============================================

import type { SVGProps } from 'react';
import type { Suit } from '../../types';

const PATHS: Record<Suit, string> = {
    HEART: 'M50 90C22 68 5 52 5 32 5 17 16 7 30 7c9 0 16 5 20 12 4-7 11-12 20-12 14 0 25 10 25 25 0 20-17 36-45 58z',
    DIAMOND: 'M50 3c10 17 24 33 40 47-16 14-30 30-40 47C40 80 26 64 10 50 26 36 40 20 50 3z',
    SPADE: 'M50 5c12 18 43 33 43 56 0 14-11 22-22 22-7 0-13-3-17-8 1 8 5 14 13 18H33c8-4 12-10 13-18-4 5-10 8-17 8-11 0-22-8-22-22C7 38 38 23 50 5z',
    CLUB: 'M50 7a19 19 0 0 1 17.6 26.2A19 19 0 1 1 55.5 66c1.3 9 5.3 15.8 12.5 20H32c7.2-4.2 11.2-11 12.5-20A19 19 0 1 1 32.4 33.2 19 19 0 0 1 50 7z',
};

interface SuitIconProps extends SVGProps<SVGSVGElement> {
    suit: Suit;
    /** Draw a dark outline (for use on coloured backgrounds) */
    outlined?: boolean;
}

export function SuitIcon({ suit, outlined = false, ...rest }: SuitIconProps) {
    const red = suit === 'HEART' || suit === 'DIAMOND';
    return (
        <svg viewBox="0 0 100 100" aria-hidden {...rest}>
            <path
                d={PATHS[suit]}
                fill={red ? 'var(--suit-red)' : 'var(--suit-black)'}
                stroke={outlined ? 'var(--ink)' : 'none'}
                strokeWidth={outlined ? 7 : 0}
                strokeLinejoin="round"
                paintOrder="stroke"
            />
        </svg>
    );
}
