import 'package:flutter/material.dart';
import '../models/game_models.dart';

class TrumpSelector extends StatelessWidget {
  final Future<void> Function(Suit suit) onSelect;
  const TrumpSelector({super.key, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withValues(alpha: 0.7),
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A2E).withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 30)],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Select Trump', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 6),
              Text('Choose the Hukum suit', style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.6))),
              const SizedBox(height: 24),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _SuitBtn(suit: Suit.spade, symbol: '♠', color: const Color(0xFF6DB3F8), onTap: () => onSelect(Suit.spade)),
                  const SizedBox(width: 12),
                  _SuitBtn(suit: Suit.heart, symbol: '♥', color: const Color(0xFFFF6B6B), onTap: () => onSelect(Suit.heart)),
                  const SizedBox(width: 12),
                  _SuitBtn(suit: Suit.diamond, symbol: '♦', color: const Color(0xFFFF6B6B), onTap: () => onSelect(Suit.diamond)),
                  const SizedBox(width: 12),
                  _SuitBtn(suit: Suit.club, symbol: '♣', color: const Color(0xFF6DB3F8), onTap: () => onSelect(Suit.club)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SuitBtn extends StatelessWidget {
  final Suit suit;
  final String symbol;
  final Color color;
  final VoidCallback onTap;
  const _SuitBtn({required this.suit, required this.symbol, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 60, height: 60,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.4)),
        ),
        child: Center(child: Text(symbol, style: TextStyle(fontSize: 32, color: color))),
      ),
    );
  }
}
