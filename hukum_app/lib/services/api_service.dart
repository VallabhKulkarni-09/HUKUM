import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

class ApiService {
  // TODO: Replace with your Cloud Run URL after deployment
  static const String _baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:8080', // Android emulator → host machine localhost
  );

  final FirebaseAuth _auth = FirebaseAuth.instance;

  Future<String> get _token async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('Not authenticated');
    return await user.getIdToken() ?? '';
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final token = await _token;
    final res = await http.post(
      Uri.parse('$_baseUrl$path'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      body: jsonEncode(body),
    );
    if (res.statusCode >= 400) throw Exception(jsonDecode(res.body)['error'] ?? 'Request failed');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<String> createRoom(String name) async {
    final res = await _post('/api/create-room', {'name': name});
    return res['code'] as String;
  }

  Future<bool> joinRoom(String code, String name) async {
    final res = await _post('/api/join-room', {'code': code, 'name': name});
    return res['success'] == true;
  }

  Future<Map<String, dynamic>> sendAction(String code, String type, [Map<String, dynamic>? data]) async {
    return _post('/api/action', {'code': code, 'type': type, 'data': data ?? {}});
  }

  Future<void> leaveRoom(String code) async {
    await _post('/api/leave-room', {'code': code});
  }

  Future<void> sendChat(String code, String message) async {
    await _post('/api/chat', {'code': code, 'message': message});
  }

  Future<void> addBots(String code) async {
    await _post('/api/add-bots', {'code': code});
  }

  Future<void> addBot(String code, int seat) async {
    await _post('/api/add-bot', {'code': code, 'seat': seat});
  }

  Future<void> botAuto(String code) async {
    await _post('/api/bot-auto', {'code': code});
  }
}
