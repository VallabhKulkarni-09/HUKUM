// ============================================
// HUKUM GAME - MAIN APP COMPONENT
// ============================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/GameTable';
import { ChatBox } from './components/ChatBox';
import { RulesPanel } from './components/RulesPanel';
import { SettingsModal } from './components/shared/SettingsModal';
import { Modal } from './components/ui/Modal';
import { AlertIcon, WifiOffIcon } from './components/ui/Icons';
import { playSound, soundManager } from './audio/soundManager';
import { setHapticsEnabled } from './audio/haptics';
import { loadAudioPrefs, loadName, saveAudioPrefs, saveName, type AudioPrefs } from './prefs';
import './App.css';

// Apply saved audio settings before anything plays, and start decoding sounds
const initialAudio = loadAudioPrefs();
soundManager.configure(initialAudio);
setHapticsEnabled(initialAudio.vibration);
soundManager.init();

/** Button press feedback for every button except cards (cards have their own sounds) */
function useTapSounds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('button');
      if (!el || el.disabled || el.classList.contains('pcard')) return;
      playSound(el.getAttribute('role') === 'switch' ? 'toggle' : 'buttonClick');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}

function App() {
  const {
    isConnected,
    connectionLost,
    error,
    errorSeq,
    roomCode,
    playerId,
    gameState,
    myCards,
    chatMessages,
    lastHandResult,
    createRoom,
    joinRoom,
    toggleSwitchRequest,
    addBot,
    removeBot,
    setReady,
    passVakkai,
    declareVakkai,
    chooseHukum,
    playCard,
    sendMessage,
    newGame,
    goHome,
  } = useWebSocket();

  const [playerName, setPlayerName] = useState(loadName);
  const [audio, setAudio] = useState<AudioPrefs>(initialAudio);
  const [chatOpen, setChatOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [seenMessages, setSeenMessages] = useState(0);

  // Unread = messages that arrived while the chat popup was closed
  const unreadCount = chatOpen ? 0 : Math.max(0, chatMessages.length - seenMessages);

  const changeName = (name: string) => {
    setPlayerName(name);
    saveName(name);
  };

  const changeAudio = (patch: Partial<AudioPrefs>) => {
    const next = { ...audio, ...patch };
    setAudio(next);
    saveAudioPrefs(next);
    soundManager.configure(next);
    setHapticsEnabled(next.vibration);
    // Let the player hear the new effects level
    if (patch.sfxVolume !== undefined) playSound('cardPlay');
  };

  useTapSounds();

  const openChat = () => setChatOpen(true);
  const closeChat = useCallback(() => {
    setChatOpen(false);
    setSeenMessages(chatMessages.length);
  }, [chatMessages.length]);
  const openRules = () => {
    setSettingsOpen(false);
    setRulesOpen(true);
  };
  const closeRules = useCallback(() => setRulesOpen(false), []);
  const openSettings = () => setSettingsOpen(true);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const inRoom = Boolean(roomCode && gameState && playerId);
  // Home and waiting room have their own How to Play button; the table only has the gear.
  const atTable = inRoom && gameState!.phase !== 'WAITING_FOR_PLAYERS' && gameState!.phase !== 'READY_CHECK';

  // Background music: one track for menus and the waiting room, another at the table
  useEffect(() => {
    soundManager.setMusic(atTable ? 'table' : 'lobby');
  }, [atTable]);

  // Chat ping for other people's messages only
  const chatCount = useRef(chatMessages.length);
  useEffect(() => {
    const fresh = chatMessages.slice(chatCount.current);
    chatCount.current = chatMessages.length;
    if (fresh.some(m => m.playerId !== playerId)) playSound('chat');
  }, [chatMessages, playerId]);

  // Error toast sound
  useEffect(() => {
    if (errorSeq > 0) playSound('error');
  }, [errorSeq]);

  return (
    <>
      {inRoom ? (
        <GameTable
          gameState={gameState!}
          myCards={myCards}
          playerId={playerId!}
          roomCode={roomCode!}
          lastHandResult={lastHandResult}
          unreadCount={unreadCount}
          onPassVakkai={passVakkai}
          onDeclareVakkai={declareVakkai}
          onChooseHukum={chooseHukum}
          onPlayCard={playCard}
          onReady={setReady}
          onToggleSwitchRequest={toggleSwitchRequest}
          onAddBot={addBot}
          onRemoveBot={removeBot}
          onNewGame={newGame}
          onGoHome={goHome}
          onOpenChat={openChat}
          onOpenRules={openRules}
          onOpenSettings={openSettings}
        />
      ) : (
        <Lobby
          playerName={playerName}
          onChangeName={changeName}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onOpenRules={openRules}
          onOpenSettings={openSettings}
          isConnected={isConnected}
          errorSeq={errorSeq}
        />
      )}

      {inRoom && chatOpen && (
        <ChatBox
          messages={chatMessages}
          onSendMessage={sendMessage}
          myPlayerId={playerId}
          onClose={closeChat}
        />
      )}

      {settingsOpen && (
        <SettingsModal audio={audio} onChangeAudio={changeAudio} onOpenRules={atTable ? openRules : undefined} onClose={closeSettings} />
      )}

      {rulesOpen && <RulesPanel onClose={closeRules} />}

      {connectionLost && (
        <Modal title="Connection Lost" ribbon="red">
          <div className="notice">
            <WifiOffIcon width={72} height={72} />
            <p className="display">We lost the connection to the game server.</p>
            <p>Check your internet, then reload to reconnect. If you were in a game, join the same room code again to take back your seat.</p>
            <button type="button" className="btn btn-lg btn-block" onClick={() => window.location.reload()}>
              <span>Reload</span>
            </button>
          </div>
        </Modal>
      )}

      {error && (
        <div className="toast" role="alert" key={errorSeq}>
          <AlertIcon />
          <span>{error}</span>
        </div>
      )}
    </>
  );
}

export default App;
