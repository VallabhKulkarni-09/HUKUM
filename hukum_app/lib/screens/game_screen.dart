import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/game_models.dart';
import '../services/game_provider.dart';
import '../widgets/trick_area.dart';
import '../widgets/player_seat.dart';
import '../widgets/trump_selector.dart';

class GameScreen extends StatelessWidget {
  const GameScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final state = provider.gameState;
    final roomCode = provider.roomCode ?? '';

    if (state == null) {
      return const Scaffold(backgroundColor: Color(0xFF0A0F0A), body: Center(child: CircularProgressIndicator(color: Color(0xFF4CAF50))));
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F0A),
      body: SafeArea(
        child: Stack(
          children: [
            // Background image
            Positioned.fill(child: Image.asset('assets/images/bg.png', fit: BoxFit.cover)),
            // Main layout
            Column(
              children: [
                // Top info bar
                _InfoBar(state: state, roomCode: roomCode, provider: provider),
                // Game area
                Expanded(
                  child: Stack(
                    children: [
                      // Top opponent
                      Positioned(top: 8, left: 0, right: 0, child: _buildSeat(state, 2, provider.myId)),
                      // Felt table (centered, between opponents)
                      Positioned.fill(
                        top: 80, bottom: 0,
                        child: Center(child: _FeltTable(state: state, provider: provider)),
                      ),
                      // Left opponent
                      Positioned(left: 8, top: 80, bottom: 80, child: Align(alignment: Alignment.centerLeft, child: _buildSeatCompact(state, 1, provider.myId))),
                      // Right opponent
                      Positioned(right: 8, top: 80, bottom: 80, child: Align(alignment: Alignment.centerRight, child: _buildSeatCompact(state, 3, provider.myId))),
                      // Overlays
                      if (state.phase == GamePhase.hukumSelection && state.currentTurnId == provider.myId)
                        TrumpSelector(onSelect: provider.selectTrump),
                      if (state.phase == GamePhase.vakkaiDecision && state.currentTurnId == provider.myId)
                        _VakkaiOverlay(provider: provider),
                      if (state.phase == GamePhase.readyCheck || state.phase == GamePhase.waitingForPlayers)
                        _ReadyOverlay(state: state, provider: provider),
                      if (state.phase == GamePhase.handEnd)
                        _HandEndOverlay(state: state, provider: provider),
                      if (state.phase == GamePhase.matchEnd)
                        _MatchEndOverlay(state: state, provider: provider),
                    ],
                  ),
                ),
                // Player hand
                _PlayerHand(hand: provider.hand, provider: provider, state: state),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSeat(GameState state, int offset, String myId) {
    final myPlayer = state.players.where((p) => p.id == myId).firstOrNull;
    final mySeat = myPlayer?.seat ?? 0;
    final targetSeat = (mySeat + offset) % 4;
    final player = state.players.where((p) => p.seat == targetSeat).firstOrNull;

    return Center(
      child: PlayerSeat(player: player, isCurrentTurn: player?.id == state.currentTurnId, isDealer: player?.id == state.dealerId),
    );
  }

  Widget _buildSeatCompact(GameState state, int offset, String myId) {
    final myPlayer = state.players.where((p) => p.id == myId).firstOrNull;
    final mySeat = myPlayer?.seat ?? 0;
    final targetSeat = (mySeat + offset) % 4;
    final player = state.players.where((p) => p.seat == targetSeat).firstOrNull;

    return PlayerSeat(player: player, isCurrentTurn: player?.id == state.currentTurnId, isDealer: player?.id == state.dealerId);
  }
}

// === INFO BAR ===
class _InfoBar extends StatelessWidget {
  final GameState state;
  final String roomCode;
  final GameProvider provider;
  const _InfoBar({required this.state, required this.roomCode, required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
      ),
      child: Row(
        children: [
          Text(roomCode, style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 11, fontWeight: FontWeight.w500)),
          if (state.trumpSuit != null) ...[
            const SizedBox(width: 8),
            _TrumpBadge(suit: state.trumpSuit!),
          ],
          const Spacer(),
          _ScorePill(team: 'A', score: state.scoreA),
          const SizedBox(width: 4),
          _ScorePill(team: 'B', score: state.scoreB),
          IconButton(icon: const Icon(Icons.smart_toy, size: 16), color: Colors.white54, onPressed: () => provider.addBots(), padding: EdgeInsets.zero, constraints: const BoxConstraints(minWidth: 28)),
          IconButton(icon: const Icon(Icons.exit_to_app, size: 16), color: Colors.white54, onPressed: () => provider.leaveRoom(), padding: EdgeInsets.zero, constraints: const BoxConstraints(minWidth: 28)),
        ],
      ),
    );
  }
}

class _TrumpBadge extends StatelessWidget {
  final Suit suit;
  const _TrumpBadge({required this.suit});
  @override
  Widget build(BuildContext context) {
    final isRed = suit == Suit.heart || suit == Suit.diamond;
    final symbol = switch (suit) { Suit.spade => '♠', Suit.heart => '♥', Suit.diamond => '♦', Suit.club => '♣' };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Trump ', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12)),
        Text(symbol, style: TextStyle(fontSize: 18, color: isRed ? const Color(0xFFFF7B7B) : const Color(0xFF6DB3F8), shadows: [Shadow(color: (isRed ? const Color(0xFFFF7B7B) : const Color(0xFF6DB3F8)).withValues(alpha: 0.5), blurRadius: 6)])),
      ],
    );
  }
}

class _ScorePill extends StatelessWidget {
  final String team;
  final int score;
  const _ScorePill({required this.team, required this.score});
  @override
  Widget build(BuildContext context) {
    final color = team == 'A' ? const Color(0xFF4A9EFF) : const Color(0xFFFF6B6B);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.3))),
      child: Text('$team: $score', style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }
}

