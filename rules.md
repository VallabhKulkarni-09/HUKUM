# Hukum  – Complete Game Rules

> **Purpose**: Authoritative reference for implementing the Hukum prototype.  
> All edge cases and clarifications are documented here.

---

## 1. Overview

| Property | Value |
|----------|-------|
| Players | 4 (fixed) |
| Teams | Team A (P1+P3) vs Team B (P2+P4) |
| Seating | Clockwise: P1 → P2 → P3 → P4 |
| Deck | 32 cards |
| Match Goal | First team to reach +16 or opponent reaches −16 |
| Scoring | Zero-sum (A gains X → B loses X) |

---

## 2. The Deck

**32 cards** = 8 ranks × 4 suits

### Ranks (High → Low)
```
A > K > Q > J > 10 > 9 > 8 > 7
```

### Suits
Spade, Heart, Diamond, Club (no inherent hierarchy except trump)

### Card Point Values (for initial dealer toss only)
| Rank | Points |
|------|--------|
| A | 8 |
| K | 7 |
| Q | 6 |
| J | 5 |
| 10 | 4 |
| 9 | 3 |
| 8 | 2 |
| 7 | 1 |

---

## 3. Match Start – Initial Dealer Selection

1. Each player draws 1 card from shuffled deck
2. Sum points per team:
   - Team A total = P1 card + P3 card
   - Team B total = P2 card + P4 card
3. **Lowest total team** → Deals first (dealer team)
4. **Highest total team** → Declares Hukum (trump team)
5. Within the dealer team, either partner can be chosen as dealer

> **Note**: This only happens at match start. Subsequent dealer selection follows Section 10.

---

## 4. Hand Structure

Each hand has these phases:

```
DEALING_FIRST → VAKKAI_DECISION → HUKUM_SELECTION → DEALING_SECOND → TRICK_PLAY → HAND_END
```

### Phase Details

