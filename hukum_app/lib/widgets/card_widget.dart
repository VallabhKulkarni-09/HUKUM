import 'package:flutter/material.dart';
import '../models/game_models.dart';

class CardWidget extends StatelessWidget {
  final GameCard card;
  final bool enabled;
  final VoidCallback? onTap;
  final bool isInTrick;

  const CardWidget({super.key, required this.card, this.enabled = false, this.onTap, this.isInTrick = false});

  Color get _suitColor => (card.suit == Suit.heart || card.suit == Suit.diamond) ? const Color(0xFFD32F2F) : const Color(0xFF1A1A2E);
  String get _suitSymbol => switch (card.suit) { Suit.spade => '♠', Suit.heart => '♥', Suit.diamond => '♦', Suit.club => '♣' };

  @override
  Widget build(BuildContext context) {
    final w = isInTrick ? 48.0 : 58.0;
    final h = isInTrick ? 72.0 : 86.0;

    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: w,
        height: h,
        transform: enabled ? (Matrix4.identity()..setTranslationRaw(0.0, -10.0, 0.0)) : Matrix4.identity(),
        decoration: BoxDecoration(
          gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Colors.white, Color(0xFFF0F0F0), Color(0xFFE8E8E8)]),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: enabled ? const Color(0xFF4A9EFF) : Colors.grey.shade300, width: enabled ? 2 : 1),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 6, offset: const Offset(0, 2)),
            if (enabled) BoxShadow(color: const Color(0xFF4A9EFF).withValues(alpha: 0.4), blurRadius: 12, spreadRadius: 1),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(card.rankLabel, style: TextStyle(fontSize: isInTrick ? 12 : 14, fontWeight: FontWeight.bold, color: _suitColor, height: 1)),
              Text(_suitSymbol, style: TextStyle(fontSize: isInTrick ? 10 : 11, color: _suitColor, height: 1)),
              const Spacer(),
              Center(child: Text(_suitSymbol, style: TextStyle(fontSize: isInTrick ? 18 : 24, color: _suitColor))),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

class CardBack extends StatelessWidget {
  final double width;
  final double height;
  const CardBack({super.key, this.width = 26, this.height = 36});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width, height: height,
      decoration: BoxDecoration(
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF1A237E), Color(0xFF0D1B42)]),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.white24),
      ),
      child: const Center(child: Text('♠♥\n♦♣', textAlign: TextAlign.center, style: TextStyle(color: Colors.white24, fontSize: 8, height: 1.2))),
    );
  }
}
