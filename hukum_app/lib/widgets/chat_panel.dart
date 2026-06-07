import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/game_provider.dart';

class ChatPanel extends StatefulWidget {
  const ChatPanel({super.key});
  @override
  State<ChatPanel> createState() => _ChatPanelState();
}

class _ChatPanelState extends State<ChatPanel> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GameProvider>();
    final messages = provider.chatMessages;
    final unread = messages.length;

    return Positioned(
      right: 8,
      bottom: 120,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_expanded)
            Container(
              width: 260,
              height: 280,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: Column(
                children: [
                  // Header
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withValues(alpha: 0.1)))),
                    child: Row(
                      children: [
                        const Text('Chat', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(width: 4),
                        Text('(@ai to talk to AI)', style: TextStyle(color: Colors.white.withValues(alpha: 0.4), fontSize: 10)),
                        const Spacer(),
                        GestureDetector(onTap: () => setState(() => _expanded = false), child: const Icon(Icons.close, color: Colors.white54, size: 18)),
                      ],
                    ),
                  ),
                  // Messages
                  Expanded(
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(8),
                      itemCount: messages.length,
                      itemBuilder: (_, i) {
                        final msg = messages[i];
                        final sender = msg['sender'] ?? '';
                        final isBot = sender.startsWith('AI ');
                        final color = isBot ? const Color(0xFFD4A843) : const Color(0xFF4A9EFF);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('$sender: ', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11)),
                              Expanded(child: Text(msg['message'] ?? '', style: const TextStyle(color: Colors.white70, fontSize: 11))),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                  // Input
                  Container(
                    padding: const EdgeInsets.all(6),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _controller,
                            style: const TextStyle(color: Colors.white, fontSize: 12),
                            decoration: InputDecoration(
                              hintText: 'Type message...',
                              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 12),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              filled: true,
                              fillColor: Colors.white.withValues(alpha: 0.08),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                            ),
                            onSubmitted: (_) => _send(provider),
                          ),
                        ),
                        const SizedBox(width: 4),
                        GestureDetector(
                          onTap: () => _send(provider),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: const Color(0xFF4CAF50), borderRadius: BorderRadius.circular(8)),
                            child: const Icon(Icons.send, color: Colors.white, size: 14),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 4),
          // Toggle button
          GestureDetector(
            onTap: () => setState(() {
              _expanded = !_expanded;
              if (_expanded) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (_scrollController.hasClients) _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
                });
              }
            }),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFF4CAF50), shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 6)]),
              child: Stack(
                children: [
                  const Icon(Icons.chat_bubble_outline, color: Colors.white, size: 20),
                  if (!_expanded && unread > 0)
                    Positioned(right: -2, top: -2, child: Container(
                      width: 8, height: 8,
                      decoration: const BoxDecoration(color: Color(0xFFFF6B6B), shape: BoxShape.circle),
                    )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _send(GameProvider provider) {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    provider.sendChat(text);
    _controller.clear();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
    });
  }

  @override
  void dispose() { _controller.dispose(); _scrollController.dispose(); super.dispose(); }
}
