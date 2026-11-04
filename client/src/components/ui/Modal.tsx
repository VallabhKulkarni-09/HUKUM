// ============================================
// HUKUM - MODAL (blue game panel with ribbon title)
// ============================================

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from './Icons';

export type RibbonTone = 'green' | 'yellow' | 'red';

interface ModalProps {
    title: string;
    children: ReactNode;
    /** Omit to make the modal non-dismissable (e.g. result screens) */
    onClose?: () => void;
    ribbon?: RibbonTone;
    wide?: boolean;
    className?: string;
    /** Label read by screen readers; defaults to title */
    ariaLabel?: string;
}

export function Modal({ title, children, onClose, ribbon = 'green', wide = false, className = '', ariaLabel }: ModalProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Escape closes; move focus into the dialog when it opens
    useEffect(() => {
        const prev = document.activeElement as HTMLElement | null;
        const panel = panelRef.current;
        const focusable = panel?.querySelector<HTMLElement>('[autofocus], input, button:not(.panel-close)');
        (focusable ?? panel)?.focus({ preventScroll: true });

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose) onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            prev?.focus?.({ preventScroll: true });
        };
    }, [onClose]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                ref={panelRef}
                className={`panel ${wide ? 'wide' : ''} ${className}`}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel ?? title}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`ribbon ${ribbon === 'green' ? '' : ribbon}`}>
                    <span className="ribbon-face" />
                    <h2>{title}</h2>
                </div>
                {onClose && (
                    <button type="button" className="panel-close" onClick={onClose} aria-label="Close">
                        <CloseIcon />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
}
