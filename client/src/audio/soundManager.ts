// ============================================
// HUKUM - AUDIO ENGINE (Web Audio API)
// Sound effects and looping music from /public/audio (CC0, see CREDITS.md).
//
// - One AudioContext; master → { sfx bus, music bus } with separate volumes.
// - Files are fetched and decoded up front (decoding works while the context
//   is still suspended), so the first play has no delay.
// - Browsers only allow audio after a user gesture: the context resumes on
//   the first tap/key press, and music starts then.
// - Music loops with a short crossfade at the seam (MP3 adds encoder padding,
//   so the exact loop length comes from the manifest below).
// - Audio is suspended while the tab is hidden.
// ============================================

export type SoundName =
    | 'cardDeal'
    | 'cardPlay'
    | 'cardShuffle'
    | 'trickCollect'
    | 'trickMine'
    | 'hukumChosen'
    | 'vakkaiDeclare'
    | 'turnNotify'
    | 'handWin'
    | 'handLose'
    | 'matchWin'
    | 'matchLose'
    | 'buttonClick'
    | 'toggle'
    | 'chat'
    | 'playerJoin'
    | 'playerLeave'
    | 'error';

export type MusicTrack = 'lobby' | 'table';

const BASE = `${import.meta.env.BASE_URL}audio/`;
const range = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);

interface SfxDef {
    files: string[];
    gain?: number;
    /** ± random pitch variation (fraction), for natural repeats */
    vary?: number;
    /** Minimum ms between plays (deal flights land in quick succession) */
    throttle?: number;
    /** Lower the music while this plays (jingles) */
    duck?: boolean;
    /** Play only part of the file (seconds) */
    duration?: number;
}

const SFX: Record<SoundName, SfxDef> = {
    cardDeal: { files: range('card-slide', 8), gain: 0.8, vary: 0.06, throttle: 45 },
    cardPlay: { files: range('card-place', 4), vary: 0.05, throttle: 60 },
    cardShuffle: { files: ['card-shuffle'], gain: 0.9, duration: 1.25 },
    trickCollect: { files: range('card-shove', 4), vary: 0.05 },
    trickMine: { files: ['trick-mine'], gain: 0.7 },
    hukumChosen: { files: ['hukum'], duck: true },
    vakkaiDeclare: { files: ['vakkai'], duck: true },
    turnNotify: { files: ['turn'], gain: 0.8, throttle: 300 },
    handWin: { files: ['hand-win'], duck: true },
    handLose: { files: ['hand-lose'], duck: true },
    matchWin: { files: ['match-win'], duck: true },
    matchLose: { files: ['match-lose'], duck: true },
    buttonClick: { files: ['tap'], gain: 0.7, throttle: 40 },
    toggle: { files: ['toggle'], gain: 0.7 },
    chat: { files: ['chat'], throttle: 150 },
    playerJoin: { files: ['join'], gain: 0.8, throttle: 200 },
    playerLeave: { files: ['leave'], gain: 0.8, throttle: 200 },
    error: { files: ['error'], gain: 0.8, throttle: 400 },
};

/** Exact loop lengths (samples at 44.1 kHz) from the conversion script */
const MUSIC: Record<MusicTrack, { file: string; samples: number; gain: number }> = {
    lobby: { file: 'lobby', samples: 2001556, gain: 0.9 },
    table: { file: 'table', samples: 2116712, gain: 0.75 },
};

const LOOP_XFADE = 0.06;
const TRACK_FADE = 0.9;

export interface AudioSettings {
    musicOn: boolean;
    sfxOn: boolean;
    musicVolume: number; // 0..1
    sfxVolume: number;   // 0..1
}

/** Perceptual-ish volume curve so the slider feels even */
const curve = (v: number) => Math.pow(Math.max(0, Math.min(1, v)), 1.6);

interface Voice { src: AudioBufferSourceNode; gain: GainNode; endsAt: number }

class AudioEngine {
    private ctx: AudioContext | null = null;
    private master!: GainNode;
    private sfxBus!: GainNode;
    private musicBus!: GainNode;
    private duckNode!: GainNode;

    private buffers = new Map<string, AudioBuffer>();
    private loading = new Map<string, Promise<AudioBuffer | null>>();
    private lastPlayed = new Map<SoundName, number>();
    private lastVariant = new Map<SoundName, number>();

    private settings: AudioSettings = { musicOn: true, sfxOn: true, musicVolume: 0.5, sfxVolume: 0.8 };
    private unlocked = false;

