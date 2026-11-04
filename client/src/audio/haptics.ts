// ============================================
// HUKUM - VIBRATION (optional, off by default)
// Uses navigator.vibrate where available (Android browsers).
// iPhone Safari has no vibration API, so the setting is hidden there.
// ============================================

export type HapticName = 'turn' | 'vakkai' | 'handWin' | 'handLose' | 'matchWin';

const PATTERNS: Record<HapticName, number | number[]> = {
    turn: 35,
    vakkai: [40, 60, 90],
    handWin: [25, 50, 25],
    handLose: 80,
    matchWin: [40, 70, 40, 70, 120],
};

let enabled = false;

// Desktop Chrome exposes the API without a motor, so also require a touch screen
export const canVibrate = (): boolean =>
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function' &&
    !!window.matchMedia?.('(pointer: coarse)').matches;

export function setHapticsEnabled(on: boolean): void {
    enabled = on;
}

export function vibrate(name: HapticName): void {
    if (!enabled || !canVibrate() || document.hidden) return;
    try {
        navigator.vibrate(PATTERNS[name]);
    } catch {
        // Some browsers throw before a user gesture; ignore
    }
}
