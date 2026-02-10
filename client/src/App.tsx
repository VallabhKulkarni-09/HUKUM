// ============================================
// HUKUM GAME - MAIN APP COMPONENT
// ============================================

import { useWebSocket } from './hooks/useWebSocket';
import { Lobby } from './components/Lobby';
import { GameTable } from './components/GameTable';
import { DebugPanel } from './components/DebugPanel';
import { ChatBox } from './components/ChatBox';
import './App.css';

function App() {
  const {
    isConnected,
    error,
    roomCode,
    playerId,
    gameState,
    myCards,
    chatMessages,
    createRoom,
    joinRoom,
    toggleSwitchRequest,
    setReady,
    passVakkai,
    declareVakkai,
    chooseHukum,
    playCard,
    selectDealer,
    sendMessage,
    newGame,
    goHome,
  } = useWebSocket();

  // Show lobby if not in a room
  if (!roomCode || !gameState) {
    return (
      <Lobby
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        isConnected={isConnected}
        error={error}
      />
    );
  }

  // Show game table
  return (
    <>
      <GameTable
        gameState={gameState}
        myCards={myCards}
        playerId={playerId!}
        roomCode={roomCode}
        onPassVakkai={passVakkai}
        onDeclareVakkai={declareVakkai}
        onChooseHukum={chooseHukum}
        onPlayCard={playCard}
        onSelectDealer={selectDealer}
        onReady={setReady}
        onToggleSwitchRequest={toggleSwitchRequest}
        onNewGame={newGame}
        onGoHome={goHome}
      />

      <DebugPanel
        gameState={gameState}
        myCards={myCards}
        playerId={playerId}
        roomCode={roomCode}
      />

      <ChatBox
        messages={chatMessages}
        onSendMessage={sendMessage}
        myPlayerId={playerId}
      />

      {error && (
        <div className="error-toast">
          {error}
        </div>
      )}
    </>
  );
}

export default App;
