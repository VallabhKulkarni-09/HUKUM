import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/game_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _nameController = TextEditingController();
  final _codeController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();

    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Background image
          Image.asset('assets/images/bg.png', fit: BoxFit.cover),
          // Content
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Column(
                children: [
                  const SizedBox(height: 80),
                  // Logo + Title
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 56, height: 56,
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 8)]),
                        child: const Center(child: Text('🃏', style: TextStyle(fontSize: 32))),
                      ),
                      const SizedBox(width: 14),
                      const Text('HUKUM', style: TextStyle(fontSize: 44, fontWeight: FontWeight.bold, color: Color(0xFFD4A843), letterSpacing: 2, shadows: [Shadow(color: Color(0x80000000), blurRadius: 6, offset: Offset(0, 2))])),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Divider with spade
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(width: 60, height: 1, color: const Color(0xFFD4A843).withValues(alpha: 0.5)),
                      const Padding(padding: EdgeInsets.symmetric(horizontal: 10), child: Text('♠', style: TextStyle(color: Color(0xFFD4A843), fontSize: 16))),
                      Container(width: 60, height: 1, color: const Color(0xFFD4A843).withValues(alpha: 0.5)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text('Court Piece / Rang', style: TextStyle(fontSize: 16, color: Color(0xFFCCCCCC), letterSpacing: 1)),
                  const SizedBox(height: 40),
                  // Name field
                  _buildField(_nameController, 'Your Name', Icons.person_outline),
                  const SizedBox(height: 16),
                  // Room code field
                  _buildField(_codeController, 'Room Code (to join)', Icons.vpn_key_outlined),
                  const SizedBox(height: 28),
                  // Error
                  if (provider.error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(provider.error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                    ),
                  // Buttons
                  Row(
                    children: [
                      Expanded(child: _CreateRoomButton(onTap: provider.isLoading ? null : () => _createRoom(provider))),
                      const SizedBox(width: 14),
                      Expanded(child: _JoinRoomButton(onTap: provider.isLoading ? null : () => _joinRoom(provider))),
                    ],
                  ),
                  if (provider.isLoading) const Padding(padding: EdgeInsets.only(top: 20), child: CircularProgressIndicator(color: Color(0xFFD4A843))),
                  const SizedBox(height: 36),
                  // Feature badges
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _FeatureBadge(icon: Icons.verified_user_outlined, title: 'FAIR PLAY', subtitle: '100% Secure'),
                      _FeatureBadge(icon: Icons.groups_outlined, title: 'PLAY ANYWHERE', subtitle: 'Anytime'),
                      _FeatureBadge(icon: Icons.bolt_outlined, title: 'FAST & SMOOTH', subtitle: 'Low Latency'),
                      _FeatureBadge(icon: Icons.emoji_events_outlined, title: 'LEADERBOARD', subtitle: 'Be the Champ'),
                    ],
                  ),
                  const SizedBox(height: 40),
                  // Bottom badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(20)),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.shield_outlined, color: Color(0xFF4CAF50), size: 16),
                        SizedBox(width: 6),
                        Text('Secure • Private • No Ads', style: TextStyle(color: Color(0xFFAAAAAA), fontSize: 12)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField(TextEditingController ctrl, String hint, IconData icon) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF4CAF50).withValues(alpha: 0.5)),
        color: const Color(0xFF0D3B0F).withValues(alpha: 0.6),
      ),
      child: TextField(
        controller: ctrl,
        style: const TextStyle(color: Colors.white, fontSize: 16),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 15),
          prefixIcon: Icon(icon, color: const Color(0xFFD4A843), size: 22),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }

  void _createRoom(GameProvider provider) {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    provider.createRoom(name);
  }

  void _joinRoom(GameProvider provider) {
    final name = _nameController.text.trim();
    final code = _codeController.text.trim();
    if (name.isEmpty || code.isEmpty) return;
    provider.joinRoom(code, name);
  }

  @override
  void dispose() { _nameController.dispose(); _codeController.dispose(); super.dispose(); }
}

class _CreateRoomButton extends StatelessWidget {
  final VoidCallback? onTap;
  const _CreateRoomButton({this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFFD4A843), Color(0xFFF0C860), Color(0xFFD4A843)]),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: const Color(0xFFD4A843).withValues(alpha: 0.4), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.add_circle_outline, color: Color(0xFF1A3A1A), size: 20),
            SizedBox(width: 8),
            Text('Create Room', style: TextStyle(color: Color(0xFF1A3A1A), fontWeight: FontWeight.bold, fontSize: 15)),
          ],
        ),
      ),
    );
  }
}

class _JoinRoomButton extends StatelessWidget {
  final VoidCallback? onTap;
  const _JoinRoomButton({this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF4CAF50), width: 1.5),
          color: const Color(0xFF0D3B0F).withValues(alpha: 0.4),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.group_add_outlined, color: Color(0xFFD4A843), size: 20),
            SizedBox(width: 8),
            Text('Join Room', style: TextStyle(color: Color(0xFF4CAF50), fontWeight: FontWeight.bold, fontSize: 15)),
          ],
        ),
      ),
    );
  }
}

class _FeatureBadge extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _FeatureBadge({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xFFD4A843).withValues(alpha: 0.5))),
          child: Icon(icon, color: const Color(0xFFD4A843), size: 20),
        ),
        const SizedBox(height: 6),
        Text(title, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        const SizedBox(height: 2),
        Text(subtitle, style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 8)),
      ],
    );
  }
}
