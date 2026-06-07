import express from 'express';
import cors from 'cors';
import { initializeApp, cert, applicationDefault, type ServiceAccount } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { GameEngine } from './game.js';

// Init Firebase Admin
const DATABASE_URL = process.env.DATABASE_URL || 'https://hukum-98b72-default-rtdb.asia-southeast1.firebasedatabase.app';

let firebaseApp: any;
let db: any;
let auth: any;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    firebaseApp = initializeApp({ credential: cert(sa as ServiceAccount), databaseURL: DATABASE_URL });
  } else {
    // Try file for local dev
    const fs = await import('fs');
    const path = new URL('../service-account.json', import.meta.url).pathname;
    if (fs.existsSync(path)) {
      const sa = JSON.parse(fs.readFileSync(path, 'utf-8'));
      firebaseApp = initializeApp({ credential: cert(sa as ServiceAccount), databaseURL: DATABASE_URL });
    } else {
      // Cloud Run: use Application Default Credentials
      firebaseApp = initializeApp({ credential: applicationDefault(), databaseURL: DATABASE_URL });
    }
  }
  db = getDatabase(firebaseApp);
  auth = getAuth(firebaseApp);
  console.log('✅ Firebase initialized');
} catch (e) {
  console.log('⚠️  Firebase init failed:', e);
}

// In-memory game rooms
const rooms = new Map<string, GameEngine>();

const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware
async function verifyToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // Dev mode: allow X-Dev-Uid header for local testing
  const devUid = req.headers['x-dev-uid'] as string;
  if (devUid) { (req as any).uid = devUid; return next(); }
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    if (auth) {
      const decoded = await auth.verifyIdToken(token);
      (req as any).uid = decoded.uid;
    } else {
      (req as any).uid = 'local-user';
    }
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// Helper: sync state to Firebase RTDB
async function syncState(roomCode: string, engine: GameEngine) {
  if (!db) return;
  const publicState = engine.getPublicState();
  await db.ref(`rooms/${roomCode}/state`).set(publicState);
}

// Helper: sync player hands to Firebase (each under their own path)
async function syncHands(roomCode: string, engine: GameEngine) {
  if (!db) return;
  const state = engine.getPublicState();
  const updates: Record<string, any> = {};
  for (const p of state.players) {
    updates[`rooms/${roomCode}/hands/${p.id}`] = engine.getPlayerHand(p.id);
  }
  await db.ref().update(updates);
}

// Generate 6-letter room code
import { getGeminiMove, getGeminiHukumChoice } from './gemini.js';

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * 26)]).join('');
}

// Auto-play bot turns with delays so client can see animations
async function autoBotPlay(engine: GameEngine, roomCode: string) {
  try {
  let iterations = 0;
  while (iterations < 50) {
    if (engine.getPlayerCount() < 4) break;
    const state = engine.getPublicState();
    const turn = state.currentTurnId;
    if (!turn || !turn.startsWith('bot-')) break;
    if (state.phase === 'MATCH_END') break;

    const phase = state.phase;

    if (phase === 'VAKKAI_DECISION') {
      await new Promise(resolve => setTimeout(resolve, 800));
      engine.passVakkai(turn);
    } else if (phase === 'HUKUM_SELECTION') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const hand = engine.getPlayerHand(turn);
      const suit = await getGeminiHukumChoice(hand);
      engine.chooseHukum(turn, suit);
    } else if (phase === 'TRICK_PLAY' || phase === 'VAKKAI_PLAY') {
      if (state.currentTrick.winnerId) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        engine.clearTrick();
        await syncState(roomCode, engine);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      await new Promise(resolve => setTimeout(resolve, 1200));
      const hand = engine.getPlayerHand(turn);
      const botPlayer = engine.getPublicState().players.find(p => p.id === turn);
      const geminiCard = await getGeminiMove({
        hand,
        phase,
        trumpSuit: state.trumpSuit,
        leadSuit: state.currentTrick.leadSuit,
        currentTrickCards: state.currentTrick.cards,
        trickCounts: state.trickCounts as { A: number; B: number },
        myTeam: botPlayer?.team || 'B',
        myId: turn,
      });
      let played = false;
      if (geminiCard) played = engine.playCard(turn, geminiCard).success;
      if (!played) { for (const card of hand) { if (engine.playCard(turn, card.id).success) { played = true; break; } } }
      if (!played) break;
    } else if (phase === 'HAND_END') {
      await new Promise(resolve => setTimeout(resolve, 3000));
      engine.startNextHand();
    } else break;

    // Sync after each bot action so client sees it
    await syncState(roomCode, engine);
    await syncHands(roomCode, engine);
    iterations++;
  }
  } catch (e) { console.error('Bot play error:', e); }
}

