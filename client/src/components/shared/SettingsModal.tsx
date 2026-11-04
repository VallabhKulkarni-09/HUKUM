// ============================================
// HUKUM - SETTINGS
// Music and sound effects (on/off + volume), vibration, How to Play.
// ============================================

import { useId } from 'react';
import { Modal } from '../ui/Modal';
import { BookIcon, MusicIcon, SoundIcon, VibrateIcon } from '../ui/Icons';
import { canVibrate } from '../../audio/haptics';
import type { AudioPrefs } from '../../prefs';

interface SettingsModalProps {
    audio: AudioPrefs;
    onChangeAudio: (next: Partial<AudioPrefs>) => void;
    /** Shown only where there is no other How to Play button (the game table) */
    onOpenRules?: () => void;
    onClose: () => void;
}

export function SettingsModal({ audio, onChangeAudio, onOpenRules, onClose }: SettingsModalProps) {
    return (
        <Modal title="Settings" onClose={onClose}>
            <div className="well settings-list">
                <AudioRow
                    label="Music"
                    icon={<MusicIcon muted={!audio.musicOn} width={32} height={32} />}
                    on={audio.musicOn}
                    volume={audio.musicVolume}
                    onToggle={() => onChangeAudio({ musicOn: !audio.musicOn })}
                    onVolume={v => onChangeAudio({ musicVolume: v })}
                />
                <AudioRow
                    label="Sound effects"
                    icon={<SoundIcon muted={!audio.sfxOn} width={32} height={32} />}
                    on={audio.sfxOn}
                    volume={audio.sfxVolume}
                    onToggle={() => onChangeAudio({ sfxOn: !audio.sfxOn })}
                    onVolume={v => onChangeAudio({ sfxVolume: v })}
                />
                {canVibrate() && (
                    <div className="list-row">
                        <VibrateIcon width={32} height={32} />
                        <span className="list-row-label">Vibration</span>
                        <button
                            type="button"
                            role="switch"
                            className="toggle"
                            aria-checked={audio.vibration}
                            aria-label="Vibration"
                            onClick={() => onChangeAudio({ vibration: !audio.vibration })}
                        />
                    </div>
                )}
                {onOpenRules && (
                    <div className="list-row">
                        <BookIcon width={32} height={32} />
                        <span className="list-row-label">How to Play</span>
                        <button type="button" className="btn btn-sm" onClick={onOpenRules}>
                            Open
                        </button>
                    </div>
                )}
            </div>
            <p className="settings-credits">
                Music: “Happy Vibes” by Ruskerdax, “Party Theme” by gilzoide. Sounds: Kenney. All CC0.
            </p>
        </Modal>
    );
}

interface AudioRowProps {
    label: string;
    icon: React.ReactNode;
    on: boolean;
    volume: number;
    onToggle: () => void;
    onVolume: (v: number) => void;
}

function AudioRow({ label, icon, on, volume, onToggle, onVolume }: AudioRowProps) {
    const id = useId();
    const pct = Math.round(volume * 100);
    return (
        <div className={`list-row audio-row ${on ? '' : 'off'}`}>
            <div className="audio-row-top">
                {icon}
                <span className="list-row-label" id={`${id}-label`}>{label}</span>
                <button
                    type="button"
                    role="switch"
                    className="toggle"
                    aria-checked={on}
                    aria-labelledby={`${id}-label`}
                    onClick={onToggle}
                />
            </div>
            <input
                type="range"
                className="slider"
                min={0}
                max={100}
                step={5}
                value={pct}
                disabled={!on}
                aria-label={`${label} volume`}
                aria-valuetext={`${pct}%`}
                style={{ '--pct': `${pct}%` } as React.CSSProperties}
                onChange={e => onVolume(Number(e.target.value) / 100)}
            />
        </div>
    );
}
