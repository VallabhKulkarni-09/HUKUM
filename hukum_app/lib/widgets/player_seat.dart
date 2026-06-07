import 'package:flutter/material.dart';
import '../models/game_models.dart';
import 'card_widget.dart';

class PlayerSeat extends StatelessWidget {
  final PlayerInfo? player;
  final bool isCurrentTurn;
  final bool isDealer;

  const PlayerSeat({super.key, this.player, this.isCurrentTurn = false, this.isDealer = false});

  @override
  Widget build(BuildContext context) {
    if (player == null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(10)),
        child: const Text('Waiting...', style: TextStyle(color: Colors.white38, fontSize: 11)),
      );
    }

    final isTeamA = player!.team == 'A';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isCurrentTurn ? const Color(0xFF4CAF50) : Colors.white.withValues(alpha: 0.1),
          width: isCurrentTurn ? 1.5 : 1,
        ),
        boxShadow: isCurrentTurn ? [BoxShadow(color: const Color(0xFF4CAF50).withValues(alpha: 0.3), blurRadius: 8)] : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 18, height: 18,
                decoration: BoxDecoration(color: isTeamA ? const Color(0xFF4A9EFF) : const Color(0xFFFF6B6B), borderRadius: BorderRadius.circular(4)),
                child: Center(child: Text(player!.team, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold))),
              ),
              const SizedBox(width: 5),
              Text(player!.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 11)),
              if (isCurrentTurn) ...[const SizedBox(width: 4), Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF4CAF50)))],
              if (isDealer) const Padding(padding: EdgeInsets.only(left: 3), child: Text('🎴', style: TextStyle(fontSize: 9))),
            ],
          ),
          const SizedBox(height: 3),
          // Mini card backs row
          SizedBox(
            height: 22,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: List.generate(
                player!.cardCount.clamp(0, 8),
                (i) => Padding(padding: EdgeInsets.only(left: i > 0 ? 0 : 0), child: Transform.translate(offset: Offset(i > 0 ? i * -6.0 : 0, 0), child: const CardBack(width: 16, height: 22))),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
