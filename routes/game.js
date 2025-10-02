const express = require('express');
const router = express.Router();
const { getGameState, setGameState } = require('../utils/dataManager');
const { calculateActionResult } = require('../utils/gameLogic');

// Начало игры (только для ГМ)
router.post('/start', (req, res) => {
  const gameState = getGameState();
  
  // Проверка, что все игроки готовы
  const allReady = Object.values(gameState.players).every(player => player.ready);
  if (!allReady) {
    return res.status(400).json({ error: 'Not all players are ready' });
  }

  // Установка первой комнаты
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
router.post('/action', (req, res) => {
  const { teamId, actionId, playerId } = req.body;
  const gameState = getGameState();
  
  const room = gameState.rooms[gameState.game.currentRoom];
  const action = room.actions.find(a => a.id === actionId);
  const player = gameState.players[playerId];
  
  if (!action || !player) {
    return res.status(404).json({ error: 'Action or player not found' });
  }

  // Расчет результата действия
  const result = calculateActionResult(player.stats[action.stat], actionId);
  
  // Обновление прогресса команды
  if (!gameState.teams[teamId].progress) {
    gameState.teams[teamId].progress = {};
  }
  
  gameState.teams[teamId].progress[actionId] = {
    result: result.type,
    description: result.description,
    playerId: playerId
  };

  // Блокировка действия при провале
  if (result.type === 'failure') {
    action.available = false;
  }

  res.json({ 
    success: true, 
    result,
    gameState: getGameState() 
  });
});

// Переход к следующему ходу
router.post('/next-turn', (req, res) => {
  const gameState = getGameState();
  const currentGame = gameState.game;
  
  // Логика перехода хода между командами или комнатами
  // (упрощенная реализация)
  currentGame.currentTurn = (currentGame.currentTurn + 1) % currentGame.turnOrder.length;
  
  setGameState({ game: currentGame });
  
  res.json({ 
    success: true, 
    currentTurn: currentGame.currentTurn,
    activeTeam: currentGame.turnOrder[currentGame.currentTurn]
  });
});

module.exports = router;