import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import '../models/game_models.dart';
import 'api_service.dart';
import 'sound_manager.dart';

class GameProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseDatabase _db = FirebaseDatabase.instanceFor(
    app: FirebaseAuth.instance.app,
    databaseURL: 'https://hukum-98b72-default-rtdb.asia-southeast1.firebasedatabase.app',
  );
  final _sound = SoundManager();

  GameState? _gameState;
  List<GameCard> _hand = [];
  List<Map<String, dynamic>> _chatMessages = [];
  String? _roomCode;
  bool _isLoading = false;
  String? _error;

  GameState? get gameState => _gameState;
  List<GameCard> get hand => _hand;
  List<Map<String, dynamic>> get chatMessages => _chatMessages;
  String? get roomCode => _roomCode;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get myId => _auth.currentUser?.uid ?? '';

  StreamSubscription? _stateSub;
  StreamSubscription? _handSub;
  StreamSubscription? _chatSub;

  Future<void> _ensureAuth() async {
    if (_auth.currentUser == null) await _auth.signInAnonymously();
  }

  Future<void> createRoom(String playerName) async {
    _setLoading(true);
    _error = null;
    try {
      await _ensureAuth();
      _roomCode = await _api.createRoom(playerName);
      _listenToRoom();
    } catch (e) {
      _error = e.toString();
    }
    _setLoading(false);
  }

  Future<bool> joinRoom(String code, String playerName) async {
    _setLoading(true);
    _error = null;
    try {
      await _ensureAuth();
      final success = await _api.joinRoom(code.toUpperCase(), playerName);
      if (success) {
        _roomCode = code.toUpperCase();
        _listenToRoom();
      } else {
        _error = 'Room not found or full';
      }
      _setLoading(false);
      return success;
    } catch (e) {
      _error = e.toString();
      _setLoading(false);
      return false;
    }
  }

  void _listenToRoom() {
    _stateSub = _db.ref('rooms/$_roomCode/state').onValue.listen((event) {
      final raw = event.snapshot.value;
      if (raw != null && raw is Map) {
        final data = Map<String, dynamic>.from(raw);
        final newState = GameState.fromMap(data);
        // Sound triggers
        if (_gameState != null) {
          if (newState.currentTurnId == myId && _gameState!.currentTurnId != myId) _sound.yourTurn();
          if (newState.currentTrickCards.length > _gameState!.currentTrickCards.length) _sound.playCard();
          if (newState.phase == GamePhase.handEnd && _gameState!.phase != GamePhase.handEnd) _sound.trickWin();
          if (newState.phase == GamePhase.matchEnd && _gameState!.phase != GamePhase.matchEnd) _sound.matchWin();
        }
        _gameState = newState;
        notifyListeners();
      }
    });
    _handSub = _db.ref('rooms/$_roomCode/hands/$myId').onValue.listen((event) {
      final data = event.snapshot.value;
      if (data == null) { _hand = []; notifyListeners(); return; }
      if (data is List) {
        _hand = data.whereType<Map>().map((c) => GameCard.fromMap(Map<String, dynamic>.from(c))).toList();
      } else if (data is Map) {
        _hand = data.values.whereType<Map>().map((c) => GameCard.fromMap(Map<String, dynamic>.from(c))).toList();
      } else {
        _hand = [];
      }
      notifyListeners();
    });
    _chatSub = _db.ref('rooms/$_roomCode/chat').onChildAdded.listen((event) {
      final raw = event.snapshot.value;
      if (raw is Map) {
        _chatMessages.add(Map<String, dynamic>.from(raw));
        notifyListeners();
      }
    });
  }

  // === Player Actions (via Cloud Run API) ===
  Future<void> setReady() => _sendAction('READY');
  Future<void> playCard(GameCard card) => _sendAction('PLAY_CARD', card.toMap());
  Future<void> selectTrump(Suit suit) => _sendAction('SELECT_TRUMP', {'suit': suit.name.toUpperCase()});
  Future<void> declareVakkai(bool declare) => _sendAction('VAKKAI_DECISION', {'declare': declare});
  Future<void> nextHand() => _sendAction('NEXT_HAND');
  Future<void> resetMatch() => _sendAction('RESET_MATCH');

  Future<void> sendChat(String message) async {
    if (_roomCode == null) return;
    try { await _api.sendChat(_roomCode!, message); } catch (e) { _error = e.toString(); notifyListeners(); }
  }

  Future<void> addBots() async {
    if (_roomCode == null) return;
    try { await _api.addBots(_roomCode!); } catch (e) { _error = e.toString(); notifyListeners(); }
  }

  Future<void> addBot(int seat) async {
    if (_roomCode == null) return;
    try { await _api.addBot(_roomCode!, seat); } catch (e) { _error = e.toString(); notifyListeners(); }
  }

  Future<void> botAuto() async {
    if (_roomCode == null) return;
    try { await _api.botAuto(_roomCode!); } catch (e) { _error = e.toString(); notifyListeners(); }
  }

  Future<void> _sendAction(String type, [Map<String, dynamic>? data]) async {
    if (_roomCode == null) return;
    try {
      await _api.sendAction(_roomCode!, type, data);
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> leaveRoom() async {
    _stateSub?.cancel();
    _handSub?.cancel();
    _chatSub?.cancel();
    if (_roomCode != null) await _api.leaveRoom(_roomCode!);
    _gameState = null;
    _hand = [];
    _chatMessages = [];
    _roomCode = null;
    _error = null;
    notifyListeners();
  }

  void _setLoading(bool v) { _isLoading = v; notifyListeners(); }

  @override
  void dispose() { _stateSub?.cancel(); _handSub?.cancel(); _chatSub?.cancel(); super.dispose(); }
}
