import express from 'express';
import { getGameState, setGameState } from '../utils/dataManager.js';
import { calculateActionResult } from '../utils/gameLogic.js';
import { validateAction, validateGameState } from '../middleware/validation.js';
import { authenticatePlayer, requireRole, requireTeamAccess } from '../middleware/authentication.js';

const router = express.Router();

// Начало игры (только для ГМ)
router.post('/start', authenticatePlayer, requireRole('gm'), validateGameState('lobby'), (req, res) => {
  const gameState = getGameState();
  
  const allReady = Object.values(gameState.players).every(player => player.ready);
  if (!allReady) {
    return res.status(400).json({ error: 'Not all players are ready' });
  }

  const firstRoom = Object.values(gameState.rooms)[0];
  setGameState({
    game: {
      ...gameState.game,
      status: 'in_progress',
      currentRoom: firstRoom.id,
      turnOrder: Object.keys(gameState.teams)
    }
  });

  res.json({ 
    success: true, 
    currentRoom: firstRoom,
    gameState: getGameState() 
  });
});

// Выполнение действия
router.post('/action', 
  authenticatePlayer, 
  validateGameState('in_progress'), 
  validateAction,
  requireTeamAccess,
  (req, res) => {
    const { teamId, playerId } = req.body;
    const { actionId } = req.body;
    const gameState = getGameState();
    
    const player = gameState.players[playerId];
    const result = calculateActionResult(player.stats[req.action.stat], actionId);
    
    if (!gameState.teams[teamId].progress) {
      gameState.teams[teamId].progress = {};
    }
    
    gameState.teams[teamId].progress[actionId] = {
      result: result.type,
      description: result.description,
      playerId: playerId
    };

    if (result.type === 'failure') {
      req.action.available = false;
    }

    res.json({ 
      success: true, 
      result,
      gameState: getGameState() 
    });
  }
);

// Переход к следующему ходу
router.post('/next-turn', authenticatePlayer, requireRole('gm'), validateGameState('in_progress'), (req, res) => {
  const gameState = getGameState();
  const currentGame = gameState.game;
  
  currentGame.currentTurn = (currentGame.currentTurn + 1) % currentGame.turnOrder.length;
  
  setGameState({ game: currentGame });
  
  res.json({ 
    success: true, 
    currentTurn: currentGame.currentTurn,
    activeTeam: currentGame.turnOrder[currentGame.currentTurn]
  });
});

// Получение состояния игры
router.get('/state', authenticatePlayer, (req, res) => {
  res.json({ gameState: getGameState() });
});

export default router;