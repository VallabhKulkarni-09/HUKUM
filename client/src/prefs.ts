// ============================================
// HUKUM - LOCAL DEVICE PREFERENCES
// Nickname and sound setting, stored in this browser only.
// Not an account; nothing is sent to the server until you join a room.
// ============================================

const NAME_KEY = 'hukum.name';
const MUTED_KEY = 'hukum.muted';

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

export function loadMuted(): boolean {
    return read(MUTED_KEY) === '1';
}

export function saveMuted(muted: boolean): void {
    write(MUTED_KEY, muted ? '1' : '0');
}
