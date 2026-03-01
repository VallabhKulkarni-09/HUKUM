// ============================================
// HUKUM GAME - RULES PANEL (slide-out)
// ============================================

import { useState } from 'react';
import './RulesPanel.css';

export function RulesPanel() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                className="rules-toggle"
                onClick={() => setIsOpen(true)}
                title="How to Play"
            >
                ❓
            </button>

            {isOpen && (
                <div className="rules-backdrop" onClick={() => setIsOpen(false)}>
                    <div className="rules-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="rules-header">
                            <h2>How to Play Hukum</h2>
                            <button className="rules-close" onClick={() => setIsOpen(false)}>✕</button>
                        </div>

                        <div className="rules-content">
                            <section>
                                <h3>🎯 Overview</h3>
                                <ul>
                                    <li><strong>4 players</strong> in 2 teams (A vs B)</li>
                                    <li><strong>32-card deck</strong> — A, K, Q, J, 10, 9, 8, 7 of each suit</li>
                                    <li><strong>Win condition:</strong> First team to reach <strong>+16 points</strong> (or opponent hits −16)</li>
                                    <li>Scoring is <strong>zero-sum</strong> — one team gains, the other loses equally</li>
                                </ul>
                            </section>

                            <section>
                                <h3>🃏 Hand Flow</h3>
                                <ol>
                                    <li><strong>Deal 4 cards</strong> to each player</li>
                                    <li><strong>Vakkai decision</strong> — each player can declare Vakkai or pass</li>
                                    <li><strong>If no Vakkai:</strong> Player next to dealer picks the <strong>Hukum (trump suit)</strong> from their 4 cards</li>
                                    <li><strong>Deal remaining 4 cards</strong> (8 total per player)</li>
                                    <li><strong>Play tricks</strong> until a team wins the hand</li>
                                </ol>
                            </section>

                            <section>
                                <h3>🂠 Trick Rules</h3>
                                <ul>
                                    <li><strong>Must follow suit</strong> — play the same suit as the lead card if you can</li>
                                    <li>If you don't have the lead suit, play <strong>any card</strong> (including trump)</li>
                                    <li><strong>Highest card of the lead suit</strong> wins, unless trumped</li>
                                    <li>If trump is played, <strong>highest trump</strong> wins</li>
                                    <li>Winner of a trick leads the next one</li>
                                </ul>
                            </section>

                            <section>
                                <h3>🏆 Scoring (Normal Hand)</h3>
                                <div className="rules-table">
                                    <div className="rules-row header">
                                        <span>Team</span>
                                        <span>Target</span>
                                        <span>Points</span>
                                    </div>
                                    <div className="rules-row">
                                        <span>Trump Team</span>
                                        <span>5 tricks</span>
                                        <span className="points-positive">+5</span>
                                    </div>
                                    <div className="rules-row">
                                        <span>Dealer Team</span>
                                        <span>4 tricks</span>
                                        <span className="points-positive">+10</span>
                                    </div>
                                </div>
                                <p className="rules-note">⚡ Hand ends immediately when a team reaches their target!</p>
                            </section>

                            <section>
                                <h3>⚡ Vakkai (High-Risk Play)</h3>
                                <p>A bold declaration: <em>"I'll win 4 consecutive tricks alone, without trump."</em></p>
                                <ul>
                                    <li>No trump suit exists during Vakkai</li>
                                    <li>Declarer leads every trick; partner sits out</li>
                                    <li><strong className="points-positive">Success (4 wins): +8 points</strong></li>
                                    <li><strong className="points-negative">Failure (any loss): −16 points</strong></li>
                                </ul>
                            </section>

                            <section>
                                <h3>🔄 Between Hands</h3>
                                <ul>
                                    <li>The team with the <strong>negative score</strong> picks the next dealer</li>
                                    <li>The other team gets to choose the trump (Hukum) next hand</li>
                                </ul>
                            </section>

                            <section className="rules-quickref">
                                <h3>📋 Quick Reference</h3>
                                <div className="quickref-grid">
                                    <div className="quickref-item">
                                        <span className="quickref-label">Trump 5 tricks</span>
                                        <span className="quickref-value positive">+5</span>
                                    </div>
                                    <div className="quickref-item">
                                        <span className="quickref-label">Dealer 4 tricks</span>
                                        <span className="quickref-value positive">+10</span>
                                    </div>
                                    <div className="quickref-item">
                                        <span className="quickref-label">Vakkai success</span>
                                        <span className="quickref-value positive">+8</span>
                                    </div>
                                    <div className="quickref-item">
                                        <span className="quickref-label">Vakkai failure</span>
                                        <span className="quickref-value negative">−16</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