// === ROUTES ===

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Create room
app.post('/api/create-room', verifyToken, async (req, res) => {
  const uid = (req as any).uid;
  const { name } = req.body;
  const code = generateCode();
  const engine = new GameEngine();
  engine.addPlayer(uid, name || 'Player 1');
  rooms.set(code, engine);
  await syncState(code, engine);
  await syncHands(code, engine);
  res.json({ code });
});

// Join room
app.post('/api/join-room', verifyToken, async (req, res) => {
  const uid = (req as any).uid;
  const { code, name } = req.body;
  const engine = rooms.get(code?.toUpperCase());
  if (!engine) return res.status(404).json({ error: 'Room not found' });
  const player = engine.addPlayer(uid, name || 'Player');
  if (!player) return res.status(400).json({ error: 'Room full or team full' });

  // Auto-start ready check when 4 players join
  if (engine.getPlayerCount() === 4) engine.startReadyCheck();

  await syncState(code, engine);
  await syncHands(code, engine);
  res.json({ success: true, seat: player.seat, team: player.team });
});

// Player action
app.post('/api/action', verifyToken, async (req, res) => {
  const uid = (req as any).uid;
  const { code, type, data } = req.body;
  const engine = rooms.get(code?.toUpperCase());
  if (!engine) return res.status(404).json({ error: 'Room not found' });

  let result: any = { success: true };

  switch (type) {
    case 'READY': {
      engine.setPlayerReady(uid, true);
      // Also make all bots ready
      const ps = engine.getPublicState().players;
      for (const p of ps) { if (p.id.startsWith('bot-')) engine.setPlayerReady(p.id, true); }
      if (engine.allPlayersReady()) {
        const toss = engine.performInitialToss();
        engine.dealFirstHalf();
        result = { ...result, toss };
        // Auto-play bots (vakkai/hukum decisions) in background
        autoBotPlay(engine, code);
      }
      break;
    }
    case 'VAKKAI_DECISION': {
      if (data?.declare) {
        result.success = engine.declareVakkai(uid);
      } else {
        result.success = engine.passVakkai(uid);
      }
      // Auto-play bots if it's now a bot's turn
      autoBotPlay(engine, code);
      break;
    }
    case 'SELECT_TRUMP': {
      result.success = engine.chooseHukum(uid, data?.suit);
      // Auto-play bots after trump selected (trick play starts)
      autoBotPlay(engine, code);
      break;
    }
    case 'PLAY_CARD': {
      // If previous trick is complete (winnerId set), clear it first and sync
      const prevState = engine.getPublicState();
      if (prevState.currentTrick.winnerId) {
        engine.clearTrick();
        await syncState(code, engine);
      }

      const cardResult = engine.playCard(uid, data?.id || `${data?.suit}_${data?.rank}`);
      result = { ...result, ...cardResult };

      // Auto-play bots
      autoBotPlay(engine, code);
      break;
    }
    case 'NEXT_HAND': {
      result.success = engine.startNextHand();
      autoBotPlay(engine, code);
      break;
    }
    case 'RESET_MATCH': {
      engine.resetMatch();
      break;
    }
    default:
      return res.status(400).json({ error: `Unknown action: ${type}` });
  }

  await syncState(code, engine);
  await syncHands(code, engine);
  res.json(result);
});

// Leave room
app.post('/api/leave-room', verifyToken, async (req, res) => {
  const uid = (req as any).uid;
  const { code } = req.body;
  const engine = rooms.get(code?.toUpperCase());
  if (engine) {
    engine.removePlayer(uid);
    if (db) await db.ref(`rooms/${code}/hands/${uid}`).remove();
    await syncState(code, engine);
    if (engine.getPlayerCount() === 0) rooms.delete(code);
  }
  res.json({ success: true });
});

// === CHAT ===
const chatHistory = new Map<string, Array<{ sender: string; message: string; timestamp: number }>>();

app.post('/api/chat', verifyToken, async (req, res) => {
  const uid = (req as any).uid;
  const { code, message } = req.body;
  const engine = rooms.get(code?.toUpperCase());
  if (!engine) return res.status(404).json({ error: 'Room not found' });

  const player = engine.getPublicState().players.find(p => p.id === uid);
  const senderName = player?.name || 'Unknown';

  const chatMsg = { sender: senderName, message, timestamp: Date.now() };
  if (!chatHistory.has(code)) chatHistory.set(code, []);
  chatHistory.get(code)!.push(chatMsg);

  // Sync to Firebase
  if (db) await db.ref(`rooms/${code}/chat`).push(chatMsg);

  // Each AI bot independently decides whether to reply (only for human messages)
  if (!uid.startsWith('bot-')) {
    const gameEngine = rooms.get(code?.toUpperCase())!;
    const botPlayers = gameEngine.getPublicState().players.filter(p => p.id.startsWith('bot-'));
    const shuffled = botPlayers.sort(() => Math.random() - 0.5);
    const responders = shuffled.slice(0, Math.random() < 0.4 ? 2 : 1);
    // Await so Cloud Run doesn't kill the process
    await Promise.all(responders.map(bot => aiBotChatDecision(code, bot.id, bot.name, bot.team, gameEngine)));
  }

  res.json({ success: true });
});

