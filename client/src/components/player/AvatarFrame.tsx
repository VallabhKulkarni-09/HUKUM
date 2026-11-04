// ============================================
// HUKUM - AVATAR FRAME (avatar + team ring + status badges)
// ============================================

import type { ReactNode } from 'react';
import type { TeamId } from '../../types';
import { Avatar } from './Avatar';
import './player.css';

interface AvatarFrameProps {
    name: string;
    isBot?: boolean;
    team?: TeamId;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    isTurn?: boolean;
    isDim?: boolean;
    className?: string;
    children?: ReactNode;
}

export function AvatarFrame({ name, isBot = false, team, size = 'md', isTurn = false, isDim = false, className = '', children }: AvatarFrameProps) {
    const classes = [
        'avatar-frame',
        size,
        team ? `team-${team.toLowerCase()}` : '',
        isTurn ? 'turn' : '',
        isDim ? 'dim' : '',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classes}>
            <Avatar name={name} isBot={isBot} />
            {children}
        </div>
    );
}