| Phase | Description |
|-------|-------------|
| DEALING_FIRST | Dealer gives 4 cards to each player clockwise |
| VAKKAI_DECISION | Each player (clockwise from dealer's next) can declare Vakkai or pass |
| HUKUM_SELECTION | If no Vakkai: player next to dealer chooses trump from their 4 cards |
| DEALING_SECOND | Dealer gives remaining 4 cards (total 8 per player) |
| TRICK_PLAY | 8 tricks played (unless ended early) |
| HAND_END | Score applied, check match end condition |

---

## 5. Vakkai Rule (High-Risk Declaration)

### What is Vakkai?
A player declares: *"I will win 4 consecutive tricks alone, without trump."*

### Declaration Phase
- Starts after first 4 cards dealt
- Order: **Clockwise from dealer's next player**
- Each player gets **one chance** to declare or pass
- **Any player** (regardless of team) can declare Vakkai

### Vakkai Gameplay
- **No trump suit** exists
- **Declarer leads every trick**
- **Partner skips** all turns (inactive)
- Play order: Declarer → Opponent 1 → Opponent 2
- Must win **4 consecutive tricks**

### Vakkai Scoring
| Outcome | Points |
|---------|--------|
| Success (4 consecutive wins) | +8 to declarer's team |
| Failure (any trick lost) | −16 to declarer's team |

### Vakkai End Conditions
- **Success**: Hand ends immediately after 4th consecutive win
- **Failure**: Hand ends immediately after first lost trick
- Check if score crosses ±16 → if yes, match ends

---

## 6. Hukum (Trump) Selection

> Only happens if **no Vakkai declared**

- **Player next to dealer** selects trump suit
- Selection made using **only first 4 cards** (before second deal)
- This player is on the **Trump Team**
- The dealer is on the **Dealer Team** (opposing team)

### Team Definitions
| If Dealer is... | Dealer Team | Trump Team |
|-----------------|-------------|------------|
| P1 (Team A) | Team A | Team B (P2 chooses) |
| P2 (Team B) | Team B | Team A (P3 chooses) |
| P3 (Team A) | Team A | Team B (P4 chooses) |
| P4 (Team B) | Team B | Team A (P1 chooses) |

---

## 7. Trick Play Rules

### Turn Order (Normal Play)
- First trick: **Player next to trump chooser** leads
- Subsequent tricks: **Winner of previous trick** leads

### Turn Order (Vakkai)
- **Declarer always leads** every trick
- Order: Declarer → Opponent (next clockwise) → Opponent
- Partner is skipped

### Follow Suit Rule
1. **Must follow suit** if you have cards of led suit
2. **If void** in led suit → may play **any card** (trump optional)

### Trick Winner
- **Highest card of led suit** wins, unless trumped
- If trump played → **highest trump** wins

---

## 8. Hand Win Conditions (Normal Play)

| Team | Target | Reward |
|------|--------|--------|
| Trump Team | 5 tricks | +5 points |
| Dealer Team | 4 tricks | +10 points |

> **IMPORTANT**: Hand ends **immediately** when target reached. Do NOT play remaining cards.

---

## 9. Match Scoring

### Zero-Sum System
```
Team A += X  →  Team B -= X
```

### Match End Condition
Match ends when: `Score ≥ +16` OR `Score ≤ −16`

### Score Examples
| Hand Result | Team A | Team B |
|-------------|--------|--------|
| Start | 0 | 0 |
| Trump team (A) wins 5 tricks | +5 | −5 |
| Dealer team (B) wins 4 tricks | −10 | +10 |
| Vakkai success (A) | +8 | −8 |
| Vakkai failure (A) | −16 | +16 |

---

## 10. Dealer Rotation

After each hand:

1. Identify the team with **negative score**
2. That team **chooses which partner** becomes dealer
3. The **other team** (positive score) will declare Hukum next hand

### Edge Case: Score Returns to 0-0
If a team was negative and returns to 0:
- The team that **came from negative to 0** chooses dealer
- (There is no true tie scenario in normal gameplay)

---

## 11. Game States (Finite State Machine)

```
WAITING_FOR_PLAYERS
    ↓
READY_CHECK
    ↓
INITIAL_TOSS (first match only)
    ↓
┌─────────────────────────────────────┐
│  DEALING_FIRST                      │
│      ↓                              │
│  VAKKAI_DECISION ──→ [if Vakkai]    │
│      ↓            ↓                 │
│  HUKUM_SELECTION  VAKKAI_PLAY       │
│      ↓                ↓             │
│  DEALING_SECOND       │             │
│      ↓                │             │
│  TRICK_PLAY           │             │
│      ↓                ↓             │
│  HAND_END ←───────────┘             │
│      ↓                              │
│  [if score < ±16] → loop back       │
└─────────────────────────────────────┘
    ↓
MATCH_END
```

---

## 12. Multiplayer & Room System

### Room
- Code: 6 uppercase letters
- Max: 4 players
- Fixed seating: P1 → P2 → P3 → P4 (clockwise)

### Player Actions
| Action | When Valid |
|--------|------------|
| `join_room` | WAITING_FOR_PLAYERS |
| `ready` | READY_CHECK |
| `pass_vakkai` | VAKKAI_DECISION, your turn |
| `declare_vakkai` | VAKKAI_DECISION, your turn |
| `choose_hukum` | HUKUM_SELECTION, you are trump chooser |
| `play_card` | TRICK_PLAY, your turn, valid card |
| `send_message` | Anytime (visible to all players) |

### Server Authority
- Server validates **all actions**
- Server stores **all state**
- Clients only send **intentions**
- Invalid actions are rejected

---

## 13. Chat/Messaging

- Any player can send messages at any time
- Messages are broadcast to **all players** in the room
- Used for team coordination (especially before Vakkai)

---

## 14. Prototype Requirements

### Must Have
- [ ] Correct turn order enforcement
- [ ] Follow-suit validation
- [ ] Vakkai logic (4 consecutive tricks)
- [ ] Zero-sum scoring
- [ ] Immediate hand end on target reached
- [ ] Dealer selection by negative team
- [ ] Debug panel showing all game state

### Debug Panel Must Show
- All player hands (for testing)
- Current turn
- Current trump suit
- Trick count per team
- Score
- Active game phase

---

## 15. Test Scenarios

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | Vakkai success | +8 to declarer team |
| 2 | Vakkai failure | −16 to declarer team, match ends only if ±16 crossed |
| 3 | Trump team wins 5 tricks | +5, hand ends immediately |
| 4 | Dealer team wins 4 tricks | +10, hand ends immediately |
| 5 | Negative team chooses dealer | Correct partner can be selected |
| 6 | Play out of turn | Action rejected |
| 7 | Fail to follow suit | Action rejected |
| 8 | Void in suit, play any card | Allowed |

---

## 16. Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│  HUKUM QUICK REFERENCE                              │
├─────────────────────────────────────────────────────┤
│  Teams: (P1+P3) vs (P2+P4)                          │
│  Deck: 32 cards (A K Q J 10 9 8 7 × 4 suits)       │
│  Win: +16 or opponent −16                           │
├─────────────────────────────────────────────────────┤
│  NORMAL HAND:                                       │
│  • Trump team: 5 tricks → +5                        │
│  • Dealer team: 4 tricks → +10                      │
├─────────────────────────────────────────────────────┤
│  VAKKAI:                                            │
│  • Win 4 in a row alone → +8                        │
│  • Lose any trick → −16                             │
├─────────────────────────────────────────────────────┤
│  AFTER HAND:                                        │
│  • Negative team picks dealer                       │
│  • Opposite team gets trump choice                  │
└─────────────────────────────────────────────────────┘
```
