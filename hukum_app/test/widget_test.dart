import 'package:flutter_test/flutter_test.dart';
import 'package:hukum_app/models/game_models.dart';

void main() {
  test('GameCard creates correct id', () {
    const card = GameCard(suit: Suit.spade, rank: Rank.ace);
    expect(card.id, 'SPADE_A');
  });

  test('parsePhase handles all phases', () {
    expect(parsePhase('TRICK_PLAY'), GamePhase.trickPlay);
    expect(parsePhase('UNKNOWN'), GamePhase.waitingForPlayers);
  });
}
