import 'package:audioplayers/audioplayers.dart';

class SoundManager {
  static final SoundManager _instance = SoundManager._();
  factory SoundManager() => _instance;
  SoundManager._();

  final _player = AudioPlayer();

  Future<void> playCard() => _play('sounds/card_play.mp3');
  Future<void> yourTurn() => _play('sounds/turn.mp3');
  Future<void> trickWin() => _play('sounds/trick_win.mp3');
  Future<void> matchWin() => _play('sounds/match_win.mp3');
  Future<void> error() => _play('sounds/error.mp3');

  Future<void> _play(String asset) async {
    try {
      await _player.stop();
      await _player.play(AssetSource(asset));
    } catch (_) {}
  }
}