// === FELT TABLE (center with trick cards) ===
class _FeltTable extends StatelessWidget {
  final GameState state;
  final GameProvider provider;
  const _FeltTable({required this.state, required this.provider});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 220, height: 220,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          // Green felt oval
          Container(
            width: 200, height: 200,
            decoration: BoxDecoration(
              gradient: const RadialGradient(colors: [Color(0xFF1A5C2A), Color(0xFF14472A), Color(0xFF0F3420)]),
              borderRadius: BorderRadius.circular(100),
              border: Border.all(color: const Color(0xFF3D2B1F), width: 4),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 20, spreadRadius: 3),
              ],
            ),
            child: state.currentTrickCards.isEmpty ? Center(child: _PhaseLabel(state: state)) : null,
          ),
          // Trick cards rendered ON TOP of everything
          if (state.currentTrickCards.isNotEmpty)
            TrickArea(trickCards: state.currentTrickCards, players: state.players, myId: provider.myId),
        ],
      ),
    );
  }
}

class _PhaseLabel extends StatelessWidget {
  final GameState state;
  const _PhaseLabel({required this.state});
  @override
  Widget build(BuildContext context) {
    final text = switch (state.phase) {
      GamePhase.trickPlay => 'A:${state.trickCountA}  B:${state.trickCountB}',
      GamePhase.vakkaiPlay => '⚡ ${state.vakkaiConsecutiveWins}/4',
      GamePhase.dealingFirst || GamePhase.dealingSecond => '🃏 Dealing...',
      _ => '',
    };
    if (text.isEmpty) return const SizedBox.shrink();
    return Text(text, style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 16, fontWeight: FontWeight.w600));
  }
}

// === PLAYER HAND ===
class _PlayerHand extends StatelessWidget {
  final List<GameCard> hand;
  final GameProvider provider;
  final GameState state;
  const _PlayerHand({required this.hand, required this.provider, required this.state});

