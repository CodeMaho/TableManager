import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';

function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lobby/:id" element={<LobbyPage />} />
          <Route path="/game/:id" element={<GamePage />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}

export default App;
