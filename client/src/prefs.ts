// ============================================
// HUKUM - LOCAL DEVICE PREFERENCES
// Nickname, audio and vibration settings, stored in this browser only.
// Not an account; nothing is sent to the server until you join a room.
// ============================================

const NAME_KEY = 'hukum.name';
const LEGACY_MUTED_KEY = 'hukum.muted';
const AUDIO_KEY = 'hukum.audio';

const ADJECTIVES = ['Lucky', 'Brave', 'Swift', 'Clever', 'Happy', 'Royal', 'Sunny', 'Mighty', 'Jolly', 'Cosmic', 'Golden', 'Bold'];
const NOUNS = ['Tiger', 'Mango', 'Falcon', 'Panda', 'Comet', 'Lotus', 'Rocket', 'Cobra', 'Peacock', 'Ace', 'Joker', 'Rhino'];

export const NAME_MAX = 20;

export function randomName(): string {
    const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    return `${a} ${n}`;
}

function read(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null; // storage blocked (private mode)
    }
}

function write(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage blocked; keep the value for this session only
    }
}

export function loadName(): string {
    const saved = read(NAME_KEY)?.trim();
    if (saved) return saved.slice(0, NAME_MAX);
    const fresh = randomName();
    write(NAME_KEY, fresh);
    return fresh;
}

export function saveName(name: string): void {
    write(NAME_KEY, name.trim().slice(0, NAME_MAX));
}

// ---- Audio + vibration ----

export interface AudioPrefs {
    musicOn: boolean;
    sfxOn: boolean;
    musicVolume: number; // 0..1
    sfxVolume: number;   // 0..1
    vibration: boolean;
}

export const DEFAULT_AUDIO: AudioPrefs = {
    musicOn: true,
    sfxOn: true,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    vibration: false,
};

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function loadAudioPrefs(): AudioPrefs {
    const raw = read(AUDIO_KEY);
    if (raw) {
        try {
            const p = JSON.parse(raw) as Partial<AudioPrefs>;
            return {
                musicOn: bool(p.musicOn, DEFAULT_AUDIO.musicOn),
                sfxOn: bool(p.sfxOn, DEFAULT_AUDIO.sfxOn),
                musicVolume: clamp01(p.musicVolume, DEFAULT_AUDIO.musicVolume),
                sfxVolume: clamp01(p.sfxVolume, DEFAULT_AUDIO.sfxVolume),
                vibration: bool(p.vibration, DEFAULT_AUDIO.vibration),
            };
        } catch {
            // fall through to defaults
        }
    }
    // Older versions had a single mute switch
    if (read(LEGACY_MUTED_KEY) === '1') return { ...DEFAULT_AUDIO, musicOn: false, sfxOn: false };
    return { ...DEFAULT_AUDIO };
}

export function saveAudioPrefs(p: AudioPrefs): void {
    write(AUDIO_KEY, JSON.stringify(p));
}
