// ============================================
// HUKUM - SETTINGS
// ============================================

import { Modal } from '../ui/Modal';
import { BookIcon, SoundIcon } from '../ui/Icons';

interface SettingsModalProps {
    muted: boolean;
    onToggleMute: () => void;
    /** Shown only where there is no other How to Play button (the game table) */
    onOpenRules?: () => void;
    onClose: () => void;
}

export function SettingsModal({ muted, onToggleMute, onOpenRules, onClose }: SettingsModalProps) {
    return (
        <Modal title="Settings" onClose={onClose}>
            <div className="well settings-list">
                <div className="list-row">
                    <SoundIcon muted={muted} width={32} height={32} />
                    <span className="list-row-label">Sound</span>
                    <button
                        type="button"
                        role="switch"
                        className="toggle"
                        aria-checked={!muted}
                        aria-label="Sound"
                        onClick={onToggleMute}
                    />
                </div>
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
        </Modal>
    );
}