  @override
  Widget build(BuildContext context) {
    final isMyTurn = state.currentTurnId == provider.myId;
    final canPlay = isMyTurn && (state.phase == GamePhase.trickPlay || state.phase == GamePhase.vakkaiPlay);

    // Determine which cards are valid to play (follow-suit rule)
    final leadSuit = state.leadSuit;
    final hasLeadSuit = leadSuit != null && hand.any((c) => c.suit == leadSuit);
    
    bool isCardPlayable(GameCard card) {
      if (!canPlay) return false;
      if (leadSuit == null) return true; // leading the trick, any card
      if (!hasLeadSuit) return true; // void in lead suit, any card
      return card.suit == leadSuit; // must follow suit
    }
    final screenWidth = MediaQuery.of(context).size.width;
    // Calculate overlap so all cards fit on screen
    final cardWidth = 58.0;
    final totalWidth = screenWidth - 24; // padding
    final overlap = hand.length > 1 ? ((hand.length * cardWidth) - totalWidth) / (hand.length - 1) : 0.0;
    final adjustedOverlap = overlap > 0 ? overlap : 0.0;

    return Container(
      padding: const EdgeInsets.only(top: 8, bottom: 12, left: 12, right: 12),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.4),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isMyTurn && canPlay)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF4A9EFF), Color(0xFF3F51B5)]),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('Your Turn', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          SizedBox(
            height: canPlay ? 100 : 90,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: hand.asMap().entries.map((e) {
                final i = e.key;
                final card = e.value;
                final left = i * (cardWidth - adjustedOverlap);
                final totalStackWidth = hand.length * cardWidth - (hand.length - 1) * adjustedOverlap;
                final startX = (totalWidth - totalStackWidth) / 2;
                return Positioned(
                  key: ValueKey(card.id),
                  left: startX + left,
                  bottom: 0,
                  child: _HandCard(card: card, canPlay: isCardPlayable(card), dimmed: canPlay && !isCardPlayable(card), onTap: isCardPlayable(card) ? () => provider.playCard(card) : null),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _HandCard extends StatelessWidget {
  final GameCard card;
  final bool canPlay;
  final bool dimmed;
  final VoidCallback? onTap;
  const _HandCard({required this.card, required this.canPlay, this.dimmed = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
        transform: Matrix4.identity()..setTranslationRaw(0, canPlay ? -12.0 : 0.0, 0),
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 250),
          opacity: dimmed ? 0.4 : (canPlay ? 1.0 : 0.6),
          child: Container(
            width: 58, height: 86,
            decoration: BoxDecoration(
              gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Colors.white, Color(0xFFF0F0F0), Color(0xFFE8E8E8)]),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: canPlay ? const Color(0xFF4A9EFF) : (dimmed ? Colors.grey.shade600 : Colors.grey.shade400), width: canPlay ? 2.5 : 1),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 6, offset: const Offset(0, 3)),
                if (canPlay) BoxShadow(color: const Color(0xFF4A9EFF).withValues(alpha: 0.5), blurRadius: 10, spreadRadius: 1),
              ],
            ),
            child: _CardFace(card: card),
          ),
        ),
      ),
    );
  }
}

class _CardFace extends StatelessWidget {
  final GameCard card;
  const _CardFace({required this.card});

  Color get _color => (card.suit == Suit.heart || card.suit == Suit.diamond) ? const Color(0xFFD32F2F) : const Color(0xFF1A1A2E);
  String get _symbol => switch (card.suit) { Suit.spade => '♠', Suit.heart => '♥', Suit.diamond => '♦', Suit.club => '♣' };

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(5),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(card.rankLabel, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: _color, height: 1)),
          Text(_symbol, style: TextStyle(fontSize: 11, color: _color, height: 1.1)),
          const Spacer(),
          Center(child: Text(_symbol, style: TextStyle(fontSize: 24, color: _color))),
          const Spacer(),
        ],
      ),
    );
  }
}

