import type { Card, Suit, GamePhase, PlayerId } from './types.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-3.5-flash';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are an expert Hukum (Court Piece/Rang) card game AI player.

RULES:
- 32-card deck: A,K,Q,J,10,9,8,7 in 4 suits (SPADE,HEART,DIAMOND,CLUB)
- Card strength: A>K>Q>J>10>9>8>7
- Must follow lead suit if you have it
- Trump suit beats all non-trump cards
- Highest card of lead suit wins (unless trumped)
- Trump team needs 5 tricks to win (+5 pts), Dealer team needs 4 tricks (+10 pts)

STRATEGY:
- Play high cards when leading to win tricks
- If following suit, play highest to win or lowest to dump
- Trump only when void in lead suit and trick is valuable
- Save trump cards for critical moments

RESPOND WITH ONLY THE CARD ID (e.g. SPADE_A). Nothing else.`;

interface GameContext {
  hand: Card[];
  phase: GamePhase;
  trumpSuit: Suit | null;
  leadSuit: Suit | null;
  currentTrickCards: Array<{ playerId: string; card: Card }>;
  trickCounts: { A: number; B: number };
  myTeam: string;
  myId: string;
}

export async function getGeminiMove(context: GameContext): Promise<string | null> {
  const { hand, trumpSuit, leadSuit, currentTrickCards, trickCounts, myTeam } = context;

  const handStr = hand.map(c => c.id).join(', ');
  const trickStr = currentTrickCards.map(tc => `${tc.playerId}: ${tc.card.id}`).join(', ');

  let prompt = `Your hand: [${handStr}]\n`;
  prompt += `Trump suit: ${trumpSuit || 'NONE'}\n`;
  prompt += `Lead suit: ${leadSuit || 'NONE (you lead)'}\n`;
  prompt += `Cards on table: ${trickStr || 'empty (you lead)'}\n`;
  prompt += `Tricks won - Your team(${myTeam}): ${trickCounts[myTeam as 'A' | 'B']}, Opponent: ${trickCounts[myTeam === 'A' ? 'B' : 'A']}\n`;
  prompt += `\nWhich card do you play? Reply ONLY with the card ID.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json() as any;
    if (data?.error) { console.log(`[Gemini Move] API error:`, data.error.message); return null; }
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = parts?.find((p: any) => p.text)?.text?.trim();

    if (text && hand.some(c => c.id === text)) {
      return text;
    }

    // Fallback: parse the response for any valid card ID
    if (text) {
      for (const card of hand) {
        if (text.includes(card.id)) return card.id;
      }
      // Try matching suit_rank pattern
      const upper = text.toUpperCase().replace(/\s+/g, '_');
      for (const card of hand) {
        if (upper.includes(card.id)) return card.id;
      }
    }

    // Smart fallback: follow suit if required
    if (leadSuit) {
      const suitCards = hand.filter(c => c.suit === leadSuit);
      if (suitCards.length > 0) return suitCards[0].id;
    }

    return null;
  } catch (e) {
    console.error('Gemini API error:', e);
    return null;
  }
}

export async function getGeminiHukumChoice(hand: Card[]): Promise<Suit> {
  const handStr = hand.map(c => c.id).join(', ');
  const prompt = `You're choosing the trump suit (Hukum) for this hand. Your cards: [${handStr}]. Pick the suit you have the strongest cards in. Reply with ONLY the suit name: SPADE, HEART, DIAMOND, or CLUB.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json() as any;
    if (data?.error) { console.log(`[Gemini Hukum] API error:`, data.error.message); return null as any; }
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = parts?.find((p: any) => p.text)?.text?.trim()?.toUpperCase();

    if (['SPADE', 'HEART', 'DIAMOND', 'CLUB'].includes(text)) {
      return text as Suit;
    }
  } catch (e) {
    console.error('Gemini Hukum choice error:', e);
  }

  // Fallback: pick suit with most cards
  const counts: Record<string, number> = {};
  for (const c of hand) counts[c.suit] = (counts[c.suit] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as Suit;
}
