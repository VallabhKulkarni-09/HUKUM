# Hukum Card Game

A real-time multiplayer implementation of Hukum (Court Piece / Rang) - a 4-player partnership trick-taking card game.

## Overview

Hukum is a strategic card game where two teams of two players compete to reach +16 points (or force opponents to -16). The game features unique mechanics like Vakkai (high-risk solo play) and trump selection.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + TypeScript + WebSockets
- **Audio**: Howler.js
- **Animations**: GSAP

## Project Structure

```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom hooks (WebSocket)
│   │   ├── audio/       # Sound management
│   │   └── types.ts     # TypeScript types
│   └── package.json
│
├── server/          # Node.js backend
│   ├── src/
│   │   ├── game/        # Core game logic
│   │   ├── handlers/    # WebSocket handlers
│   │   ├── room/        # Room management
│   │   └── types.ts     # TypeScript types
│   └── package.json
│
├── rules.md         # Complete game rules
├── game.txt         # Production spec
└── prototype.txt    # Prototype requirements
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation & Running

**Server:**
```bash
cd server
npm install
npm run dev    # Runs on ws://localhost:3001
```

**Client:**
```bash
cd client
npm install
npm run dev    # Runs on http://localhost:5173
```

## Game Rules

### Basic Concepts

- **Players**: 4 players in 2 teams
  - Team A: Player 1 + Player 3
  - Team B: Player 2 + Player 4
- **Deck**: 32 cards (A-K-Q-J-10-9-8-7 in 4 suits)
- **Goal**: First team to reach +16 or opponent reaches -16
- **Scoring**: Zero-sum (one team gains, other loses same amount)

### Key Mechanics

1. **Vakkai** - High-risk declaration
   - Player attempts to win 4 consecutive tricks alone
   - Success: +8 points
   - Failure: -16 points

2. **Trump (Hukum)** - One suit becomes trump
   - Selected by player next to dealer
   - Trump cards beat all non-trump cards

3. **Trick-taking**
   - Must follow suit if possible
   - Highest card of led suit wins (unless trumped)
   - Winner leads next trick

4. **Win Conditions**
   - Trump team: 5 tricks → +5 points
   - Dealer team: 4 tricks → +10 points

## Features

- ✅ Real-time multiplayer (4 players)
- ✅ Room system with 6-letter codes
- ✅ Complete game state machine
- ✅ Vakkai mechanics
- ✅ Trump selection
- ✅ Follow-suit validation
- ✅ Zero-sum scoring
- ✅ Dealer rotation (negative team chooses)
- ✅ In-game chat
- ✅ Debug panel for testing
- ✅ Sound effects

## Development

This is a prototype focused on gameplay correctness and multiplayer synchronization. The server is authoritative - all game logic runs on the backend, clients only send intentions.

### Key Files

**Server:**
- `server/src/game/GameState.ts` - Main game engine
- `server/src/game/StateMachine.ts` - Phase transitions
- `server/src/handlers/MessageHandler.ts` - WebSocket routing

**Client:**
- `client/src/hooks/useWebSocket.ts` - Server communication
- `client/src/components/GameTable.tsx` - Main game UI
- `client/src/components/DebugPanel.tsx` - Developer tools

## License

MIT