const AI_PERSONAS: Record<string, string> = {
  'AI Alpha': 'You are Alpha — a desi guy who plays cards at chai tapri. You speak casual Hinglish (mix of Hindi and English). Example: "Bhai tu toh gaya", "Kya cards aaye hai mast", "Tera koi chance nahi".',
  'AI Beta': 'You are Beta — the quiet smart one in friend group. You speak casual Hinglish. Short and witty. Example: "Hmm interesting", "Dekh lenge", "Ye toh easy hai".',
  'AI Gamma': 'You are Gamma — the hype man of the group. Gets excited easily. Speaks casual Hinglish. Example: "BHAI KHAAA GAYE!", "Maza aa gaya!", "LET\'S GOOO".',
  'AI Delta': 'You are Delta — the trash talker friend. Roasts everyone lovingly. Casual Hinglish. Example: "Bhai tujhe cards khelna aata hai?", "Ye kya chutiyapa tha", "Aukaat dikhadi".',
};

async function aiBotChatDecision(code: string, botId: string, botName: string, team: string, engine: GameEngine) {
  try {
    const history = chatHistory.get(code) || [];
    const recentChat = history.slice(-8).map(m => `${m.sender}: ${m.message}`).join('\n');
    const hand = engine.getPlayerHand(botId);
    const state = engine.getPublicState();
    const handStr = hand.map(c => c.id).join(', ');

    const persona = AI_PERSONAS[botName] || AI_PERSONAS['AI Alpha'];
    const gameContext = `Your cards: [${handStr}]. Trump: ${state.trumpSuit || 'none'}. Score A:${state.score.A} B:${state.score.B}. Your team: ${team}. Phase: ${state.phase}.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCjmewiB7QxhJ3dHwgQk0g2alCVjNQ8Y18';

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${persona}\n\nGame context: ${gameContext}\n\nRULES:\n- Reply like you're texting in a friend group chat\n- Use Hinglish (Hindi+English mix), slang, abbreviations\n- Keep it 3-8 words MAX. No full formal sentences.\n- Match the vibe: funny, roast, hype, or chill\n- Say SKIP if the message doesn't need a reply from you\n- Don't reveal your cards\n\nChat:\n${recentChat}\n\n${botName}:` }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 200, thinkingConfig: { thinkingBudget: 0 } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await r.json() as any;
    console.log(`[Chat] ${botName} raw response:`, JSON.stringify(data?.candidates?.[0]?.content));
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (reply && !reply.toUpperCase().includes('SKIP') && reply.length > 2 && reply.length < 120) {
      // Clean up: remove leading quotes, asterisks, bot name prefix
      let clean = reply.replace(/^["*]+|["*]+$/g, '').replace(new RegExp(`^${botName}:\\s*`, 'i'), '').trim();
      if (clean.length < 2) return;
      // Random delay to feel natural (0.5-3s)
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 2500));
      const aiMsg = { sender: botName, message: clean, timestamp: Date.now() };
      chatHistory.get(code)!.push(aiMsg);
      if (db) {
        await db.ref(`rooms/${code}/chat`).push(aiMsg);
        console.log(`[Chat] ${botName} sent: "${clean}"`);
      } else {
        console.log(`[Chat] ${botName} would say: "${clean}" (no db)`);
      }
    }
  } catch (e) { /* silently skip */ }
}

// === BOT / AI MANAGEMENT ===

// Add AI to a specific seat
app.post('/api/add-bot', verifyToken, async (req, res) => {
  const { code, seat } = req.body;
  const engine = rooms.get(code?.toUpperCase());
  if (!engine) return res.status(404).json({ error: 'Room not found' });

  const seatNum = typeof seat === 'number' ? seat : parseInt(seat);
  if (isNaN(seatNum) || seatNum < 0 || seatNum > 3) return res.status(400).json({ error: 'Invalid seat (0-3)' });

  const botNames = ['AI Alpha', 'AI Beta', 'AI Gamma', 'AI Delta'];
  const id = `bot-seat-${seatNum}`;
  const team = seatNum % 2 === 0 ? 'A' : 'B';
  const player = engine.addPlayer(id, botNames[seatNum], team);
  if (!player) return res.status(400).json({ error: 'Seat taken or team full' });

  if (engine.getPlayerCount() === 4) engine.startReadyCheck();
  await syncState(code, engine);
  await syncHands(code, engine);
  res.json({ success: true, bot: id, seat: seatNum });
});

