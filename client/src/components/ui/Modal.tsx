// ============================================
// HUKUM - MODAL (blue game panel with ribbon title)
// ============================================

import { useEffect, useRef, useState } from 'react';
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
    // Element that had focus before the dialog opened (read before children autofocus)
    const [opener] = useState(() => document.activeElement as HTMLElement | null);
    // Latest onClose, so a parent re-render (new function) doesn't re-run the focus effect
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });

    // Once on open: move focus into the dialog, Escape closes, focus returns on close.
    useEffect(() => {
        const panel = panelRef.current;
        if (panel && !panel.contains(document.activeElement)) {
            const focusable = panel.querySelector<HTMLElement>('input, textarea, select')
                ?? panel.querySelector<HTMLElement>('button:not(.panel-close)');
            (focusable ?? panel).focus({ preventScroll: true });
        }

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCloseRef.current?.();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            opener?.focus?.({ preventScroll: true });
        };
    }, [opener]);

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
