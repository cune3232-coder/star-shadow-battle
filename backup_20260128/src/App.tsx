import React from 'react';
import { GameProvider, useGameContext } from './contexts/GameContext';
import { GameBoard } from './components/game/GameBoard';
import { StartScreen } from './components/screens/StartScreen';

const GameContainer = () => {
  const { state } = useGameContext();

  return (
    <div className="min-h-screen bg-black">
      {state.phase === 'LOBBY' ? (
        <StartScreen />
      ) : (
        <GameBoard />
      )}
    </div>
  );
};

function App() {
  return (
    <GameProvider>
      <GameContainer />
    </GameProvider>
  );
}

export default App;