// Fill all empty seats with AI
app.post('/api/add-bots', verifyToken, async (req, res) => {
  const { code } = req.body;
  const engine = rooms.get(code?.toUpperCase());
  if (!engine) return res.status(404).json({ error: 'Room not found' });

  const botNames = ['AI Alpha', 'AI Beta', 'AI Gamma', 'AI Delta'];
  const botIds: string[] = [];
  for (let seat = 0; seat < 4; seat++) {
    const id = `bot-seat-${seat}`;
    const team = seat % 2 === 0 ? 'A' : 'B';
    const player = engine.addPlayer(id, botNames[seat], team);
    if (player) botIds.push(id);
  }

  if (engine.getPlayerCount() === 4) engine.startReadyCheck();
  await syncState(code, engine);
  await syncHands(code, engine);
  res.json({ success: true, bots: botIds });
});

// Bot auto-play: makes all bots do their pending action
app.post('/api/bot-play', verifyToken, async (req, res) => {
  const { code } = req.body;
  const engine = rooms.get(code?.toUpperCase());
  if (!engine) return res.status(404).json({ error: 'Room not found' });

  const state = engine.getPublicState();
  const currentTurn = state.currentTurnId;
  if (!currentTurn || !currentTurn.startsWith('bot-')) {
    return res.json({ success: true, message: 'Not a bot turn' });
  }

  let acted = false;
  const phase = state.phase;

  if (phase === 'READY_CHECK') {
    // Make all bots ready
    for (const p of state.players) {
      if (p.id.startsWith('bot-')) engine.setPlayerReady(p.id, true);
    }
    if (engine.allPlayersReady()) {
      engine.performInitialToss();
      engine.dealFirstHalf();
    }
    acted = true;
  } else if (phase === 'VAKKAI_DECISION' && currentTurn.startsWith('bot-')) {
    engine.passVakkai(currentTurn);
    acted = true;
  } else if (phase === 'HUKUM_SELECTION' && currentTurn.startsWith('bot-')) {
    // Pick first suit available in hand
    const hand = engine.getPlayerHand(currentTurn);
    engine.chooseHukum(currentTurn, hand[0]?.suit || 'SPADE');
    acted = true;
  } else if ((phase === 'TRICK_PLAY' || phase === 'VAKKAI_PLAY') && currentTurn.startsWith('bot-')) {
    // Play first valid card
    const hand = engine.getPlayerHand(currentTurn);
    if (hand.length > 0) {
      // Try each card until one works (follow suit)
      for (const card of hand) {
        const result = engine.playCard(currentTurn, card.id);
        if (result.success) { acted = true; break; }
      }
    }
  } else if (phase === 'HAND_END') {
    engine.startNextHand();
    acted = true;
  }

  await syncState(code, engine);
  await syncHands(code, engine);
  res.json({ success: true, acted, phase: engine.getPublicState().phase, currentTurn: engine.getPublicState().currentTurnId });
});

// Auto-play loop: keep playing bot turns until it's a human's turn
app.post('/api/bot-auto', verifyToken, async (req, res) => {
  const { code } = req.body;
  const engine = rooms.get(code?.toUpperCase());
  if (!engine) return res.status(404).json({ error: 'Room not found' });

  let iterations = 0;
  while (iterations < 50) {
    const state = engine.getPublicState();
    const turn = state.currentTurnId;
    if (!turn || !turn.startsWith('bot-')) break;
    if (state.phase === 'MATCH_END') break;

    const phase = state.phase;
    if (phase === 'VAKKAI_DECISION') { engine.passVakkai(turn); }
    else if (phase === 'HUKUM_SELECTION') {
      const hand = engine.getPlayerHand(turn);
      engine.chooseHukum(turn, hand[0]?.suit || 'SPADE');
    } else if (phase === 'TRICK_PLAY' || phase === 'VAKKAI_PLAY') {
      const hand = engine.getPlayerHand(turn);
      for (const card of hand) { if (engine.playCard(turn, card.id).success) break; }
    } else if (phase === 'HAND_END') { engine.startNextHand(); }
    else break;
    iterations++;
  }

  await syncState(code, engine);
  await syncHands(code, engine);
  const finalState = engine.getPublicState();
  res.json({ success: true, iterations, phase: finalState.phase, currentTurn: finalState.currentTurnId });
});

const PORT = parseInt(process.env.PORT || '8080');
app.listen(PORT, () => console.log(`Hukum server running on port ${PORT}`));
