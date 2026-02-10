// ============================================
// HUKUM GAME - SOUND MANAGER (Web Audio API)
// Immersive, realistic card game sounds
// ============================================

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
    | 'notification'
    | 'turnNotify'
    | 'handWin';

class SoundManager {
    private audioContext: AudioContext | null = null;
    private _muted = false;
    private _volume = 0.5;

    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }
        return this.audioContext;
    }

    init(): void {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
    }

    play(name: SoundName): void {
        if (this._muted) return;

        try {
            const ctx = this.getContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            switch (name) {
                case 'cardDeal':
                    this.playCardDealSound(ctx);
                    break;
                case 'cardPlay':
                    this.playCardPlaySound(ctx);
                    break;
                case 'cardShuffle':
                    this.playShuffleSound(ctx);
                    break;
                case 'trickWin':
                case 'handWin':
                    this.playTrickWinSound(ctx);
                    break;
                case 'matchWin':
                    this.playMatchWinSound(ctx);
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
                case 'turnNotify':
                    this.playTurnNotifySound(ctx);
                    break;
            }
        } catch {
            // Silently fail if audio can't play
        }
    }

    // Card deal — light flick/snap
    private playCardDealSound(ctx: AudioContext): void {
        const bufferSize = Math.floor(ctx.sampleRate * 0.04);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 4) * 0.8;
        }

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'highpass';
        filter.frequency.value = 2000;

        source.buffer = buffer;
        gain.gain.value = this._volume * 0.4;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();
    }

    // Card play — satisfying thud with a click
    private playCardPlaySound(ctx: AudioContext): void {
        // Thud component
        const bufferSize = Math.floor(ctx.sampleRate * 0.08);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            // Mix noise with low-freq sine for thud
            data[i] = ((Math.random() * 2 - 1) * 0.3 + Math.sin(2 * Math.PI * 120 * t) * 0.7)
                * Math.pow(1 - t, 3);
        }

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.value = 600;

        source.buffer = buffer;
        gain.gain.value = this._volume * 0.5;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();

        // Click component
        const osc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);
        clickGain.gain.setValueAtTime(this._volume * 0.2, ctx.currentTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(clickGain);
        clickGain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.04);
    }

    // Shuffle — longer noise burst
    private playShuffleSound(ctx: AudioContext): void {
        const bufferSize = Math.floor(ctx.sampleRate * 0.2);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            // Rumble with modulation
            data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * 0.6;
        }

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        source.buffer = buffer;
        gain.gain.value = this._volume * 0.25;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();
    }

    // Trick win — swoosh + short chime
    private playTrickWinSound(ctx: AudioContext): void {
        // Swoosh (noise sweep)
        const bufferSize = Math.floor(ctx.sampleRate * 0.15);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const t = i / bufferSize;
            data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * 0.5;
        }

        const source = ctx.createBufferSource();
        const swooshGain = ctx.createGain();
        const swooshFilter = ctx.createBiquadFilter();
        swooshFilter.type = 'bandpass';
        swooshFilter.frequency.setValueAtTime(400, ctx.currentTime);
        swooshFilter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.15);

        source.buffer = buffer;
        swooshGain.gain.value = this._volume * 0.2;
        source.connect(swooshFilter);
        swooshFilter.connect(swooshGain);
        swooshGain.connect(ctx.destination);
        source.start();

        // Chime
        const notes = [659.25, 783.99]; // E5, G5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = ctx.currentTime + 0.1 + i * 0.08;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(this._volume * 0.25, start + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.2);
        });
    }

    // Match win — triumphant fanfare
    private playMatchWinSound(ctx: AudioContext): void {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.5]; // C5, E5, G5, C6, E6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = i < 3 ? 'sine' : 'triangle';
            osc.frequency.value = freq;
            const start = ctx.currentTime + i * 0.12;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(this._volume * 0.3, start + 0.05);
            gain.gain.setValueAtTime(this._volume * 0.3, start + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.5);
        });
    }

    // Vakkai declaration — dramatic power chord
    private playVakkaiSound(ctx: AudioContext): void {
        const frequencies = [220, 277.18, 329.63, 440];
        frequencies.forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(this._volume * 0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.6);
        });
    }

    // Lose — descending sad tones
    private playLoseSound(ctx: AudioContext): void {
        const notes = [440, 392, 349.23, 293.66]; // A4, G4, F4, D4
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = ctx.currentTime + i * 0.18;
            gain.gain.setValueAtTime(this._volume * 0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.3);
        });
    }

    // Click — crisp pop
    private playClickSound(ctx: AudioContext): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.025);
        gain.gain.setValueAtTime(this._volume * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.03);
    }

    // Player join — friendly two-tone chime
    private playJoinSound(ctx: AudioContext): void {
        [523.25, 659.25].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(this._volume * 0.2, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.2);
        });
    }

    // Notification — soft ping
    private playNotificationSound(ctx: AudioContext): void {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(this._volume * 0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    }

    // Turn notify — gentle ascending chime
    private playTurnNotifySound(ctx: AudioContext): void {
        const notes = [880, 1108.73, 1318.5]; // A5, C#6, E6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = ctx.currentTime + i * 0.06;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(this._volume * 0.15, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.15);
        });
    }

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
