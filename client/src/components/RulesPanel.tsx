// ============================================
// HUKUM - HOW TO PLAY
// ============================================

import { Modal } from './ui/Modal';
import { PlayingCard } from './cards/PlayingCard';
import type { Card } from '../types';
import './RulesPanel.css';

interface RulesPanelProps {
    onClose: () => void;
}

const EXAMPLE_LEAD: Card = { suit: 'HEART', rank: 'K', id: 'ex-hk' };
const EXAMPLE_FOLLOW: Card = { suit: 'HEART', rank: 'A', id: 'ex-ha' };
const EXAMPLE_TRUMP: Card = { suit: 'SPADE', rank: '7', id: 'ex-s7' };

export function RulesPanel({ onClose }: RulesPanelProps) {
    return (
        <Modal title="How to Play" onClose={onClose} wide className="rules-panel">
            <div className="panel-body rules">
                <section className="rules-card">
                    <h3 className="display">Overview</h3>
                    <ul>
                        <li><strong>4 players</strong> in 2 teams, Alpha and Bravo. Partners sit opposite each other.</li>
                        <li><strong>32-card deck</strong>: A, K, Q, J, 10, 9, 8, 7 of each suit.</li>
                        <li>First team to <strong>+16</strong> wins (or when the other team reaches −16).</li>
                        <li>Scoring is <strong>zero-sum</strong>: one team gains what the other loses.</li>
                    </ul>
                </section>

                <section className="rules-card">
                    <h3 className="display">The Toss</h3>
                    <ul>
                        <li>At the start of a match, <strong>all four players pick a face-down card</strong> at the same time.</li>
                        <li>Each team adds its two cards: A 8, K 7, Q 6, J 5, 10 4, 9 3, 8 2, 7 1.</li>
                        <li>The team with the <strong>lower total deals</strong>; the other team chooses the Hukum. Equal totals: everyone draws again.</li>
                        <li>The dealer is a random player from the dealing team.</li>
                    </ul>
                </section>

                <section className="rules-card">
                    <h3 className="display">Each Hand</h3>
                    <ol className="rules-steps">
                        <li><strong>4 cards</strong> are dealt to each player.</li>
                        <li><strong>Vakkai</strong>: eligible players may declare it or pass.</li>
                        <li>If no one declares, the player after the dealer picks the <strong>Hukum</strong> (trump suit) from their 4 cards.</li>
                        <li><strong>4 more cards</strong> are dealt (8 each).</li>
                        <li><strong>Play tricks</strong> until a team reaches its target.</li>
                    </ol>
                </section>

                <section className="rules-card">
                    <h3 className="display">Playing a Trick</h3>
                    <ul>
                        <li>You <strong>must follow suit</strong> if you can.</li>
                        <li>If you can't, play <strong>any card</strong>, including trump.</li>
                        <li>The <strong>highest trump</strong> wins. With no trump, the highest card of the led suit wins.</li>
                        <li>The trick winner leads the next trick.</li>
                    </ul>
                    <div className="rules-example" aria-label="Example: King of Hearts led, Ace of Hearts follows, 7 of Spades trumps">
                        <figure>
                            <PlayingCard card={EXAMPLE_LEAD} isInTrick />
                            <figcaption>Led</figcaption>
                        </figure>
                        <figure>
                            <PlayingCard card={EXAMPLE_FOLLOW} isInTrick />
                            <figcaption>Higher</figcaption>
                        </figure>
                        <figure>
                            <PlayingCard card={EXAMPLE_TRUMP} isInTrick isWinner />
                            <figcaption className="win">Trump wins!</figcaption>
                        </figure>
                    </div>
                    <p className="rules-note">Example with ♠ as Hukum.</p>
                </section>

                <section className="rules-card">
                    <h3 className="display">Scoring</h3>
                    <div className="rules-scores">
                        <div className="score-row"><span>Trump team wins 5 tricks</span><b className="pos">+5</b></div>
                        <div className="score-row"><span>Dealer team wins 4 tricks</span><b className="pos">+10</b></div>
                        <div className="score-row"><span>Vakkai succeeds</span><b className="pos">+8</b></div>
                        <div className="score-row"><span>Vakkai fails</span><b className="neg">−16</b></div>
                    </div>
                    <p className="rules-note">A hand ends as soon as a team reaches its target.</p>
                </section>

                <section className="rules-card vakkai">
                    <h3 className="display">Vakkai</h3>
                    <p>A bold call: <em>“I'll win 4 tricks in a row on my own, with no trump.”</em></p>
                    <ul>
                        <li>You are only offered Vakkai if your first 4 cards are <strong>3 of one suit and 1 of another</strong>.</li>
                        <li>There is no trump suit during Vakkai.</li>
                        <li>The declarer leads every trick; their partner sits out.</li>
                    </ul>
                </section>

                <section className="rules-card">
                    <h3 className="display">Between Hands</h3>
                    <ul>
                        <li>The team with the <strong>negative score</strong> deals next (a random player from that team).</li>
                        <li>Back at <strong>0 : 0</strong>, the team that climbed up from negative deals.</li>
                        <li>The other team chooses the Hukum next hand.</li>
                    </ul>
                </section>
            </div>
            <button type="button" className="btn btn-block rules-done" onClick={onClose}>
                <span>Got it!</span>
            </button>
        </Modal>
    );
}
