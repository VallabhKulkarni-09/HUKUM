import 'package:flutter/material.dart';
import '../models/game_models.dart';
import 'card_widget.dart';

class TrickArea extends StatelessWidget {
  final List<TrickCard> trickCards;
  final List<PlayerInfo> players;
  final String myId;

  const TrickArea({super.key, required this.trickCards, required this.players, required this.myId});

  Offset _getCardOffset(int seat, int mySeat) {
    final relative = (seat - mySeat + 4) % 4;
    return switch (relative) {
      0 => const Offset(0, 28),    // bottom (me)
      1 => const Offset(40, 0),    // right
      2 => const Offset(0, -28),   // top
      3 => const Offset(-40, 0),   // left
      _ => Offset.zero,
    };
  }

  @override
  Widget build(BuildContext context) {
    final mySeat = players.where((p) => p.id == myId).firstOrNull?.seat ?? 0;

    return SizedBox(
      width: 160, height: 140,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: trickCards.map((tc) {
          final player = players.where((p) => p.id == tc.playerId).firstOrNull;
          final offset = _getCardOffset(player?.seat ?? 0, mySeat);
          return AnimatedPositioned(
            key: ValueKey('${tc.playerId}_${tc.card.id}'),
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeOutBack,
            left: 80 + offset.dx - 24,
            top: 70 + offset.dy - 36,
            child: CardWidget(card: tc.card, isInTrick: true),
          );
        }).toList(),
      ),
    );
  }
}
