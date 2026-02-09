// ============================================
// HUKUM GAME - SOUND MANAGER (Web Audio API)
// ============================================

// Sound effect types
type SoundName =
    | 'cardDeal'
    | 'cardPlay'
    | 'cardShuffle'
    | 'trickWin'
    | 'vakkaiDeclare'
    | 'matchWin'
    | 'matchLose'
    | 'buttonClick'
    | 'playerJoin'
    | 'notification';

class SoundManager {
    private audioContext: AudioContext | null = null;
    private _muted = false;
    private _volume = 0.5;

    /**
     * Get or create AudioContext
     */
    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }
        return this.audioContext;
    }

    /**
     * Initialize (resume AudioContext if suspended)
     */
    init(): void {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        console.log('🔊 Sound manager initialized');
    }

    /**
     * Play a procedurally generated sound
     */
    play(name: SoundName): void {
        if (this._muted) return;

        try {
            const ctx = this.getContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            switch (name) {
                case 'cardDeal':
                case 'cardPlay':
                    this.playCardSound(ctx);
                    break;
                case 'cardShuffle':
                    this.playShuffleSound(ctx);
                    break;
                case 'trickWin':
                case 'matchWin':
                    this.playWinSound(ctx);
                    break;
                case 'vakkaiDeclare':
                    this.playVakkaiSound(ctx);
                    break;
                case 'matchLose':
                    this.playLoseSound(ctx);
                    break;
                case 'buttonClick':
                    this.playClickSound(ctx);
                    break;
                case 'playerJoin':
                    this.playJoinSound(ctx);
                    break;
                case 'notification':
                    this.playNotificationSound(ctx);
                    break;
            }
        } catch {
            // Silently fail if audio can't play
        }
    }

    // Card flip/deal sound - short snap
    private playCardSound(ctx: AudioContext): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(this._volume * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    }

    // Shuffle sound - white noise burst
    private playShuffleSound(ctx: AudioContext): void {
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = buffer;
        gain.gain.value = this._volume * 0.2;

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
    }

    // Win sound - ascending arpeggio
    private playWinSound(ctx: AudioContext): void {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = ctx.currentTime + i * 0.1;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(this._volume * 0.3, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    // Vakkai declaration - dramatic chord
    private playVakkaiSound(ctx: AudioContext): void {
        const frequencies = [220, 277.18, 329.63, 440]; // A3, C#4, E4, A4

        frequencies.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(this._volume * 0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        });
    }

    // Lose sound - descending tones
    private playLoseSound(ctx: AudioContext): void {
        const notes = [440, 392, 349.23, 329.63]; // A4, G4, F4, E4

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = ctx.currentTime + i * 0.15;
            gain.gain.setValueAtTime(this._volume * 0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    }

    // Click sound - short pop
    private playClickSound(ctx: AudioContext): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.03);

        gain.gain.setValueAtTime(this._volume * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.03);
    }

    // Player join sound - friendly chime
    private playJoinSound(ctx: AudioContext): void {
        const notes = [523.25, 659.25]; // C5, E5

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const startTime = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(this._volume * 0.25, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.2);
        });
    }

    // Notification sound - soft ping
    private playNotificationSound(ctx: AudioContext): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 880; // A5

        gain.gain.setValueAtTime(this._volume * 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    }

    /**
     * Set master volume (0-1)
     */
    setVolume(volume: number): void {
        this._volume = Math.max(0, Math.min(1, volume));
    }

    get volume(): number {
        return this._volume;
    }

    toggleMute(): boolean {
        this._muted = !this._muted;
        return this._muted;
    }

    get muted(): boolean {
        return this._muted;
    }

    setMuted(muted: boolean): void {
        this._muted = muted;
    }
}

// Singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSound = (name: SoundName) => soundManager.play(name);
export const initSounds = () => soundManager.init();