    // Music state
    private wantTrack: MusicTrack | null = null;
    private current: { track: MusicTrack; out: GainNode; voices: Voice[]; offset: number; next: number; timer: number } | null = null;
    private duckUntil = 0;

    // ---------- setup ----------

    private context(): AudioContext | null {
        if (this.ctx) return this.ctx;
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        const ctx = new Ctor();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.sfxBus = ctx.createGain();
        this.musicBus = ctx.createGain();
        this.duckNode = ctx.createGain();
        this.sfxBus.connect(this.master);
        this.musicBus.connect(this.duckNode).connect(this.master);
        this.master.connect(ctx.destination);
        this.applyVolumes(true);

        // Resume on the first gesture (autoplay policy), then start any requested music
        const unlock = () => {
            ctx.resume().then(() => {
                this.unlocked = true;
                this.syncMusic();
            }).catch(() => { });
            if (ctx.state === 'running') {
                window.removeEventListener('pointerdown', unlock, true);
                window.removeEventListener('keydown', unlock, true);
            }
        };
        window.addEventListener('pointerdown', unlock, true);
        window.addEventListener('keydown', unlock, true);

        // Pause everything in the background (saves battery, avoids music from a hidden tab)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) ctx.suspend().catch(() => { });
            else if (this.unlocked) ctx.resume().catch(() => { });
        });
        return ctx;
    }

    /** Start fetching and decoding all sounds. Safe to call more than once. */
    init(): void {
        const ctx = this.context();
        if (!ctx) return;
        for (const def of Object.values(SFX)) def.files.forEach(f => void this.load(`sfx/${f}`));
        if (this.settings.musicOn) for (const m of Object.values(MUSIC)) void this.load(`music/${m.file}`);
    }

    private load(path: string): Promise<AudioBuffer | null> {
        const have = this.buffers.get(path);
        if (have) return Promise.resolve(have);
        const pending = this.loading.get(path);
        if (pending) return pending;
        const ctx = this.context();
        if (!ctx) return Promise.resolve(null);
        const p = fetch(`${BASE}${path}.mp3`)
            .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} ${path}`))))
            .then(data => new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(data, resolve, reject)))
            .then(buf => {
                this.buffers.set(path, buf);
                return buf;
            })
            .catch(() => {
                this.loading.delete(path); // allow a retry later
                return null;
            });
        this.loading.set(path, p);
        return p;
    }

    // ---------- settings ----------

    configure(next: Partial<AudioSettings>): void {
        const before = this.settings;
        this.settings = { ...before, ...next };
        if (!this.ctx) return;
        this.applyVolumes(false);
        if (this.settings.musicOn && !before.musicOn) for (const m of Object.values(MUSIC)) void this.load(`music/${m.file}`);
        if (this.settings.musicOn !== before.musicOn) this.syncMusic();
    }

    get config(): AudioSettings {
        return this.settings;
    }

    private applyVolumes(immediate: boolean) {
        const ctx = this.ctx!;
        const t = ctx.currentTime;
        const set = (g: GainNode, v: number) => {
            g.gain.cancelScheduledValues(t);
            if (immediate) g.gain.setValueAtTime(v, t);
            else g.gain.setTargetAtTime(v, t, 0.05);
        };
        set(this.sfxBus, this.settings.sfxOn ? curve(this.settings.sfxVolume) : 0);
        set(this.musicBus, this.settings.musicOn ? curve(this.settings.musicVolume) * 0.6 : 0);
    }

    // ---------- sound effects ----------

    play(name: SoundName): void {
        const def = SFX[name];
        if (!def || !this.settings.sfxOn) return;
        const ctx = this.context();
        if (!ctx || ctx.state !== 'running') return;

        const now = performance.now();
        if (def.throttle && now - (this.lastPlayed.get(name) ?? -1e9) < def.throttle) return;

        // Pick a variant, avoiding an immediate repeat
        let idx = 0;
        if (def.files.length > 1) {
            idx = Math.floor(Math.random() * def.files.length);
            if (idx === this.lastVariant.get(name)) idx = (idx + 1) % def.files.length;
        }
        const buf = this.buffers.get(`sfx/${def.files[idx]}`);
        if (!buf) {
            void this.load(`sfx/${def.files[idx]}`);
            return; // not decoded yet: skip rather than play late
        }
        this.lastPlayed.set(name, now);
        this.lastVariant.set(name, idx);

        const src = ctx.createBufferSource();
        src.buffer = buf;
        if (def.vary) src.playbackRate.value = 1 + (Math.random() * 2 - 1) * def.vary;
        const g = ctx.createGain();
        g.gain.value = def.gain ?? 1;
        src.connect(g).connect(this.sfxBus);
        const t = ctx.currentTime;
        if (def.duration) {
            const end = t + def.duration;
            g.gain.setValueAtTime(def.gain ?? 1, end - 0.2);
            g.gain.linearRampToValueAtTime(0, end);
            src.start(t, 0, def.duration);
        } else {
            src.start(t);
        }
        if (def.duck) this.duck(buf.duration);
    }

    /** Dip the music under a jingle, then bring it back */
    private duck(seconds: number) {
        const ctx = this.ctx!;
        const t = ctx.currentTime;
        const until = t + seconds + 0.15;
        const g = this.duckNode.gain;
        if (t >= this.duckUntil) {
            g.cancelScheduledValues(t);
            g.setTargetAtTime(0.3, t, 0.04);
        }
        this.duckUntil = Math.max(this.duckUntil, until);
        g.cancelScheduledValues(this.duckUntil);
        g.setTargetAtTime(1, this.duckUntil, 0.25);
    }

    // ---------- music ----------

    /** Choose the background track for the current screen (null = silence). */
    setMusic(track: MusicTrack | null): void {
        this.wantTrack = track;
        this.syncMusic();
    }

    private syncMusic() {
        const ctx = this.ctx;
        if (!ctx || !this.unlocked) return;
        const want = this.settings.musicOn ? this.wantTrack : null;
        if (this.current?.track === want) return;
        if (this.current) this.stopCurrent();
        if (!want) return;

        const def = MUSIC[want];
        void this.load(`music/${def.file}`).then(buf => {
            // Settings or screen may have changed while loading
            const stillWanted = (this.settings.musicOn ? this.wantTrack : null) === want;
            if (!buf || !stillWanted || this.current?.track === want) return;
            this.startTrack(want, buf);
        });
    }

    private startTrack(track: MusicTrack, buf: AudioBuffer) {
        const ctx = this.ctx!;
        const def = MUSIC[track];
        // Skip leading encoder padding: first non-silent sample
        const ch = buf.getChannelData(0);
        let first = 0;
        const limit = Math.min(ch.length, Math.floor(buf.sampleRate * 0.2));
        while (first < limit && Math.abs(ch[first]) < 1e-4) first++;
        const offset = first / buf.sampleRate;
        const loopLen = Math.min(def.samples / 44100, buf.duration - offset);

        const out = ctx.createGain();
        out.gain.setValueAtTime(0, ctx.currentTime);
        out.gain.linearRampToValueAtTime(def.gain, ctx.currentTime + TRACK_FADE);
        out.connect(this.musicBus);

        const state = { track, out, voices: [] as Voice[], offset, next: ctx.currentTime + 0.05, timer: 0 };
        const schedule = () => {
            // Keep ~2 s of audio scheduled ahead; each segment crossfades into the next
            while (state.next < ctx.currentTime + 2) {
                const start = state.next;
                const src = ctx.createBufferSource();
                src.buffer = buf;
                const g = ctx.createGain();
                g.gain.setValueAtTime(0, start);
                g.gain.linearRampToValueAtTime(1, start + LOOP_XFADE);
                g.gain.setValueAtTime(1, start + loopLen);
                g.gain.linearRampToValueAtTime(0, start + loopLen + LOOP_XFADE);
                src.connect(g).connect(out);
                src.start(start, offset, loopLen + LOOP_XFADE);
                state.voices.push({ src, gain: g, endsAt: start + loopLen + LOOP_XFADE });
                state.next = start + loopLen;
            }
            state.voices = state.voices.filter(v => v.endsAt > ctx.currentTime);
        };
        schedule();
        state.timer = window.setInterval(schedule, 500);
        this.current = state;
    }

    private stopCurrent() {
        const ctx = this.ctx!;
        const cur = this.current!;
        this.current = null;
        window.clearInterval(cur.timer);
        const t = ctx.currentTime;
        cur.out.gain.cancelScheduledValues(t);
        cur.out.gain.setValueAtTime(cur.out.gain.value, t);
        cur.out.gain.linearRampToValueAtTime(0, t + TRACK_FADE * 0.6);
        for (const v of cur.voices) {
            try { v.src.stop(t + TRACK_FADE * 0.6 + 0.05); } catch { /* already stopped */ }
        }
        window.setTimeout(() => cur.out.disconnect(), (TRACK_FADE + 0.3) * 1000);
    }
}

export const soundManager = new AudioEngine();

export const playSound = (name: SoundName) => soundManager.play(name);
export const initSounds = () => soundManager.init();
