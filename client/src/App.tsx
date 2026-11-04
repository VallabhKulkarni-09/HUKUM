// ============================================
// HUKUM GAME - MAIN APP COMPONENT
// ============================================

import { useCallback, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/GameTable';
import { ChatBox } from './components/ChatBox';
import { RulesPanel } from './components/RulesPanel';
import { SettingsModal } from './components/shared/SettingsModal';
import { Modal } from './components/ui/Modal';
import { AlertIcon, WifiOffIcon } from './components/ui/Icons';
import { soundManager } from './audio/soundManager';
import { loadMuted, loadName, saveMuted, saveName } from './prefs';
import './App.css';

// Apply the saved sound preference before anything plays
soundManager.setMuted(loadMuted());

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
  const [muted, setMuted] = useState(loadMuted);
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

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundManager.setMuted(next);
    saveMuted(next);
  };

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
        <SettingsModal muted={muted} onToggleMute={toggleMute} onOpenRules={atTable ? openRules : undefined} onClose={closeSettings} />
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
