// Card types
enum Suit { spade, heart, diamond, club }

enum Rank { ace, king, queen, jack, ten, nine, eight, seven }

const rankValues = <Rank, int>{
  Rank.ace: 8,
  Rank.king: 7,
  Rank.queen: 6,
  Rank.jack: 5,
  Rank.ten: 4,
  Rank.nine: 3,
  Rank.eight: 2,
  Rank.seven: 1,
};

class GameCard {
  final Suit suit;
  final Rank rank;
  String get id => '${suit.name.toUpperCase()}_$rankLabel';
  String get rankLabel {
    switch (rank) {
      case Rank.ace: return 'A';
      case Rank.king: return 'K';
      case Rank.queen: return 'Q';
      case Rank.jack: return 'J';
      case Rank.ten: return '10';
      case Rank.nine: return '9';
      case Rank.eight: return '8';
      case Rank.seven: return '7';
    }
  }

  const GameCard({required this.suit, required this.rank});

  factory GameCard.fromMap(Map<String, dynamic> map) {
    return GameCard(
      suit: Suit.values.firstWhere((s) => s.name == (map['suit'] as String).toLowerCase()),
      rank: _parseRank(map['rank'] as String),
    );
  }

  Map<String, dynamic> toMap() => {'suit': suit.name.toUpperCase(), 'rank': rankLabel, 'id': id};

  static Rank _parseRank(String r) {
    switch (r) {
      case 'A': return Rank.ace;
      case 'K': return Rank.king;
      case 'Q': return Rank.queen;
      case 'J': return Rank.jack;
      case '10': return Rank.ten;
      case '9': return Rank.nine;
      case '8': return Rank.eight;
      default: return Rank.seven;
    }
  }

  @override
  bool operator ==(Object other) => other is GameCard && other.id == id;
  @override
  int get hashCode => id.hashCode;
}

// Player types
typedef TeamId = String; // 'A' or 'B'

class PlayerInfo {
  final String id;
  final String name;
  final int seat; // 0-3
  final TeamId team;
  final int cardCount;
  final bool isReady;
  final bool isConnected;

  const PlayerInfo({
    required this.id,
    required this.name,
    required this.seat,
    required this.team,
    required this.cardCount,
    required this.isReady,
    required this.isConnected,
  });

  factory PlayerInfo.fromMap(Map<String, dynamic> map) => PlayerInfo(
    id: map['id'] ?? '',
    name: map['name'] ?? '',
    seat: map['seat'] ?? 0,
    team: map['team'] ?? 'A',
    cardCount: map['cardCount'] ?? 0,
    isReady: map['isReady'] ?? false,
    isConnected: map['isConnected'] ?? false,
  );
}

// Trick
class TrickCard {
  final String playerId;
  final GameCard card;
  const TrickCard({required this.playerId, required this.card});

  factory TrickCard.fromMap(Map<String, dynamic> map) => TrickCard(
    playerId: map['playerId'] ?? '',
    card: GameCard.fromMap((map['card'] as Map).cast<String, dynamic>()),
  );
}

// Game phases
enum GamePhase {
  waitingForPlayers,
  readyCheck,
  initialToss,
  dealingFirst,
  vakkaiDecision,
  hukumSelection,
  dealingSecond,
  trickPlay,
  vakkaiPlay,
  handEnd,
  dealerSelection,
  matchEnd,
}

GamePhase parsePhase(String s) {
  switch (s) {
    case 'WAITING_FOR_PLAYERS': return GamePhase.waitingForPlayers;
    case 'READY_CHECK': return GamePhase.readyCheck;
    case 'INITIAL_TOSS': return GamePhase.initialToss;
    case 'DEALING_FIRST': return GamePhase.dealingFirst;
    case 'VAKKAI_DECISION': return GamePhase.vakkaiDecision;
    case 'HUKUM_SELECTION': return GamePhase.hukumSelection;
    case 'DEALING_SECOND': return GamePhase.dealingSecond;
    case 'TRICK_PLAY': return GamePhase.trickPlay;
    case 'VAKKAI_PLAY': return GamePhase.vakkaiPlay;
    case 'HAND_END': return GamePhase.handEnd;
    case 'DEALER_SELECTION': return GamePhase.dealerSelection;
    case 'MATCH_END': return GamePhase.matchEnd;
    default: return GamePhase.waitingForPlayers;
  }
}