// === OVERLAYS ===
class _ReadyOverlay extends StatelessWidget {
  final GameState state;
  final GameProvider provider;
  const _ReadyOverlay({required this.state, required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.6),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(color: const Color(0xFF1A1A2E).withValues(alpha: 0.95), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withValues(alpha: 0.1))),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Players (${state.players.length}/4)', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ...state.players.map((p) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Container(width: 18, height: 18, decoration: BoxDecoration(color: p.team == 'A' ? const Color(0xFF4A9EFF) : const Color(0xFFFF6B6B), borderRadius: BorderRadius.circular(4)),
                    child: Center(child: Text(p.team, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)))),
                  const SizedBox(width: 8),
                  Text(p.name, style: const TextStyle(color: Colors.white, fontSize: 14)),
                  const SizedBox(width: 8),
                  Icon(p.isReady ? Icons.check_circle : Icons.radio_button_unchecked, color: p.isReady ? const Color(0xFF4CAF50) : Colors.white38, size: 16),
                ]),
              )),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => provider.setReady(),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4CAF50), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                child: const Text('READY', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VakkaiOverlay extends StatelessWidget {
  final GameProvider provider;
  const _VakkaiOverlay({required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.7),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(color: const Color(0xFF1A1A2E).withValues(alpha: 0.95), borderRadius: BorderRadius.circular(18), border: Border.all(color: Colors.white.withValues(alpha: 0.1))),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('⚡ VAKKAI ⚡', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFFFFD700))),
              const SizedBox(height: 8),
              Text('Win 4 tricks solo', style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 14)),
              const SizedBox(height: 4),
              Text('Success: +8  |  Failure: -16', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 12)),
              const SizedBox(height: 20),
              Row(mainAxisSize: MainAxisSize.min, children: [
                ElevatedButton(
                  onPressed: () => provider.declareVakkai(true),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE63946), padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                  child: const Text('DECLARE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 16),
                OutlinedButton(
                  onPressed: () => provider.declareVakkai(false),
                  style: OutlinedButton.styleFrom(foregroundColor: Colors.white, side: BorderSide(color: Colors.white.withValues(alpha: 0.3)), padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                  child: const Text('PASS'),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}

class _HandEndOverlay extends StatelessWidget {
  final GameState state;
  final GameProvider provider;
  const _HandEndOverlay({required this.state, required this.provider});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.6),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(color: const Color(0xFF1A1A2E).withValues(alpha: 0.95), borderRadius: BorderRadius.circular(18)),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('HAND COMPLETE', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(mainAxisSize: MainAxisSize.min, children: [
              _ScorePill(team: 'A', score: state.scoreA),
              const SizedBox(width: 12),
              _ScorePill(team: 'B', score: state.scoreB),
            ]),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => provider.nextHand(),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFFD700), foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
              child: const Text('Next Hand', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ]),
        ),
      ),
    );
  }
}

class _MatchEndOverlay extends StatelessWidget {
  final GameState state;
  final GameProvider provider;
  const _MatchEndOverlay({required this.state, required this.provider});

  @override
  Widget build(BuildContext context) {
    final winner = state.scoreA > state.scoreB ? 'Team A' : 'Team B';
    return Container(
      color: Colors.black.withValues(alpha: 0.8),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(color: const Color(0xFF1A1A2E).withValues(alpha: 0.95), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFFFD700).withValues(alpha: 0.3))),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('🏆 MATCH OVER', style: TextStyle(color: Color(0xFFFFD700), fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Text('$winner Wins!', style: const TextStyle(color: Colors.white, fontSize: 18)),
            const SizedBox(height: 12),
            Row(mainAxisSize: MainAxisSize.min, children: [
              _ScorePill(team: 'A', score: state.scoreA),
              const SizedBox(width: 12),
              _ScorePill(team: 'B', score: state.scoreB),
            ]),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => provider.resetMatch(),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4CAF50), padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
              child: const Text('Play Again', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ]),
        ),
      ),
    );
  }
}