// Full game state received from Firebase
class GameState {
  final GamePhase phase;
  final String? dealerId;
  final String? trumpChooserId;
  final String? currentTurnId;
  final Suit? trumpSuit;
  final bool vakkaiActive;
  final String? vakkaiDeclarerId;
  final int vakkaiConsecutiveWins;
  final List<TrickCard> currentTrickCards;
  final Suit? leadSuit;
  final String? trickWinnerId;
  final int trickCountA;
  final int trickCountB;
  final int scoreA;
  final int scoreB;
  final List<PlayerInfo> players;
  final String? dealerTeam;
  final String? trumpTeam;

  const GameState({
    required this.phase,
    this.dealerId,
    this.trumpChooserId,
    this.currentTurnId,
    this.trumpSuit,
    this.vakkaiActive = false,
    this.vakkaiDeclarerId,
    this.vakkaiConsecutiveWins = 0,
    this.currentTrickCards = const [],
    this.leadSuit,
    this.trickWinnerId,
    this.trickCountA = 0,
    this.trickCountB = 0,
    this.scoreA = 0,
    this.scoreB = 0,
    this.players = const [],
    this.dealerTeam,
    this.trumpTeam,
  });

  factory GameState.fromMap(Map<String, dynamic> map) {
    final trick = map['currentTrick'] is Map ? Map<String, dynamic>.from(map['currentTrick'] as Map) : <String, dynamic>{};
    final vakkai = map['vakkai'] is Map ? Map<String, dynamic>.from(map['vakkai'] as Map) : <String, dynamic>{};
    final score = map['score'] is Map ? Map<String, dynamic>.from(map['score'] as Map) : <String, dynamic>{};
    final trickCounts = map['trickCounts'] is Map ? Map<String, dynamic>.from(map['trickCounts'] as Map) : <String, dynamic>{};

    // Players can come as List or Map from RTDB
    List<PlayerInfo> playersList = [];
    final playersRaw = map['players'];
    if (playersRaw is List) {
      playersList = playersRaw.whereType<Map>().map((p) => PlayerInfo.fromMap(Map<String, dynamic>.from(p))).toList();
    } else if (playersRaw is Map) {
      playersList = playersRaw.values.whereType<Map>().map((p) => PlayerInfo.fromMap(Map<String, dynamic>.from(p))).toList();
    }

    // Trick cards can come as List or Map
    List<TrickCard> trickCards = [];
    final cardsRaw = trick['cards'];
    if (cardsRaw is List) {
      trickCards = cardsRaw.whereType<Map>().map((c) => TrickCard.fromMap(Map<String, dynamic>.from(c))).toList();
    } else if (cardsRaw is Map) {
      trickCards = cardsRaw.values.whereType<Map>().map((c) => TrickCard.fromMap(Map<String, dynamic>.from(c))).toList();
    }

    return GameState(
      phase: parsePhase(map['phase'] ?? 'WAITING_FOR_PLAYERS'),
      dealerId: map['dealerId'],
      trumpChooserId: map['trumpChooserId'],
      currentTurnId: map['currentTurnId'],
      trumpSuit: map['trumpSuit'] != null
          ? Suit.values.firstWhere((s) => s.name == (map['trumpSuit'] as String).toLowerCase())
          : null,
      vakkaiActive: vakkai['active'] ?? false,
      vakkaiDeclarerId: vakkai['declarerId'],
      vakkaiConsecutiveWins: vakkai['consecutiveWins'] ?? 0,
      currentTrickCards: trickCards,
      leadSuit: trick['leadSuit'] != null
          ? Suit.values.firstWhere((s) => s.name == (trick['leadSuit'] as String).toLowerCase())
          : null,
      trickWinnerId: trick['winnerId'],
      trickCountA: (trickCounts['A'] as num?)?.toInt() ?? 0,
      trickCountB: (trickCounts['B'] as num?)?.toInt() ?? 0,
      scoreA: (score['A'] as num?)?.toInt() ?? 0,
      scoreB: (score['B'] as num?)?.toInt() ?? 0,
      players: playersList,
      dealerTeam: map['dealerTeam'],
      trumpTeam: map['trumpTeam'],
    );
  }
}
